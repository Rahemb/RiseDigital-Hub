"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
  assertOrigin,
  createSession,
  requireOwner,
  workspace,
} from "@/server/auth";
import { tokenHash, verifyPassword } from "@/server/password";
import { addClientNote, deleteClient, saveClient } from "@/server/clients";
import { z } from "zod";
export type Result = { error?: string; id?: string; success?: boolean };
export async function login(
  _previous: Result,
  form: FormData,
): Promise<Result> {
  await assertOrigin();
  const parsed = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const email = parsed.data.email.toLowerCase();
  const now = new Date();
  // Single-owner application: one global bucket also prevents email rotation bypass.
  const key = "owner-login";
  const blocked = await db.$transaction(async (tx) => {
    const attempt = await tx.loginAttempt.findUnique({ where: { key } });
    if (attempt && now.getTime() - attempt.windowStart.getTime() < 15 * 60000) {
      if (attempt.count >= 8) return true;
      await tx.loginAttempt.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
    } else
      await tx.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
    return false;
  });
  if (blocked)
    return {
      error: "Too many attempts. Please wait 15 minutes before trying again.",
    };
  const user = await db.user.findUnique({ where: { email } });
  const valid = verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? "00000000000000000000000000000000:" + "00".repeat(64),
  );
  if (!user || user.role !== "OWNER" || !valid)
    return { error: "Email or password is incorrect." };
  await db.loginAttempt.deleteMany({ where: { key } });
  await createSession(user.id);
  redirect("/");
}
export async function logout() {
  await assertOrigin();
  const jar = await cookies();
  const token = jar.get("rise_session")?.value;
  if (token) await db.session.deleteMany({ where: { id: tokenHash(token) } });
  jar.delete("rise_session");
  jar.delete("rise_workspace");
  redirect("/login");
}
export async function switchWorkspace() {
  await assertOrigin();
  await requireOwner();
  const jar = await cookies();
  jar.set(
    "rise_workspace",
    jar.get("rise_workspace")?.value === "demo" ? "live" : "demo",
    {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.COOKIE_SECURE === "true",
    },
  );
  revalidatePath("/", "layout");
  redirect("/");
}
function errorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues[0].message
    : error instanceof Error &&
        [
          "Client not found",
          "This client has business records. Archive it instead.",
        ].includes(error.message)
      ? error.message
      : "Unable to save. Please try again.";
}
export async function saveClientAction(
  input: unknown,
  id?: string,
): Promise<Result> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    const client = await saveClient(db, organization.id, input, id);
    revalidatePath("/", "layout");
    return { id: client.id };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function noteAction(
  clientId: string,
  _previous: Result,
  form: FormData,
): Promise<Result> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    await addClientNote(db, organization.id, clientId, form.get("body"));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function removeClientAction(clientId: string): Promise<Result> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    await deleteClient(db, organization.id, clientId);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
