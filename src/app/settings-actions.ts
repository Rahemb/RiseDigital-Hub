"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  assertOrigin,
  workspace,
  createSession,
  requireOwner,
} from "@/server/auth";
import { db } from "@/server/db";
import { updateProfile, updateAgency } from "@/server/settings-service";
import { BusinessError } from "@/server/business-service";
import type { MutationResult } from "./business-actions";
export async function settingsAction(
  kind: string,
  _state: MutationResult,
  form: FormData,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization, user } = await workspace();
  try {
    if (kind === "profile") {
      const changed = await updateProfile(
        db,
        user.id,
        Object.fromEntries(form),
      );
      if (changed) await createSession(user.id);
    } else if (kind === "agency")
      await updateAgency(db, organization.id, Object.fromEntries(form));
    else throw new BusinessError("Unknown settings form");
    revalidatePath("/", "layout");
    return { success: "Settings saved" };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? e.issues[0].message
          : e instanceof BusinessError
            ? e.message
            : "Unable to save settings",
    };
  }
}
export async function themeAction(theme: string) {
  await assertOrigin();
  const user = await requireOwner();
  await db.user.update({
    where: { id: user.id },
    data: { theme: z.enum(["system", "light", "dark"]).parse(theme) },
  });
  revalidatePath("/", "layout");
}
