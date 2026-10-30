"use server";
import { assertOrigin, workspace } from "@/server/auth";
import { db } from "@/server/db";
import { manageDocument } from "@/server/document-service";
import { BusinessError } from "@/server/business-service";
import { revalidatePath } from "next/cache";
import type { MutationResult } from "./business-actions";
export async function documentAction(
  id: string,
  action: string,
  name?: string,
): Promise<MutationResult> {
  await assertOrigin();
  const { organization } = await workspace();
  try {
    await manageDocument(db, organization.id, id, action, name);
    revalidatePath("/", "layout");
    return { success: "Document updated" };
  } catch (e) {
    return {
      error:
        e instanceof BusinessError ? e.message : "Unable to update document",
    };
  }
}
