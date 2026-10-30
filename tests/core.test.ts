import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  readdir,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { clientSchema } from "../src/lib/validation";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
} from "../src/server/password";
import { saveClient, addClientNote, deleteClient } from "../src/server/clients";
const input = {
  companyName: "Test company",
  contactPerson: "Test owner",
  email: "test@example.com",
  phone: "",
  website: "https://example.com",
  organizationNumber: "",
  address: "",
  status: "ACTIVE",
  tags: "Test",
  summary: "Private client information",
};
test("password hashes are salted and reject invalid passwords", () => {
  const a = hashPassword("a long test passphrase");
  const b = hashPassword("a long test passphrase");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("a long test passphrase", a), true);
  assert.equal(verifyPassword("incorrect", a), false);
  assert.equal(verifyPassword("test", "invalid"), false);
  assert.equal(tokenHash("token").length, 64);
});
test("client validation rejects unsafe URLs, invalid statuses and oversized notes", () => {
  assert.equal(clientSchema.safeParse(input).success, true);
  for (const update of [
    { website: "javascript:alert(1)" },
    { email: "invalid" },
    { status: "INVALID" },
    { companyName: "" },
    { summary: "a".repeat(10001) },
  ])
    assert.equal(
      clientSchema.safeParse({ ...input, ...update }).success,
      false,
    );
});
test("migrations, organization isolation, CRUD, notes, audit and restart persistence", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rise-test-"));
  const filename = path.join(directory, "test.db");
  const sqlite = new DatabaseSync(filename);
  const migrations = await readdir("prisma/migrations");
  for (const migration of migrations
    .filter((m) => m !== "migration_lock.toml")
    .sort())
    sqlite.exec(
      await readFile(
        path.join("prisma/migrations", migration, "migration.sql"),
        "utf8",
      ),
    );
  sqlite.close();
  let db = new PrismaClient({
    datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
  });
  try {
    const a = await db.organization.create({ data: { name: "A" } });
    const b = await db.organization.create({ data: { name: "B" } });
    const client = await saveClient(db, a.id, input);
    assert.equal(client.status, "ACTIVE");
    await assert.rejects(
      saveClient(db, b.id, { ...input, companyName: "Stolen" }, client.id),
      /not found/,
    );
    await assert.rejects(
      addClientNote(db, b.id, client.id, "Not allowed"),
      /not found/,
    );
    await assert.rejects(deleteClient(db, b.id, client.id), /not found/);
    await saveClient(db, a.id, { ...input, status: "ARCHIVED" }, client.id);
    await addClientNote(db, a.id, client.id, "Persistent note");
    assert.equal(
      await db.activityLog.count({ where: { organizationId: a.id } }),
      3,
    );
    await db.$disconnect();
    db = new PrismaClient({
      datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
    });
    assert.equal(
      (await db.client.findUniqueOrThrow({ where: { id: client.id } })).status,
      "ARCHIVED",
    );
    assert.equal((await db.note.findFirstOrThrow()).body, "Persistent note");
    await db.project.create({
      data: {
        organizationId: a.id,
        clientId: client.id,
        name: "Retained project",
      },
    });
    await assert.rejects(
      deleteClient(db, a.id, client.id),
      /Archive it instead/,
    );
    const disposable = await saveClient(db, a.id, {
      ...input,
      companyName: "Disposable",
    });
    await addClientNote(db, a.id, disposable.id, "Delete with client");
    await deleteClient(db, a.id, disposable.id);
    assert.equal(
      await db.note.count({ where: { clientId: disposable.id } }),
      0,
    );
    assert.equal(await db.client.count({ where: { organizationId: b.id } }), 0);
    const env = {
      ...process.env,
      DATABASE_URL: `file:${filename.replaceAll("\\", "/")}`,
      UPLOAD_DIR: path.join(directory, "uploads"),
      BACKUP_DIR: path.join(directory, "backups"),
    };
    const run = (script: string, args: string[] = []) =>
      execFileSync(process.execPath, ["--import", "tsx", script, ...args], {
        env,
        encoding: "utf8",
      });
    run("scripts/seed.ts");
    run("scripts/seed.ts");
    assert.equal(
      await db.client.count({ where: { organizationId: "rise-demo" } }),
      4,
    );
    assert.equal(await db.client.count({ where: { organizationId: a.id } }), 1);
    await mkdir(env.UPLOAD_DIR);
    await writeFile(
      path.join(env.UPLOAD_DIR, "verification.txt"),
      "backup fixture",
    );
    await db.$disconnect();
    run("scripts/backup.ts", ["--app-stopped"]);
    const [snapshot] = await readdir(env.BACKUP_DIR);
    const restored = new DatabaseSync(
      path.join(env.BACKUP_DIR, snapshot, "rise.db"),
      { readOnly: true },
    );
    assert.equal(
      restored.prepare("PRAGMA integrity_check").get()?.integrity_check,
      "ok",
    );
    assert.equal(
      restored.prepare("SELECT COUNT(*) AS total FROM Client").get()?.total,
      5,
    );
    restored.close();
    assert.equal(
      await readFile(
        path.join(env.BACKUP_DIR, snapshot, "uploads", "verification.txt"),
        "utf8",
      ),
      "backup fixture",
    );
  } finally {
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
