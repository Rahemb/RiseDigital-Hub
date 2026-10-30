import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { hashPassword, tokenHash } from "../src/server/password";
import { verifyWorkflows } from "./http-workflows";
import { verifyLeadWorkflows } from "./http-leads";

const directory = await mkdtemp(path.join(os.tmpdir(), "rise-http-"));
const filename = path.join(directory, "http.db");
const sql = new DatabaseSync(filename);
for (const migration of (await readdir("prisma/migrations"))
  .filter((x) => x !== "migration_lock.toml")
  .sort())
  sql.exec(
    await readFile(
      path.join("prisma/migrations", migration, "migration.sql"),
      "utf8",
    ),
  );
sql.close();
const databaseUrl = `file:${filename.replaceAll("\\", "/")}`;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const password = randomBytes(24).toString("hex");
const user = await db.user.create({
  data: {
    name: "QA Owner",
    email: "qa@example.com",
    passwordHash: hashPassword(password),
    organization: { create: { name: "Isolated HTTP test" } },
  },
});
const client = await db.client.create({
  data: {
    organizationId: user.organizationId,
    companyName: "HTTP verification client",
    contactPerson: "Test contact",
    email: "contact@example.com",
    status: "ACTIVE",
  },
});
const base = "http://127.0.0.1:3107";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3107",
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      UPLOAD_DIR: path.join(directory, "uploads"),
      APP_ORIGIN: base,
      COOKIE_SECURE: "false",
    },
    stdio: "pipe",
  },
);
let output = "";
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
const decode = (s: string) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'");
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/login`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, output);
  const denied = await fetch(`${base}/clients`, { redirect: "manual" });
  assert.equal(denied.status, 307);
  assert.equal(denied.headers.get("location"), "/login");
  const html = await (await fetch(`${base}/login`)).text();
  const form = new FormData();
  for (const match of html.matchAll(/<input\b[^>]*>/g)) {
    if (!match[0].includes('type="hidden"')) continue;
    const name = match[0].match(/name="([^"]*)"/)?.[1];
    const value = match[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) form.append(decode(name), decode(value));
  }
  assert.ok(
    [...form.keys()].some((k) => k.startsWith("$ACTION")),
    "SSR login form must contain server action metadata",
  );
  form.set("email", "qa@example.com");
  form.set("password", password);
  const login = await fetch(`${base}/login`, {
    method: "POST",
    body: form,
    headers: { Origin: base },
    redirect: "manual",
  });
  assert.equal(login.status, 303, `Login response ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie && cookie.startsWith("rise_session="));
  const dashboard = await fetch(base, { headers: { Cookie: cookie } });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /HTTP verification client/);
  const profile = await fetch(`${base}/clients/${client.id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(profile.status, 200);
  assert.match(await profile.text(), /contact@example.com/);
  const forged = await fetch(base, {
    headers: { Cookie: "rise_session=forged" },
    redirect: "manual",
  });
  assert.equal(forged.status, 307);
  const expired = randomBytes(32).toString("hex");
  await db.session.create({
    data: { id: tokenHash(expired), userId: user.id, expiresAt: new Date(0) },
  });
  assert.equal(
    (
      await fetch(base, {
        headers: { Cookie: `rise_session=${expired}` },
        redirect: "manual",
      })
    ).status,
    307,
  );
  const rejected = await fetch(`${base}/login`, {
    method: "POST",
    body: form,
    headers: { Origin: "https://untrusted.example" },
    redirect: "manual",
  });
  assert.ok(rejected.status >= 400);
  assert.equal(
    await db.session.count({ where: { userId: user.id } }),
    2,
    "Rejected origin must not create a session",
  );
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { exportedName: string }> };
  await verifyWorkflows(db, base, cookie, manifest, client.id);
  await verifyLeadWorkflows(db, base, cookie, manifest, user.organizationId);
  const logoutId = Object.entries(manifest.node).find(
    ([, entry]) => entry.exportedName === "logout",
  )?.[0];
  assert.ok(logoutId);
  const logoutForm = new FormData();
  logoutForm.set(`$ACTION_ID_${logoutId}`, "");
  const loggedOut = await fetch(base, {
    method: "POST",
    body: logoutForm,
    headers: { Origin: base, Cookie: cookie },
    redirect: "manual",
  });
  assert.equal(loggedOut.status, 303);
  assert.equal(
    (await fetch(base, { headers: { Cookie: cookie }, redirect: "manual" }))
      .status,
    307,
  );
  form.set("password", "invalid password");
  for (let i = 0; i < 8; i++)
    await fetch(`${base}/login`, {
      method: "POST",
      body: form,
      headers: { Origin: base },
      redirect: "manual",
    });
  form.set("password", password);
  const throttled = await fetch(`${base}/login`, {
    method: "POST",
    body: form,
    headers: { Origin: base },
    redirect: "manual",
  });
  assert.match(await throttled.text(), /Too many attempts/);
  assert.equal(
    await db.session.count({ where: { userId: user.id } }),
    1,
    "Throttled login must not issue a session",
  );
  console.log(
    "PASS: real login, protected routes, authenticated dashboard/profile rendering, forged and expired sessions, cross-origin rejection, logout revocation and persistent login throttling.",
  );
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    child.kill();
    await stopped;
  }
  await db.$disconnect();
  // directory is an absolute OS-generated temporary path owned by this test.
  await rm(directory, { recursive: true, force: true });
}
