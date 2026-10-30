import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password";
import { BusinessError, activity } from "./business-service";
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    currentPassword: z.string().max(256).default(""),
    newPassword: z
      .union([
        z
          .string()
          .min(14, "New password must have at least 14 characters")
          .max(256),
        z.literal(""),
      ])
      .default(""),
    confirmPassword: z.string().max(256).default(""),
    theme: z.enum(["system", "light", "dark"]),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "New passwords must match",
    path: ["confirmPassword"],
  });
export const agencySchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(500),
  website: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || (/^https?:\/\//.test(v) && URL.canParse(v)),
      "Use a full http:// or https:// URL",
    ),
  organizationNumber: z.string().trim().max(40),
  currencyDisplay: z.enum(["symbol", "code"]),
  weekStartsOn: z.coerce.number().int().min(0).max(1),
  focusDays: z.coerce.number().int().min(1).max(30),
});
export async function updateProfile(
  db: PrismaClient,
  userId: string,
  input: unknown,
) {
  const data = profileSchema.parse(input);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const sensitive = !!data.newPassword || data.email !== user.email;
  if (sensitive) {
    const key = `settings:${userId}`;
    const now = new Date();
    const blocked = await db.$transaction(async (tx) => {
      const old = await tx.loginAttempt.findUnique({ where: { key } });
      if (old && now.getTime() - old.windowStart.getTime() < 15 * 60000) {
        if (old.count >= 8) return true;
        await tx.loginAttempt.update({
          where: { key },
          data: { count: { increment: 1 } },
        });
      } else
        await tx.loginAttempt.upsert({
          where: { key },
          create: { key, count: 1, windowStart: now },
          update: { count: 1, windowStart: now },
        });
      return false;
    });
    if (blocked)
      throw new BusinessError("Too many password attempts. Wait 15 minutes.");
    if (!verifyPassword(data.currentPassword, user.passwordHash))
      throw new BusinessError("Current password is incorrect");
  }
  const duplicate = await db.user.findFirst({
    where: { email: data.email, id: { not: userId } },
  });
  if (duplicate) throw new BusinessError("This email is already in use");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        theme: data.theme,
        ...(data.newPassword
          ? { passwordHash: hashPassword(data.newPassword) }
          : {}),
      },
    });
    if (sensitive) {
      await tx.session.deleteMany({ where: { userId } });
      await tx.loginAttempt.deleteMany({
        where: { key: `settings:${userId}` },
      });
    }
    await activity(
      tx,
      user.organizationId,
      null,
      "settings",
      userId,
      "Owner profile updated",
    );
  });
  return sensitive;
}
export async function updateAgency(
  db: PrismaClient,
  organizationId: string,
  input: unknown,
) {
  const data = agencySchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: organizationId }, data });
    await activity(
      tx,
      organizationId,
      null,
      "settings",
      organizationId,
      "Agency information and preferences updated",
    );
  });
}
