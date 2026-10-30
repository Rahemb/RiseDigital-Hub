import "dotenv/config";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:") || url.includes("?"))
  throw new Error("Set DATABASE_URL to a plain file: SQLite path.");
const filename = path.resolve("prisma", url.slice(5));
await mkdir(path.dirname(filename), { recursive: true });
await mkdir(path.resolve(process.env.UPLOAD_DIR || "./data/uploads"), {
  recursive: true,
});
const db = new DatabaseSync(filename);
db.close();
console.log(
  "Persistent storage ready. Existing data preserved. Run npm run db:migrate next.",
);
