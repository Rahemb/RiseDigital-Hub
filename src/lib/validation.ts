import { z } from "zod";
export const clientStatuses = [
  "LEAD",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;
export const clientSchema = z
  .object({
    companyName: z.string().trim().min(1, "Enter a company name").max(180),
    contactPerson: z.string().trim().max(120),
    email: z.union([z.literal(""), z.email("Enter a valid email").max(254)]),
    phone: z.string().trim().max(40),
    website: z
      .string()
      .trim()
      .max(1000)
      .refine(
        (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
        "Use a full https:// or http:// URL",
      ),
    organizationNumber: z.string().trim().max(40),
    address: z.string().trim().max(500),
    status: z.enum(clientStatuses),
    tags: z.string().trim().max(300),
    summary: z.string().trim().max(10000),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "LEAD") {
      if (!data.contactPerson)
        ctx.addIssue({
          code: "custom",
          path: ["contactPerson"],
          message: "Enter a contact person",
        });
      if (!data.email)
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Enter a valid email",
        });
    }
  });
export type ClientInput = z.infer<typeof clientSchema>;
export const noteSchema = z
  .string()
  .trim()
  .min(1, "Write a note first")
  .max(10000);
