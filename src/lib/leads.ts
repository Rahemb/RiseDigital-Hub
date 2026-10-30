import { z } from "zod";
export function leadValidationMessage(error: z.ZodError) {
  const labels: Record<string, string> = {
    companyName: "company name",
    orgNumber: "organization number",
    email: "email",
    website: "website",
    notes: "notes",
    tags: "tags",
    municipality: "municipality",
    municipalityCode: "municipality code",
    industry: "industry",
    industryCode: "industry code",
    qualification: "qualification",
    emailSource: "email source",
    emailStatus: "email status",
    emailKind: "recipient type",
    status: "contact status",
    note: "activity note",
    followUp: "follow-up date",
    subject: "subject",
    body: "message",
    template: "template",
    contactPerson: "contact person",
    area: "region",
    limit: "result count",
    page: "page number",
    config: "settings",
    rules: "scoring rules",
    mappings: "industry codes",
  };
  return (
    "Check the value and allowed length for: " +
    [
      ...new Set(
        error.issues.map(
          (i) => labels[String(i.path[0])] ?? String(i.path.join(".")),
        ),
      ),
    ].join(", ") +
    "."
  );
}
export const contactLabels = {
  NOT_CONTACTED: "Not contacted",
  DRAFT_READY: "Draft ready",
  AWAITING_REVIEW: "Awaiting review",
  APPROVED: "Approved for contact",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not interested",
  FOLLOW_UP: "Follow-up",
  DO_NOT_CONTACT: "Do not contact",
  CONVERTED: "Converted",
} as const;
export const qualificationLabels = {
  NEW: "New",
  REVIEW: "Reviewing",
  QUALIFIED: "Qualified",
  REJECTED: "Not a fit",
} as const;
export const websiteLabels = {
  UNKNOWN: "Unknown / not found",
  UNVERIFIED: "Not verified",
  VERIFIED: "Technically verified",
  FAILED: "Could not verify",
  NO_WEBSITE: "No website (manually confirmed)",
};
export const areas = {
  LOCAL: "Oslo, Lillestrøm and Lørenskog",
  OSLO: "Oslo",
  LILLESTROM: "Lillestrøm",
  LORENSKOG: "Lørenskog",
  AKERSHUS: "Akershus",
  NORWAY: "All of Norway",
};
export const areaCodes: Record<string, string[]> = {
  LOCAL: ["0301", "3205", "3222"],
  OSLO: ["0301"],
  LILLESTROM: ["3205"],
  LORENSKOG: ["3222"],
  AKERSHUS: [
    "3201",
    "3203",
    "3205",
    "3207",
    "3209",
    "3212",
    "3214",
    "3216",
    "3218",
    "3220",
    "3222",
    "3224",
    "3226",
    "3228",
    "3230",
    "3232",
    "3234",
    "3236",
    "3238",
    "3240",
    "3242",
  ],
  NORWAY: [],
};
export const industries = {
  ALL: "All industries",
  FOOD: "Restaurants and cafés",
  BEAUTY: "Hairdressers and beauty salons",
  AUTO: "Car repair and detailing",
  BUILD: "Construction and trades",
  CLEAN: "Cleaning companies",
  FITNESS: "Fitness and wellness",
  RETAIL: "Retail shops",
  PROFESSIONAL: "Professional services",
  OTHER: "Other industries",
};
export const defaultMappings = {
  FOOD: ["56.1", "56.3"],
  BEAUTY: ["96.21", "96.22"],
  AUTO: ["95.31"],
  BUILD: ["41", "42", "43"],
  CLEAN: ["81.2"],
  FITNESS: ["93.13", "96.23"],
  RETAIL: ["47"],
  PROFESSIONAL: ["69", "70.2", "71", "73", "74"],
  OTHER: ["95", "96"],
};
export const rulesSchema = z.object({
  company: z.number().int().min(0).max(30),
  industry: z.number().int().min(0).max(30),
  https: z.number().int().min(0).max(30),
  title: z.number().int().min(0).max(30),
  description: z.number().int().min(0).max(30),
  viewport: z.number().int().min(0).max(30),
  heading: z.number().int().min(0).max(30),
  alt: z.number().int().min(0).max(30),
  language: z.number().int().min(0).max(30),
});
export const defaultConfig = {
  maxResults: 50,
  requestDelayMs: 1500,
  auditDays: 30,
  mappings: defaultMappings,
  rules: {
    company: 10,
    industry: 10,
    https: 15,
    title: 15,
    description: 15,
    viewport: 15,
    heading: 10,
    alt: 5,
    language: 5,
  },
};
export const configSchema = z.object({
  maxResults: z.number().int().min(1).max(100),
  requestDelayMs: z.number().int().min(1000).max(10000),
  auditDays: z.number().int().min(1).max(90),
  rules: rulesSchema,
  mappings: z.record(
    z.enum([
      "FOOD",
      "BEAUTY",
      "AUTO",
      "BUILD",
      "CLEAN",
      "FITNESS",
      "RETAIL",
      "PROFESSIONAL",
      "OTHER",
    ]),
    z
      .array(z.string().regex(/^\d{2}(?:\.\d{1,3})?$/))
      .min(1)
      .max(15),
  ),
});
export type LeadConfig = z.infer<typeof configSchema>;
export function readConfig(value?: string) {
  try {
    return configSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return defaultConfig;
  }
}
export function validOrgNumber(value: string) {
  if (!/^\d{9}$/.test(value)) return false;
  const sum = [3, 2, 7, 6, 5, 4, 3, 2].reduce(
    (s, w, i) => s + w * Number(value[i]),
    0,
  );
  const check = (11 - (sum % 11)) % 11;
  return check < 10 && check === Number(value[8]);
}
export const orgNumber = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .refine(validOrgNumber, "Invalid Norwegian organization number");
export function normalizeWebsite(value: string) {
  if (!value.trim()) return "";
  const input = value.trim();
  const u = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`,
  );
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw new Error(
      "Use a public HTTP(S) URL without credentials or a custom port",
    );
  u.hash = "";
  return u.href;
}
const website = z
  .string()
  .trim()
  .max(1000)
  .default("")
  .transform((v, ctx) => {
    try {
      return normalizeWebsite(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid website URL" });
      return z.NEVER;
    }
  });
export const leadInput = z.object({
  companyName: z.string().trim().min(1).max(180),
  orgNumber,
  industry: z.string().trim().max(200).default(""),
  industryCode: z.string().max(20).default(""),
  municipality: z.string().trim().max(100).default(""),
  municipalityCode: z.string().max(4).default(""),
  website,
  email: z
    .union([z.email().max(254), z.literal("")])
    .default("")
    .transform((v) => v.toLowerCase()),
  notes: z.string().trim().max(10000).default(""),
  tags: z.string().trim().max(300).default(""),
});
export type LeadInput = z.infer<typeof leadInput>;
export const searchSchema = z.object({
  area: z
    .enum(["LOCAL", "OSLO", "LILLESTROM", "LORENSKOG", "AKERSHUS", "NORWAY"])
    .default("LOCAL"),
  industry: z
    .enum([
      "ALL",
      "FOOD",
      "BEAUTY",
      "AUTO",
      "BUILD",
      "CLEAN",
      "FITNESS",
      "RETAIL",
      "PROFESSIONAL",
      "OTHER",
    ])
    .default("ALL"),
  name: z.string().trim().max(180).default(""),
  municipality: z
    .string()
    .regex(/^$|^\d{4}$/)
    .default(""),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
  exclude: z.boolean().default(true),
});
export type SearchInput = z.infer<typeof searchSchema>;
export const templateLabels = {
  WEBSITE: "Website improvements",
  SEO: "Visibility and content",
  TOOLS: "Digital tools",
};
