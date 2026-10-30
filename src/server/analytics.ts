import type { PrismaClient } from "@prisma/client";
import {
  businessDate,
  dateKey,
  paymentSummary,
  shiftDate,
} from "../lib/business";
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: string;
  href: string;
  client: string;
};
export async function calendarEvents(
  db: PrismaClient,
  organizationId: string,
  from: string,
  to: string,
) {
  const range = { gte: businessDate(from), lt: businessDate(shiftDate(to, 1)) };
  const [tasks, projects, payments, reminders, tickets, agreements, clients] =
    await Promise.all([
      db.task.findMany({
        where: { organizationId, archived: false, dueDate: range },
        include: { client: true },
      }),
      db.project.findMany({
        where: { organizationId, archived: false, deadline: range },
        include: { client: true },
      }),
      db.paymentObligation.findMany({
        where: { organizationId, cancelled: false, dueDate: range },
        include: { client: true },
      }),
      db.reminder.findMany({
        where: { organizationId, completedAt: null, dueDate: range },
        include: { client: true },
      }),
      db.supportTicket.findMany({
        where: {
          organizationId,
          status: { notIn: ["RESOLVED", "CLOSED"] },
          dueDate: range,
        },
        include: { client: true },
      }),
      db.clientService.findMany({
        where: { organizationId, active: true, nextPaymentDate: range },
        include: { service: true, client: true },
      }),
      db.client.findMany({
        where: {
          organizationId,
          status: { not: "ARCHIVED" },
          followUpAt: range,
        },
      }),
    ]);
  return [
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      date: dateKey(t.dueDate!),
      type: "Tasks",
      href: `/tasks/${t.id}`,
      client: t.client.companyName,
    })),
    ...projects.map((p) => ({
      id: p.id,
      title: p.name,
      date: dateKey(p.deadline!),
      type: "Projects",
      href: `/projects/${p.id}`,
      client: p.client.companyName,
    })),
    ...payments.map((p) => ({
      id: p.id,
      title: p.reference || "Expected payment",
      date: dateKey(p.dueDate),
      type: "Payments",
      href: `/payments/${p.id}`,
      client: p.client.companyName,
    })),
    ...reminders.map((r) => ({
      id: r.id,
      title: r.title,
      date: dateKey(r.dueDate),
      type: "Follow-ups",
      href: `/reminders/${r.id}`,
      client: r.client.companyName,
    })),
    ...tickets.map((t) => ({
      id: t.id,
      title: t.title,
      date: dateKey(t.dueDate!),
      type: "Support",
      href: `/support/${t.id}`,
      client: t.client.companyName,
    })),
    ...agreements
      .filter(
        (a) =>
          !payments.some(
            (p) =>
              p.agreementId === a.id &&
              dateKey(p.dueDate) === dateKey(a.nextPaymentDate!),
          ),
      )
      .map((a) => ({
        id: a.id,
        title: `${a.service.name} · expected`,
        date: dateKey(a.nextPaymentDate!),
        type: "Payments",
        href: `/agreements/${a.id}`,
        client: a.client.companyName,
      })),
    ...clients.map((c) => ({
      id: c.id,
      title: "Client follow-up",
      date: dateKey(c.followUpAt!),
      type: "Follow-ups",
      href: `/clients/${c.id}`,
      client: c.companyName,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)) satisfies CalendarEvent[];
}
export async function reportData(
  db: PrismaClient,
  organizationId: string,
  from: string,
  to: string,
) {
  const range = { gte: businessDate(from), lt: businessDate(shiftDate(to, 1)) };
  const [clients, projects, tasks, tickets, obligations, transactions] =
    await Promise.all([
      db.client.findMany({ where: { organizationId } }),
      db.project.findMany({ where: { organizationId, archived: false } }),
      db.task.findMany({ where: { organizationId, archived: false } }),
      db.supportTicket.findMany({ where: { organizationId } }),
      db.paymentObligation.findMany({
        where: { organizationId, dueDate: range },
        include: { transactions: true },
      }),
      db.paymentTransaction.findMany({
        where: { organizationId, paidAt: range },
        include: {
          obligation: {
            include: {
              client: true,
              agreement: { include: { service: true } },
            },
          },
        },
      }),
    ]);
  const byClient = new Map<string, { name: string; ore: number }>();
  const byService = new Map<string, { name: string; ore: number }>();
  const monthly = new Map<
    string,
    { name: string; expected: number; received: number }
  >();
  for (const p of obligations) {
    if (p.cancelled) continue;
    const month = dateKey(p.dueDate).slice(0, 7);
    const item = monthly.get(month) ?? {
      name: month,
      expected: 0,
      received: 0,
    };
    item.expected += p.amountOre / 100;
    monthly.set(month, item);
  }
  for (const t of transactions) {
    const c = t.obligation.client;
    const service = t.obligation.agreement?.service;
    const a = byClient.get(c.id) ?? { name: c.companyName, ore: 0 };
    a.ore += t.amountOre;
    byClient.set(c.id, a);
    const b = byService.get(service?.id ?? "unassigned") ?? {
      name: service?.name ?? "Unassigned / one-time",
      ore: 0,
    };
    b.ore += t.amountOre;
    byService.set(service?.id ?? "unassigned", b);
    const month = dateKey(t.paidAt).slice(0, 7);
    const item = monthly.get(month) ?? {
      name: month,
      expected: 0,
      received: 0,
    };
    item.received += t.amountOre / 100;
    monthly.set(month, item);
  }
  return {
    activeClients: clients.filter((c) => c.status === "ACTIVE").length,
    leads: clients.filter((c) => c.status === "LEAD").length,
    projectsByStatus: Object.entries(
      projects.reduce<Record<string, number>>((a, p) => {
        a[p.status] = (a[p.status] ?? 0) + 1;
        return a;
      }, {}),
    ).map(([name, value]) => ({ name, value })),
    completedTasks: tasks.filter(
      (t) =>
        t.completedAt && t.completedAt >= range.gte && t.completedAt < range.lt,
    ).length,
    overdueTasks: tasks.filter(
      (t) =>
        t.status !== "COMPLETED" && t.dueDate && dateKey(t.dueDate) < dateKey(),
    ).length,
    openSupport: tickets.filter(
      (t) => !["RESOLVED", "CLOSED"].includes(t.status),
    ).length,
    newSupport: tickets.filter(
      (t) => t.createdAt >= range.gte && t.createdAt < range.lt,
    ).length,
    expected: obligations
      .filter((p) => !p.cancelled)
      .reduce((a, p) => a + p.amountOre, 0),
    received: transactions.reduce((a, t) => a + t.amountOre, 0),
    outstanding: obligations.reduce(
      (a, p) => a + paymentSummary(p).outstanding,
      0,
    ),
    byClient: [...byClient.values()].sort((a, b) => b.ore - a.ore),
    byService: [...byService.values()].sort((a, b) => b.ore - a.ore),
    monthly: [...monthly.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
