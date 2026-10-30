import "server-only";
import { db } from "./db";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays, addMonths } from "date-fns";
import { businessDate, dateKey, shiftDate } from "@/lib/business";
export async function dashboard(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const now = new Date();
  const today = fromZonedTime(
    `${formatInTimeZone(now, "Europe/Oslo", "yyyy-MM-dd")}T00:00:00`,
    "Europe/Oslo",
  );
  const tomorrow = fromZonedTime(
    `${formatInTimeZone(addDays(now, 1), "Europe/Oslo", "yyyy-MM-dd")}T00:00:00`,
    "Europe/Oslo",
  );
  const month = fromZonedTime(
    `${formatInTimeZone(now, "Europe/Oslo", "yyyy-MM")}-01T00:00:00`,
    "Europe/Oslo",
  );
  const nextMonth = fromZonedTime(
    `${formatInTimeZone(addMonths(now, 1), "Europe/Oslo", "yyyy-MM")}-01T00:00:00`,
    "Europe/Oslo",
  );
  const horizon = businessDate(shiftDate(dateKey(), org.focusDays + 1));
  const [
    clients,
    projects,
    tasks,
    obligations,
    transactions,
    activities,
    reminders,
    tickets,
  ] = await Promise.all([
    db.client.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    db.project.findMany({
      where: {
        organizationId,
        archived: false,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: { client: true },
    }),
    db.task.findMany({
      where: { organizationId, archived: false, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
    }),
    db.paymentObligation.findMany({
      where: { organizationId, cancelled: false },
      include: { transactions: true },
    }),
    db.paymentTransaction.findMany({
      where: { organizationId, paidAt: { gte: month, lt: nextMonth } },
    }),
    db.activityLog.findMany({
      where: { organizationId },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    db.reminder.findMany({
      where: { organizationId, completedAt: null },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
    db.supportTicket.findMany({
      where: { organizationId, status: { notIn: ["RESOLVED", "CLOSED"] } },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  return {
    clients,
    projects,
    tasks,
    activities,
    today,
    tomorrow,
    reminders,
    tickets,
    focusReminders: reminders.filter((r) => r.dueDate < tomorrow),
    focusTickets: tickets.filter((t) => t.dueDate && t.dueDate < horizon),
    scheduled: [
      ...tasks
        .filter(
          (t) => t.dueDate && t.dueDate >= tomorrow && t.dueDate < horizon,
        )
        .map((t) => ({
          title: t.title,
          date: t.dueDate!,
          href: `/tasks/${t.id}`,
          type: "Task",
        })),
      ...reminders
        .filter((r) => r.dueDate >= tomorrow && r.dueDate < horizon)
        .map((r) => ({
          title: r.title,
          date: r.dueDate,
          href: `/reminders/${r.id}`,
          type: "Follow-up",
        })),
      ...projects
        .filter(
          (p) => p.deadline && p.deadline >= tomorrow && p.deadline < horizon,
        )
        .map((p) => ({
          title: p.name,
          date: p.deadline!,
          href: `/projects/${p.id}`,
          type: "Project",
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime()),
    overdueTasks: tasks.filter((t) => t.dueDate && t.dueDate < today),
    dueTasks: tasks.filter(
      (t) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow,
    ),
    attention: clients.filter(
      (c) =>
        c.status !== "ARCHIVED" &&
        ((c.followUpAt && c.followUpAt < tomorrow) ||
          reminders.some((r) => r.clientId === c.id && r.dueDate < tomorrow) ||
          tickets.some((t) => t.clientId === c.id && t.priority === "URGENT")),
    ),
    deadlineProjects: projects.filter(
      (p) => p.deadline && p.deadline < horizon,
    ),
    upcomingPayments: obligations.filter(
      (p) =>
        p.dueDate < horizon &&
        p.amountOre > p.transactions.reduce((a, t) => a + t.amountOre, 0),
    ),
    outstanding: obligations.reduce(
      (sum, p) =>
        sum +
        Math.max(
          0,
          p.amountOre - p.transactions.reduce((a, t) => a + t.amountOre, 0),
        ),
      0,
    ),
    expected: obligations
      .filter((p) => p.dueDate >= month && p.dueDate < nextMonth)
      .reduce((a, p) => a + p.amountOre, 0),
    received: transactions.reduce((a, t) => a + t.amountOre, 0),
  };
}
