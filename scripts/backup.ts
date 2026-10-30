import "dotenv/config";
import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, cp, writeFile } from "node:fs/promises";
import path from "node:path";
async function main() {
  if (!process.argv.includes("--app-stopped"))
    throw new Error(
      "Stop all app processes first, then run npm run backup -- --app-stopped. This ensures the database and uploads describe the same point in time.",
    );
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:") || url.includes("?"))
    throw new Error("Use a plain SQLite file: DATABASE_URL.");
  const databasePath = path.resolve("prisma", url.slice(5));
  const uploads = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
  const destination = path.resolve(
    process.env.BACKUP_DIR || "backups",
    new Date().toISOString().replaceAll(":", "-"),
  );
  await mkdir(destination, { recursive: true });
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    await backup(db, path.join(destination, "rise.db"));
  } finally {
    db.close();
  }
  try {
    await cp(uploads, path.join(destination, "uploads"), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    await mkdir(path.join(destination, "uploads"));
  }
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(
      {
        version: 1,
        createdAt: new Date().toISOString(),
        database: "rise.db",
        uploads: "uploads",
        appVersion: "0.1.0",
      },
      null,
      2,
    ),
  );
  console.log(`Backup completed: ${destination}`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
