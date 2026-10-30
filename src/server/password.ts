import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const stored = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return stored.length === actual.length && timingSafeEqual(stored, actual);
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
