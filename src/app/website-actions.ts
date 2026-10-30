"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { workspace, assertOrigin } from "@/server/auth";
import {
  startDiscoveryBatch,
  processDiscoveryItem,
  controlDiscoveryBatch,
  getDiscoveryBatch,
  confirmWebsiteCandidate,
} from "@/server/leads/discovery-jobs";
async function context() {
  await assertOrigin();
  return (await workspace()).organization.id;
}
function errorText(e: unknown) {
  return e instanceof z.ZodError
    ? "Invalid company selection or settings."
    : e instanceof Error && !/prisma|sqlite|invocation/i.test(e.message)
      ? e.message
      : "Could not process website discovery. Try again.";
}
export async function startWebsiteDiscovery(input: unknown) {
  const org = await context();
  try {
    const batch = await startDiscoveryBatch(db, org, input);
    revalidatePath("/leads", "layout");
    return { batch };
  } catch (e) {
    return { error: errorText(e) };
  }
}
export async function stepWebsiteDiscovery() {
  const org = await context();
  try {
    const batch = await processDiscoveryItem(db, org);
    revalidatePath("/leads", "layout");
    return { batch };
  } catch (e) {
    return { error: errorText(e) };
  }
}
export async function websiteDiscoveryProgress() {
  const org = await context();
  return { batch: await getDiscoveryBatch(db, org) };
}
export async function controlWebsiteDiscovery(input: unknown) {
  const org = await context();
  try {
    return {
      batch: await controlDiscoveryBatch(
        db,
        org,
        z.enum(["pause", "resume", "cancel", "retry"]).parse(input),
      ),
    };
  } catch (e) {
    return { error: errorText(e) };
  }
}
export async function confirmDiscoveredWebsite(
  leadId: string,
  _previous: { error?: string; message?: string },
  form: FormData,
): Promise<{ error?: string; message?: string }> {
  const org = await context();
  try {
    await confirmWebsiteCandidate(
      db,
      org,
      leadId,
      Number(form.get("index")),
      String(form.get("explanation") ?? ""),
    );
    revalidatePath("/leads", "layout");
    return {
      message:
        "Company association confirmed. Run an audit for technical findings and an updated score.",
    };
  } catch (e) {
    return { error: errorText(e) };
  }
}
