import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { tokenHash } from "./password";
export async function requireOwner() {
  const token = (await cookies()).get("rise_session")?.value;
  const session = token
    ? await db.session.findUnique({
        where: { id: tokenHash(token) },
        include: { user: { include: { organization: true } } },
      })
    : null;
  if (
    !session ||
    session.expiresAt < new Date() ||
    session.user.role !== "OWNER"
  )
    redirect("/login");
  return session.user;
}
export async function workspace() {
  const user = await requireOwner();
  const demo = (await cookies()).get("rise_workspace")?.value === "demo";
  const organization = demo
    ? await db.organization.findFirst({
        where: { id: "rise-demo", isDemo: true },
      })
    : user.organization;
  return { user, organization: organization ?? user.organization };
}
export async function assertOrigin() {
  const h = await headers();
  const expected = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
  if (h.get("origin") !== expected) throw new Error("Invalid request origin");
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({
    data: { id: tokenHash(token), userId, expiresAt },
  });
  (await cookies()).set("rise_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}
