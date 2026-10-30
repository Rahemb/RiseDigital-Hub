import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  writeFile,
  readFile,
  realpath,
  lstat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  BusinessError,
  ownedClient,
  linkedProject,
  activity,
} from "./business-service";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const metadata = z.object({
  clientId: z.string().min(1).max(100),
  projectId: z
    .string()
    .max(100)
    .default("")
    .transform((v) => v || null),
  ticketId: z
    .string()
    .max(100)
    .default("")
    .transform((v) => v || null),
});
const types: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".csv": "text/csv",
};
export function validateFile(name: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new BusinessError("Choose a non-empty file up to 10 MB");
  const safe = path
    .basename(name.replaceAll("\\", "/"))
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 180);
  const extension = path.extname(safe).toLowerCase();
  const mime = types[extension];
  if (!mime)
    throw new BusinessError("Allowed files: PDF, PNG, JPEG, WebP, TXT and CSV");
  const valid =
    extension === ".pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : extension === ".png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : [".jpg", ".jpeg"].includes(extension)
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : extension === ".webp"
            ? bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"
            : !bytes.includes(0) &&
              Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes);
  if (!valid)
    throw new BusinessError("File content does not match its extension");
  return { safe, mime };
}
export async function storedPath(
  storageKey: string,
  root = process.env.UPLOAD_DIR || "./data/uploads",
) {
  if (!/^[0-9a-f-]{36}$/.test(storageKey))
    throw new BusinessError("Invalid storage key");
  // Runtime persistent storage is intentionally outside the deployment bundle.
  const canonical = await realpath(
    /* turbopackIgnore: true */ path.resolve(/* turbopackIgnore: true */ root),
  );
  const filename = path.join(canonical, storageKey);
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new BusinessError("Invalid stored file");
  const actual = await realpath(filename);
  if (path.dirname(actual) !== canonical)
    throw new BusinessError("Invalid stored file");
  return actual;
}
export async function saveUpload(
  db: PrismaClient,
  organizationId: string,
  input: unknown,
  file: { name: string; bytes: Buffer },
  root = process.env.UPLOAD_DIR || "./data/uploads",
) {
  const data = metadata.parse(input);
  const { safe, mime } = validateFile(file.name, file.bytes);
  const storageKey = randomUUID();
  await mkdir(
    /* turbopackIgnore: true */ path.resolve(/* turbopackIgnore: true */ root),
    { recursive: true },
  );
  const canonical = await realpath(
    /* turbopackIgnore: true */ path.resolve(/* turbopackIgnore: true */ root),
  );
  const filename = path.join(canonical, storageKey);
  let written = false;
  try {
    return await db.$transaction(async (tx) => {
      await ownedClient(tx, organizationId, data.clientId);
      await linkedProject(tx, organizationId, data.clientId, data.projectId);
      if (data.ticketId) {
        const ticket = await tx.supportTicket.findFirst({
          where: { id: data.ticketId, organizationId, clientId: data.clientId },
        });
        if (!ticket || (data.projectId && ticket.projectId !== data.projectId))
          throw new BusinessError(
            "Ticket must belong to the selected client and project",
          );
      }
      await writeFile(filename, file.bytes, { flag: "wx", mode: 0o600 });
      written = true;
      const doc = await tx.document.create({
        data: {
          ...data,
          organizationId,
          originalName: safe,
          mimeType: mime,
          sizeBytes: file.bytes.length,
          storageKey,
        },
      });
      await activity(
        tx,
        organizationId,
        data.clientId,
        "documents",
        doc.id,
        `Uploaded ${safe}`,
      );
      return doc;
    });
  } catch (e) {
    if (written) await unlink(filename).catch(() => {});
    throw e;
  }
}
export async function readDocument(
  db: PrismaClient,
  organizationId: string,
  id: string,
  root?: string,
) {
  const doc = await db.document.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!doc) throw new BusinessError("Document not found");
  const bytes = await readFile(await storedPath(doc.storageKey, root));
  return { doc, bytes };
}
export async function manageDocument(
  db: PrismaClient,
  organizationId: string,
  id: string,
  action: string,
  name?: string,
) {
  return db.$transaction(async (tx) => {
    const doc = await tx.document.findFirst({ where: { id, organizationId } });
    if (!doc) throw new BusinessError("Document not found");
    if (!["trash", "restore", "rename"].includes(action))
      throw new BusinessError("Invalid document action");
    const originalName =
      action === "rename"
        ? z
            .string()
            .trim()
            .min(1)
            .max(180)
            .regex(/^[^/\\\x00-\x1f]+$/, "Use a filename without slashes")
            .parse(name)
        : doc.originalName;
    if (
      path.extname(originalName).toLowerCase() !==
      path.extname(doc.originalName).toLowerCase()
    )
      throw new BusinessError("Keep the original file extension");
    await tx.document.update({
      where: { id },
      data:
        action === "rename"
          ? { originalName }
          : { deletedAt: action === "trash" ? new Date() : null },
    });
    await activity(
      tx,
      organizationId,
      doc.clientId,
      "documents",
      id,
      `${action === "trash" ? "Moved to trash" : action === "restore" ? "Restored" : "Renamed"} document ${originalName}`,
    );
  });
}
