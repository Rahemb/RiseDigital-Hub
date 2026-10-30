import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { readDocument } from "@/server/document-service";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organization } = await workspace();
  try {
    const { doc, bytes } = await readDocument(
      db,
      organization.id,
      (await params).id,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return Response.json({ error: "Document unavailable" }, { status: 404 });
  }
}
