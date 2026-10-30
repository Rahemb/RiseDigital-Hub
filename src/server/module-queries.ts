import "server-only";
import { db } from "./db";
import {
  dateKey,
  paymentSummary,
  progress,
  type Kind,
  amountInput,
} from "../lib/business";
import type { Option } from "../lib/module-config";
export type Row = {
  id: string;
  title: string;
  clientId?: string;
  clientName?: string;
  status: string;
  priority?: string;
  dueDate?: Date | null;
  progress?: number;
  amount?: number;
  received?: number;
  outstanding?: number;
  archived?: boolean;
  subtitle?: string;
  assigneeId?: string | null;
};
export async function choices(organizationId: string) {
  const [clients, projects, services, agreements, users] = await Promise.all([
    db.client.findMany({
      where: { organizationId },
      orderBy: { companyName: "asc" },
    }),
    db.project.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    db.clientService.findMany({
      where: { organizationId },
      include: { service: true, client: true },
    }),
    db.user.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
  ]);
  return {
    clients: clients.map((c) => ({ value: c.id, label: c.companyName })),
    projects: projects.map((p) => ({
      value: p.id,
      label: p.name,
      clientId: p.clientId,
    })),
    services: services.map((s) => ({
      value: s.id,
      label: `${s.name}${s.active ? "" : " (inactive)"}`,
    })),
    agreements: agreements.map((a) => ({
      value: a.id,
      label: `${a.service.name} · ${a.client.companyName}`,
      clientId: a.clientId,
    })),
    users: users.map((u) => ({ value: u.id, label: u.name })),
  } satisfies Record<string, Option[]>;
}
export async function moduleRows(
  organizationId: string,
  kind: Kind,
  clientId?: string,
  projectId?: string,
  relations?: { serviceId?: string; agreementId?: string },
): Promise<Row[]> {
  const where = { organizationId, ...(clientId ? { clientId } : {}) };
  switch (kind) {
    case "projects":
      return (
        await db.project.findMany({
          where,
          include: { client: true, tasks: { where: { archived: false } } },
          orderBy: { createdAt: "desc" },
        })
      ).map((p) => ({
        id: p.id,
        title: p.name,
        clientId: p.clientId,
        clientName: p.client.companyName,
        status: p.status,
        priority: p.priority,
        dueDate: p.deadline,
        progress: progress(p.tasks),
        archived: p.archived,
        subtitle: p.type,
      }));
    case "tasks":
      return (
        await db.task.findMany({
          where: { ...where, ...(projectId ? { projectId } : {}) },
          include: { client: true, project: true },
          orderBy: { createdAt: "desc" },
        })
      ).map((t) => ({
        id: t.id,
        title: t.title,
        clientId: t.clientId,
        clientName: t.client.companyName,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        archived: t.archived,
        subtitle: t.project?.name,
        assigneeId: t.assigneeId,
      }));
    case "services":
      return (
        await db.service.findMany({
          where: { organizationId },
          orderBy: { name: "asc" },
        })
      ).map((s) => ({
        id: s.id,
        title: s.name,
        status: s.active ? "ACTIVE" : "INACTIVE",
        amount: s.defaultPriceOre ?? undefined,
        subtitle: s.category,
      }));
    case "agreements":
      return (
        await db.clientService.findMany({
          where: {
            ...where,
            ...(relations?.serviceId ? { serviceId: relations.serviceId } : {}),
          },
          include: { client: true, service: true },
          orderBy: { startDate: "desc" },
        })
      ).map((a) => ({
        id: a.id,
        title: a.service.name,
        clientId: a.clientId,
        clientName: a.client.companyName,
        status: a.active ? "ACTIVE" : "INACTIVE",
        amount: a.priceOre,
        dueDate: a.nextPaymentDate,
        subtitle: a.intervalMonths
          ? `Every ${a.intervalMonths} month(s)`
          : a.intervalDays
            ? `Every ${a.intervalDays} day(s)`
            : "One-time",
      }));
    case "payments":
      return (
        await db.paymentObligation.findMany({
          where: {
            ...where,
            ...(relations?.agreementId
              ? { agreementId: relations.agreementId }
              : {}),
          },
          include: {
            client: true,
            transactions: true,
            agreement: { include: { service: true } },
          },
          orderBy: { dueDate: "asc" },
        })
      ).map((p) => ({
        id: p.id,
        title: p.reference || p.agreement?.service.name || "Payment obligation",
        clientId: p.clientId,
        clientName: p.client.companyName,
        dueDate: p.dueDate,
        amount: p.amountOre,
        ...paymentSummary(p),
      }));
    case "support":
      return (
        await db.supportTicket.findMany({
          where: { ...where, ...(projectId ? { projectId } : {}) },
          include: { client: true },
          orderBy: { createdAt: "desc" },
        })
      ).map((t) => ({
        id: t.id,
        title: t.title,
        clientId: t.clientId,
        clientName: t.client.companyName,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        subtitle: t.category,
      }));
    case "reminders":
      return (
        await db.reminder.findMany({
          where,
          include: { client: true },
          orderBy: { dueDate: "asc" },
        })
      ).map((r) => ({
        id: r.id,
        title: r.title,
        clientId: r.clientId,
        clientName: r.client.companyName,
        status: r.completedAt ? "COMPLETED" : "PENDING",
        dueDate: r.dueDate,
      }));
  }
}
export async function recordData(
  organizationId: string,
  kind: Kind,
  id: string,
) {
  const where = { id, organizationId };
  switch (kind) {
    case "projects":
      return db.project.findFirst({ where });
    case "tasks":
      return db.task.findFirst({ where });
    case "services":
      return db.service.findFirst({ where });
    case "agreements":
      return db.clientService.findFirst({ where });
    case "payments":
      return db.paymentObligation.findFirst({ where });
    case "support":
      return db.supportTicket.findFirst({ where });
    case "reminders":
      return db.reminder.findFirst({ where });
  }
}
export function formValues(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value instanceof Date
        ? dateKey(value)
        : key.endsWith("Ore") && typeof value === "number"
          ? amountInput(value)
          : value === null
            ? ""
            : String(value),
    ]),
  );
}
