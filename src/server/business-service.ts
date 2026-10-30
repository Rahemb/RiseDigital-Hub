import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  agreementSchema,
  obligationSchema,
  projectSchema,
  reminderSchema,
  serviceSchema,
  supportSchema,
  taskSchema,
  transactionSchema,
  kindSchema,
  recurrenceDate,
  dateKey,
  day,
  businessDate,
  paymentSummary,
  type Kind,
} from "../lib/business";
export class BusinessError extends Error {}
type Tx = Prisma.TransactionClient;
export async function ownedClient(tx: Tx, organizationId: string, id: string) {
  const c = await tx.client.findFirst({ where: { id, organizationId } });
  if (!c) throw new BusinessError("Client not found in this workspace");
  return c;
}
export async function linkedProject(
  tx: Tx,
  organizationId: string,
  clientId: string,
  projectId: string | null,
) {
  if (
    projectId &&
    !(await tx.project.findFirst({
      where: { id: projectId, organizationId, clientId },
    }))
  )
    throw new BusinessError("The project must belong to the selected client");
}
export async function activity(
  tx: Tx,
  organizationId: string,
  clientId: string | null,
  entityType: string,
  entityId: string,
  message: string,
) {
  await tx.activityLog.create({
    data: { organizationId, clientId, entityType, entityId, message },
  });
}
export async function saveBusiness(
  db: PrismaClient,
  organizationId: string,
  kind: Kind,
  input: unknown,
  id?: string,
) {
  kindSchema.parse(kind);
  return db.$transaction(async (tx) => {
    let record: { id: string };
    let clientId: string | null = null;
    let name = "";
    switch (kind) {
      case "projects": {
        const data = projectSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        clientId = data.clientId;
        name = data.name;
        if (id) {
          const old = await tx.project.findFirst({
            where: { id, organizationId },
            include: {
              _count: {
                select: {
                  tasks: true,
                  notes: true,
                  documents: true,
                  tickets: true,
                },
              },
            },
          });
          if (!old) throw new BusinessError("Project not found");
          if (
            old.clientId !== data.clientId &&
            Object.values(old._count).some(Boolean)
          )
            throw new BusinessError(
              "A project with linked records cannot be moved to another client",
            );
        }
        record = id
          ? await tx.project.update({ where: { id, organizationId }, data })
          : await tx.project.create({ data: { ...data, organizationId } });
        break;
      }
      case "tasks": {
        const data = taskSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        await linkedProject(tx, organizationId, data.clientId, data.projectId);
        if (
          data.assigneeId &&
          !(await tx.user.findFirst({
            where: { id: data.assigneeId, organizationId },
          }))
        )
          throw new BusinessError("Assignee must belong to this workspace");
        clientId = data.clientId;
        name = data.title;
        const old = id
          ? await tx.task.findFirst({ where: { id, organizationId } })
          : null;
        if (id && !old) throw new BusinessError("Task not found");
        const completedAt =
          data.status === "COMPLETED" ? (old?.completedAt ?? new Date()) : null;
        record = id
          ? await tx.task.update({
              where: { id, organizationId },
              data: { ...data, completedAt },
            })
          : await tx.task.create({
              data: { ...data, organizationId, completedAt },
            });
        break;
      }
      case "services": {
        const data = serviceSchema.parse(input);
        name = data.name;
        if (
          id &&
          !(await tx.service.findFirst({ where: { id, organizationId } }))
        )
          throw new BusinessError("Service not found");
        record = id
          ? await tx.service.update({ where: { id, organizationId }, data })
          : await tx.service.create({ data: { ...data, organizationId } });
        break;
      }
      case "agreements": {
        const data = agreementSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        const service = await tx.service.findFirst({
          where: { id: data.serviceId, organizationId },
        });
        if (!service)
          throw new BusinessError("Service not found in this workspace");
        clientId = data.clientId;
        name = service.name;
        if (id) {
          const old = await tx.clientService.findFirst({
            where: { id, organizationId },
            include: { _count: { select: { obligations: true } } },
          });
          if (!old) throw new BusinessError("Agreement not found");
          if (
            old._count.obligations &&
            (old.clientId !== data.clientId ||
              old.serviceId !== data.serviceId ||
              old.intervalMonths !== data.intervalMonths ||
              old.intervalDays !== data.intervalDays ||
              dateKey(old.startDate) !== dateKey(data.startDate))
          )
            throw new BusinessError(
              "Keep the client, service, start date and billing interval unchanged once payments exist. Create a new agreement instead.",
            );
        }
        const existing = id
          ? await tx.clientService.findFirst({
              where: { id, organizationId },
              include: { _count: { select: { obligations: true } } },
            })
          : null;
        if (
          existing?._count.obligations &&
          dateKey(existing.nextPaymentDate ?? existing.startDate) !==
            dateKey(data.nextPaymentDate ?? data.startDate)
        )
          throw new BusinessError(
            "The next date of a generated schedule is managed automatically. Create a new agreement to change its schedule.",
          );
        const billingAnchorDate = existing?._count.obligations
          ? (existing.billingAnchorDate ?? existing.startDate)
          : (data.nextPaymentDate ?? data.startDate);
        record = id
          ? await tx.clientService.update({
              where: { id, organizationId },
              data: {
                ...data,
                billingAnchorDate,
                nextPaymentDate: existing?._count.obligations
                  ? data.nextPaymentDate
                  : billingAnchorDate,
              },
            })
          : await tx.clientService.create({
              data: {
                ...data,
                organizationId,
                billingAnchorDate,
                nextPaymentDate: billingAnchorDate,
              },
            });
        break;
      }
      case "payments": {
        const data = obligationSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        clientId = data.clientId;
        name = data.reference || "Payment obligation";
        if (
          data.agreementId &&
          !(await tx.clientService.findFirst({
            where: {
              id: data.agreementId,
              organizationId,
              clientId: data.clientId,
            },
          }))
        )
          throw new BusinessError(
            "Agreement must belong to the selected client",
          );
        if (id) {
          const old = await tx.paymentObligation.findFirst({
            where: { id, organizationId },
            include: { transactions: true },
          });
          if (!old) throw new BusinessError("Payment not found");
          const paid = old.transactions.reduce((a, t) => a + t.amountOre, 0);
          if (data.amountOre < paid)
            throw new BusinessError(
              "Amount due cannot be less than payments received",
            );
          if (
            paid &&
            (data.cancelled ||
              old.clientId !== data.clientId ||
              old.agreementId !== data.agreementId)
          )
            throw new BusinessError(
              "A received payment cannot be cancelled or reassigned",
            );
          if (old.periodKey && old.agreementId !== data.agreementId)
            throw new BusinessError(
              "Generated payments must retain their agreement",
            );
        }
        record = id
          ? await tx.paymentObligation.update({
              where: { id, organizationId },
              data,
            })
          : await tx.paymentObligation.create({
              data: { ...data, organizationId },
            });
        break;
      }
      case "support": {
        const data = supportSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        await linkedProject(tx, organizationId, data.clientId, data.projectId);
        clientId = data.clientId;
        name = data.title;
        if (id) {
          const old = await tx.supportTicket.findFirst({
            where: { id, organizationId },
            include: { _count: { select: { documents: true } } },
          });
          if (!old) throw new BusinessError("Ticket not found");
          if (
            old._count.documents &&
            (old.clientId !== data.clientId || old.projectId !== data.projectId)
          )
            throw new BusinessError("A ticket with files cannot be reassigned");
        }
        record = id
          ? await tx.supportTicket.update({
              where: { id, organizationId },
              data,
            })
          : await tx.supportTicket.create({
              data: { ...data, organizationId },
            });
        break;
      }
      case "reminders": {
        const { completed, ...data } = reminderSchema.parse(input);
        await ownedClient(tx, organizationId, data.clientId);
        clientId = data.clientId;
        name = data.title;
        if (
          id &&
          !(await tx.reminder.findFirst({ where: { id, organizationId } }))
        )
          throw new BusinessError("Reminder not found");
        const completedAt = completed ? new Date() : null;
        record = id
          ? await tx.reminder.update({
              where: { id, organizationId },
              data: { ...data, completedAt },
            })
          : await tx.reminder.create({
              data: { ...data, organizationId, completedAt },
            });
        break;
      }
    }
    await activity(
      tx,
      organizationId,
      clientId,
      kind,
      record.id,
      `${id ? "Updated" : "Created"} ${kind}: ${name}${"status" in record ? ` · ${String(record.status).replaceAll("_", " ")}` : ""}`,
    );
    return record;
  });
}
export async function changeStatus(
  db: PrismaClient,
  organizationId: string,
  kind: string,
  id: string,
  status: string,
) {
  return db.$transaction(async (tx) => {
    let clientId: string;
    let title: string;
    if (kind === "tasks") {
      const row = await tx.task.findFirst({ where: { id, organizationId } });
      if (!row) throw new BusinessError("Task not found");
      taskSchema.shape.status.parse(status);
      await tx.task.update({
        where: { id },
        data: {
          status,
          completedAt:
            status === "COMPLETED" ? (row.completedAt ?? new Date()) : null,
        },
      });
      clientId = row.clientId;
      title = row.title;
    } else if (kind === "projects") {
      const row = await tx.project.findFirst({ where: { id, organizationId } });
      if (!row) throw new BusinessError("Project not found");
      z.enum([
        "PLANNED",
        "IN_PROGRESS",
        "WAITING_FOR_CLIENT",
        "ON_HOLD",
        "COMPLETED",
        "CANCELLED",
      ]).parse(status);
      await tx.project.update({ where: { id }, data: { status } });
      clientId = row.clientId;
      title = row.name;
    } else throw new BusinessError("Unsupported status change");
    await activity(
      tx,
      organizationId,
      clientId,
      kind,
      id,
      `${title}: ${status.replaceAll("_", " ")}`,
    );
  });
}
export async function addComment(
  db: PrismaClient,
  organizationId: string,
  userId: string,
  kind: string,
  id: string,
  body: unknown,
) {
  const text = z.string().trim().min(1).max(10000).parse(body);
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    let clientId: string;
    if (kind === "tasks") {
      const row = await tx.task.findFirst({ where: { id, organizationId } });
      if (!row) throw new BusinessError("Task not found");
      clientId = row.clientId;
      await tx.taskComment.create({ data: { taskId: id, userId, body: text } });
    } else if (kind === "projects") {
      const row = await tx.project.findFirst({ where: { id, organizationId } });
      if (!row) throw new BusinessError("Project not found");
      clientId = row.clientId;
      await tx.note.create({
        data: { organizationId, clientId, projectId: id, body: text },
      });
    } else if (kind === "support") {
      const row = await tx.supportTicket.findFirst({
        where: { id, organizationId },
      });
      if (!row) throw new BusinessError("Ticket not found");
      clientId = row.clientId;
      await tx.ticketComment.create({
        data: { ticketId: id, authorName: user.name, body: text },
      });
    } else throw new BusinessError("Unsupported comment");
    await activity(
      tx,
      organizationId,
      clientId,
      kind,
      id,
      "Added an internal comment",
    );
  });
}
export async function recordPayment(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: unknown,
) {
  const data = transactionSchema.parse(input);
  return db.$transaction(async (tx) => {
    const p = await tx.paymentObligation.findFirst({
      where: { id, organizationId },
      include: { transactions: true },
    });
    if (!p) throw new BusinessError("Payment not found");
    if (p.cancelled)
      throw new BusinessError("Cancelled obligations cannot receive payments");
    if (data.amountOre > paymentSummary(p).outstanding)
      throw new BusinessError("Payment exceeds the outstanding balance");
    const record = await tx.paymentTransaction.create({
      data: { ...data, organizationId, obligationId: id },
    });
    await activity(
      tx,
      organizationId,
      p.clientId,
      "payments",
      id,
      `Recorded payment of ${(data.amountOre / 100).toFixed(2)} NOK (${data.method})`,
    );
    return record;
  });
}
export async function generatePayments(
  db: PrismaClient,
  organizationId: string,
  throughInput: string,
) {
  const through = businessDate(day.parse(throughInput));
  if (through > recurrenceDate(new Date(), 12, null, 1))
    throw new BusinessError("Generate at most 12 months ahead");
  return db.$transaction(
    async (tx) => {
      const agreements = await tx.clientService.findMany({
        where: { organizationId, active: true },
        include: { service: true },
      });
      let created = 0;
      for (const a of agreements) {
        let next: Date | null = null;
        for (let index = 0; index < 2400; index++) {
          const due = recurrenceDate(
            a.billingAnchorDate ?? a.startDate,
            a.intervalMonths,
            a.intervalDays,
            index,
          );
          if (a.endDate && due > a.endDate) break;
          const periodKey = dateKey(due);
          const existing = await tx.paymentObligation.findUnique({
            where: { agreementId_periodKey: { agreementId: a.id, periodKey } },
          });
          if (due > through && !existing) {
            next = due;
            break;
          }
          if (!existing) {
            await tx.paymentObligation.create({
              data: {
                organizationId,
                clientId: a.clientId,
                agreementId: a.id,
                periodKey,
                amountOre: a.priceOre,
                dueDate: due,
                reference: `${a.service.name} · ${periodKey}`,
              },
            });
            created++;
          }
          if (!a.intervalMonths && !a.intervalDays) break;
          if (index === 2399)
            throw new BusinessError(
              "Agreement has more than 2400 periods; shorten its date range",
            );
        }
        await tx.clientService.update({
          where: { id: a.id },
          data: { nextPaymentDate: next },
        });
      }
      if (created)
        await activity(
          tx,
          organizationId,
          null,
          "payments",
          "generation",
          `Generated ${created} expected payment records; no clients charged`,
        );
      return created;
    },
    { timeout: 30000 },
  );
}
