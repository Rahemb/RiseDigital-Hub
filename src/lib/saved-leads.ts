import { z } from "zod";
import { leadInput } from "./leads";
export const savedStatuses = {
  NOT_CONTACTED: "New",
  AWAITING_REVIEW: "Review Later",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not Interested",
} as const;
export function savedStatus(status: string): keyof typeof savedStatuses {
  if (status in savedStatuses) return status as keyof typeof savedStatuses;
  if (status === "REPLIED") return "CONTACTED";
  if (status === "DO_NOT_CONTACT") return "NOT_INTERESTED";
  return "AWAITING_REVIEW";
}
export const savedLeadSchema = leadInput
  .pick({ website: true, email: true, notes: true })
  .extend({
    phone: z.string().trim().max(40),
    status: z.enum([
      "NOT_CONTACTED",
      "AWAITING_REVIEW",
      "CONTACTED",
      "INTERESTED",
      "NOT_INTERESTED",
    ]),
    followUp: z
      .string()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) =>
          !value ||
          (!Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value),
        "Enter a valid follow-up date",
      ),
  });
type Company = { companyName: string; orgNumber: string };
type ExistingClient = {
  id: string;
  companyName: string;
  organizationNumber: string;
};
const number = (s: string) => s.replace(/\D/g, "");
const name = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function matchingClients<T extends ExistingClient>(
  company: Company,
  clients: T[],
): T[] {
  const exact = clients.filter(
    (c) =>
      number(c.organizationNumber) &&
      number(c.organizationNumber) === number(company.orgNumber),
  );
  if (exact.length) return exact;
  // Name fallback only when no organization number is recorded on the client.
  // Never link two different registered organizations by name alone.
  return clients.filter(
    (c) =>
      !number(c.organizationNumber) &&
      name(c.companyName) === name(company.companyName),
  );
}
