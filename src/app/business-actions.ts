"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { assertOrigin, workspace } from "@/server/auth";
import {
  saveBusiness,
  changeStatus,
  addComment,
  recordPayment,
  generatePayments,
  BusinessError,
} from "@/server/business-service";
import { kindSchema } from "@/lib/business";
export type MutationResult = { error?: string; success?: string; id?: string };
function message(e: unknown) {
  return e instanceof z.ZodError
    ? e.issues.map((i) => i.message).join(". ")
    : e instanceof BusinessError
      ? e.message
      : "Unable to save. Check your entries and try again.";
}
export async function saveRecordAction(
  kind: string,
  id: string | undefined,
  form: FormData,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    const record = await saveBusiness(
      db,
      organization.id,
      kindSchema.parse(kind),
      Object.fromEntries(form),
      id,
    );
    revalidatePath("/", "layout");
    return { id: record.id, success: "Saved successfully" };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function statusAction(
  kind: string,
  id: string,
  status: string,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    await changeStatus(db, organization.id, kind, id, status);
    revalidatePath("/", "layout");
    return { success: "Status updated" };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function commentAction(
  kind: string,
  id: string,
  _state: MutationResult,
  form: FormData,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization, user } = await workspace();
  try {
    await addComment(db, organization.id, user.id, kind, id, form.get("body"));
    revalidatePath("/", "layout");
    return { success: "Comment saved" };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function transactionAction(
  id: string,
  _state: MutationResult,
  form: FormData,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    await recordPayment(db, organization.id, id, Object.fromEntries(form));
    revalidatePath("/", "layout");
    return { success: "Payment recorded" };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function generateAction(
  _state: MutationResult,
  form: FormData,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    const count = await generatePayments(
      db,
      organization.id,
      String(form.get("through") ?? ""),
    );
    revalidatePath("/", "layout");
    return {
      success: `Generated ${count} expected payment records. No clients were charged.`,
    };
  } catch (e) {
    return { error: message(e) };
  }
}
