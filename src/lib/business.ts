import { z } from "zod";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays, addMonths, format, isValid, parseISO } from "date-fns";
export const zone = "Europe/Oslo";
export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const projectStatuses = [
  "PLANNED",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export const taskStatuses = [
  "TODO",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
] as const;
export const ticketStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CLIENT",
  "RESOLVED",
  "CLOSED",
] as const;
export const kinds = [
  "projects",
  "tasks",
  "services",
  "agreements",
  "payments",
  "support",
  "reminders",
] as const;
export type Kind = (typeof kinds)[number];
export const kindSchema = z.enum(kinds);
export function dateKey(date: Date = new Date()) {
  return formatInTimeZone(date, zone, "yyyy-MM-dd");
}
export function businessDate(value: string) {
  return fromZonedTime(`${value}T00:00:00`, zone);
}
export function shiftDate(value: string, days: number) {
  return format(addDays(parseISO(`${value}T12:00:00`), days), "yyyy-MM-dd");
}
export const day = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      isValid(parseISO(v)) &&
      format(parseISO(v), "yyyy-MM-dd") === v,
    "Enter a valid date",
  );
const optionalDay = z
  .union([day, z.literal("")])
  .default("")
  .transform((v) => (v ? businessDate(v) : null));
const requiredDay = day.transform(businessDate);
const text = z.string().trim().max(10000).default("");
const title = z.string().trim().min(1, "A title is required").max(180);
const id = z.string().min(1, "Choose a client").max(100);
const optionalId = z
  .string()
  .max(100)
  .default("")
  .transform((v) => v || null);
const bool = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((v) => v === true || v === "true")
  .default(false);
export const moneyInput = z
  .string()
  .trim()
  .regex(
    /^\d{1,8}([.,]\d{1,2})?$/,
    "Enter a positive amount with at most two decimal places",
  )
  .transform((v) => {
    const [whole, part = ""] = v.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(part.padEnd(2, "0"));
  })
  .refine(
    (v) => v > 0 && v <= 2147483647,
    "Amount must be between 0.01 and 21,474,836.47 NOK",
  );
const optionalMoney = z
  .union([moneyInput, z.literal("").transform(() => null)])
  .default(null);
const interval = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(1200)])
  .default("")
  .transform((v) => (v === "" ? null : v));
export const projectSchema = z
  .object({
    name: title,
    clientId: id,
    description: text,
    type: z.string().trim().min(1).max(80),
    status: z.enum(projectStatuses),
    priority: z.enum(priorities),
    startDate: optionalDay,
    deadline: optionalDay,
    archived: bool,
  })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, {
    message: "Deadline must follow the start date",
    path: ["deadline"],
  });
export const taskSchema = z.object({
  title,
  clientId: id,
  projectId: optionalId,
  assigneeId: optionalId,
  description: text,
  status: z.enum(taskStatuses),
  priority: z.enum(priorities),
  dueDate: optionalDay,
  archived: bool,
});
export const serviceSchema = z.object({
  name: title,
  description: text,
  category: z.string().trim().min(1).max(100),
  defaultPriceOre: optionalMoney,
  billingType: z.enum(["ONE_TIME", "MONTHLY", "CUSTOM"]),
  active: bool,
});
export const agreementSchema = z
  .object({
    clientId: id,
    serviceId: id,
    priceOre: moneyInput,
    intervalMonths: interval,
    intervalDays: interval,
    startDate: requiredDay,
    endDate: optionalDay,
    nextPaymentDate: optionalDay,
    notes: text,
    active: bool,
  })
  .refine((v) => !(v.intervalMonths && v.intervalDays), {
    message: "Choose either months or days, not both",
    path: ["intervalDays"],
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date must follow start date",
    path: ["endDate"],
  })
  .refine(
    (v) =>
      !v.nextPaymentDate ||
      (v.nextPaymentDate >= v.startDate &&
        (!v.endDate || v.nextPaymentDate <= v.endDate)),
    {
      message: "Next payment must be within the agreement dates",
      path: ["nextPaymentDate"],
    },
  );
export const obligationSchema = z.object({
  clientId: id,
  agreementId: optionalId,
  amountOre: moneyInput,
  dueDate: requiredDay,
  cancelled: bool,
  reference: z.string().trim().max(160).default(""),
  notes: text,
});
export const transactionSchema = z
  .object({
    amountOre: moneyInput,
    paidAt: requiredDay,
    method: z.enum(["BANK_TRANSFER", "VIPPS", "CASH", "OTHER"]),
    reference: z.string().trim().max(160).default(""),
    notes: text,
  })
  .refine((v) => dateKey(v.paidAt) <= dateKey(), {
    message: "Received payments cannot be future-dated",
    path: ["paidAt"],
  });
export const supportSchema = z.object({
  title,
  clientId: id,
  projectId: optionalId,
  description: text,
  category: z.string().trim().min(1).max(100),
  priority: z.enum(priorities),
  status: z.enum(ticketStatuses),
  dueDate: optionalDay,
  internalNotes: text,
});
export const reminderSchema = z.object({
  title,
  clientId: id,
  dueDate: requiredDay,
  completed: bool,
});
export function progress(tasks: { status: string }[]) {
  return tasks.length
    ? Math.round(
        (tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) *
          100,
      )
    : 0;
}
export function paymentSummary(
  p: {
    amountOre: number;
    cancelled: boolean;
    dueDate: Date;
    transactions: { amountOre: number }[];
  },
  now = new Date(),
) {
  const received = p.transactions.reduce((a, t) => a + t.amountOre, 0);
  const outstanding = p.cancelled ? 0 : Math.max(0, p.amountOre - received);
  const overdue = outstanding > 0 && dateKey(p.dueDate) < dateKey(now);
  return {
    received,
    outstanding,
    overdue,
    status: p.cancelled
      ? "CANCELLED"
      : outstanding === 0
        ? "PAID"
        : overdue
          ? "OVERDUE"
          : received > 0
            ? "PARTIALLY_PAID"
            : "PENDING",
  };
}
export function recurrenceDate(
  anchor: Date,
  months: number | null,
  days: number | null,
  index: number,
) {
  const local = parseISO(`${dateKey(anchor)}T12:00:00`);
  return businessDate(
    format(
      months
        ? addMonths(local, months * index)
        : addDays(local, (days ?? 0) * index),
      "yyyy-MM-dd",
    ),
  );
}
export function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}
export function amountInput(ore: number | null) {
  return ore === null ? "" : (ore / 100).toFixed(2);
}
