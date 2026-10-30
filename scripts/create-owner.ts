import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "../src/server/password";
const db = new PrismaClient();
async function main() {
  const input = z
    .object({
      OWNER_EMAIL: z.email(),
      OWNER_PASSWORD: z.string().min(14).max(256),
      OWNER_NAME: z.string().min(1).max(100).default("Owner"),
    })
    .parse(process.env);
  if (await db.user.count())
    throw new Error(
      "An owner already exists. This command never replaces accounts or data.",
    );
  await db.organization.create({
    data: {
      name: "Rise Digital",
      users: {
        create: {
          email: input.OWNER_EMAIL.toLowerCase(),
          name: input.OWNER_NAME,
          passwordHash: hashPassword(input.OWNER_PASSWORD),
        },
      },
    },
  });
  console.log(
    "Owner created. Sign in at http://127.0.0.1:3000. Remove OWNER_PASSWORD from your environment.",
  );
}
main()
  .catch(() => {
    console.error(
      "Owner creation failed. Use a valid OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD (14–256 characters), migrate first, and ensure no owner already exists.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
