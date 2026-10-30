import "dotenv/config";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const backupPath = process.argv[2];
if (!backupPath)
  throw new Error(
    "Usage: node --import tsx scripts/verify-lead-preservation.ts backups/<verified-backup>",
  );
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:") || url.includes("?"))
  throw new Error("Expected a plain SQLite file URL");
const live = new DatabaseSync(path.resolve("prisma", url.slice(5)), {
  readOnly: true,
});
const backup = new DatabaseSync(path.resolve(backupPath, "rise.db"), {
  readOnly: true,
});
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
try {
  assert.equal(
    Object.values(backup.prepare("PRAGMA integrity_check").get()!)[0],
    "ok",
  );
  assert.equal(
    Object.values(live.prepare("PRAGMA integrity_check").get()!)[0],
    "ok",
  );
  assert.equal(backup.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(live.prepare("PRAGMA foreign_key_check").all().length, 0);
  let tables = 0,
    rows = 0;
  for (const table of backup
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all()) {
    const name = String(table.name);
    if (name === "_prisma_migrations") continue;
    const identifier = '"' + name.replaceAll('"', '""') + '"';
    const before = backup
      .prepare("SELECT * FROM " + identifier)
      .all()
      .map((r) => JSON.stringify(r))
      .sort();
    const after = live
      .prepare("SELECT * FROM " + identifier)
      .all()
      .map((r) => JSON.stringify(r))
      .sort();
    assert.equal(
      hash(JSON.stringify(after)),
      hash(JSON.stringify(before)),
      `Preservation mismatch in ${name}`,
    );
    tables++;
    rows += before.length;
  }
  async function files(root: string, relative = ""): Promise<string[]> {
    try {
      const result: string[] = [];
      for (const item of await readdir(path.join(root, relative), {
        withFileTypes: true,
      })) {
        const name = path.join(relative, item.name);
        if (item.isSymbolicLink())
          throw new Error("Unexpected symbolic link in uploads");
        if (item.isDirectory()) result.push(...(await files(root, name)));
        else if (item.isFile()) result.push(name);
      }
      return result.sort();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT" && !relative)
        return [];
      throw e;
    }
  }
  const uploads = path.resolve(process.env.UPLOAD_DIR || "data/uploads");
  const backupUploads = path.resolve(backupPath, "uploads");
  const before = await files(backupUploads);
  const after = await files(uploads);
  assert.deepEqual(after, before, "Upload file list changed");
  for (const name of before)
    assert.equal(
      hash(await readFile(path.join(uploads, name))),
      hash(await readFile(path.join(backupUploads, name))),
      "Upload contents changed",
    );
  console.log(
    `PASS: live and backup integrity/foreign keys; ${tables} pre-existing tables / ${rows} rows identical; ${before.length} uploaded files byte-identical. Migration history intentionally excluded. Both databases opened read-only.`,
  );
} finally {
  live.close();
  backup.close();
}
