import { workspace, assertOrigin } from "@/server/auth";
import { db } from "@/server/db";
import { saveUpload, MAX_FILE_BYTES } from "@/server/document-service";
import { BusinessError } from "@/server/business-service";
import { z } from "zod";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await assertOrigin();
  } catch {
    return Response.json(
      { error: "Untrusted request origin" },
      { status: 403 },
    );
  }
  const { organization } = await workspace();
  const max = MAX_FILE_BYTES + 128 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    return Response.json({ error: "Upload exceeds 10 MB" }, { status: 413 });
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: "No file provided" }, { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return Response.json(
          { error: "Upload exceeds 10 MB" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const form = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json({ error: "Select a file" }, { status: 400 });
    const record = await saveUpload(
      db,
      organization.id,
      Object.fromEntries(form),
      { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) },
    );
    return Response.json({ id: record.id }, { status: 201 });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof BusinessError
            ? e.message
            : e instanceof z.ZodError
              ? "Select a valid client and attachment location"
              : "Unable to upload this file",
      },
      { status: 400 },
    );
  }
}
