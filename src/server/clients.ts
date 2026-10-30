import type { PrismaClient, Prisma } from "@prisma/client";
import { clientSchema, noteSchema } from "../lib/validation";
export async function saveClient(
  database: PrismaClient,
  organizationId: string,
  input: unknown,
  id?: string,
  transaction?: Prisma.TransactionClient,
) {
  const data = clientSchema.parse(input);
  const save = async (tx: Prisma.TransactionClient) => {
    if (id && !(await tx.client.findFirst({ where: { id, organizationId } })))
      throw new Error("Client not found");
    const client = id
      ? await tx.client.update({ where: { id, organizationId }, data })
      : await tx.client.create({ data: { ...data, organizationId } });
    await tx.activityLog.create({
      data: {
        organizationId,
        clientId: client.id,
        message: `${id ? "Updated" : "Created"} client ${client.companyName}`,
      },
    });
    return client;
  };
  return transaction ? save(transaction) : database.$transaction(save);
}
export async function addClientNote(
  database: PrismaClient,
  organizationId: string,
  clientId: string,
  body: unknown,
) {
  const validated = noteSchema.parse(body);
  return database.$transaction(async (tx) => {
    if (
      !(await tx.client.findFirst({ where: { id: clientId, organizationId } }))
    )
      throw new Error("Client not found");
    const note = await tx.note.create({
      data: { organizationId, clientId, body: validated },
    });
    await tx.activityLog.create({
      data: { organizationId, clientId, message: "Added an internal note" },
    });
    return note;
  });
}
export async function deleteClient(
  database: PrismaClient,
  organizationId: string,
  id: string,
) {
  return database.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            projects: true,
            tasks: true,
            agreements: true,
            obligations: true,
            tickets: true,
            documents: true,
            reminders: true,
            convertedLeads: true,
          },
        },
      },
    });
    if (!client) throw new Error("Client not found");
    if (Object.values(client._count).some(Boolean))
      throw new Error("This client has business records. Archive it instead.");
    await tx.client.delete({ where: { id, organizationId } });
    await tx.activityLog.create({
      data: { organizationId, message: `Deleted client ${client.companyName}` },
    });
  });
}
