import type { PrismaClient } from "@prisma/client";
import {
  savedLeadSchema,
  matchingClients,
  savedStatus,
} from "../../lib/saved-leads";
import { getLead, isSuppressed } from "./service";
import { saveClient } from "../clients";

export async function saveSimpleLead(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: unknown,
) {
  const data = savedLeadSchema.parse(input);
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    const suppressed =
      lead.contactStatus === "DO_NOT_CONTACT" ||
      (await isSuppressed(tx, organizationId, lead)) ||
      (await isSuppressed(tx, organizationId, {
        orgNumber: lead.orgNumber,
        email: data.email,
      }));
    if (suppressed && data.status !== savedStatus(lead.contactStatus))
      throw new Error(
        "Do-not-contact restriction: status changes are blocked. You can still save notes.",
      );
    const changedWebsite = lead.website !== data.website;
    const changedEmail = lead.email !== data.email;
    // A tracking status never grants permission to send or copy an email.
    await tx.lead.update({
      where: { id },
      data: {
        website: data.website,
        email: data.email,
        notes: data.notes,
        contactStatus:
          lead.clientId || suppressed ? lead.contactStatus : data.status,
        followUpAt: suppressed
          ? lead.followUpAt
          : data.followUp
            ? new Date(`${data.followUp}T12:00:00Z`)
            : null,
        approvedAt: null,
        reviewedAt: new Date(),
        ...(changedEmail
          ? {
              emailStatus: "UNVERIFIED",
              emailKind: "UNKNOWN",
              emailSource: "Manually entered",
            }
          : {}),
        ...(changedWebsite
          ? {
              websiteStatus: data.website ? "UNVERIFIED" : "UNKNOWN",
              websiteSource: "Manually entered",
              websiteVerifiedAt: null,
              score: null,
              scoreAssessment: "INSUFFICIENT",
            }
          : {}),
      },
    });
    if (changedWebsite)
      await tx.websiteDiscovery.updateMany({
        where: { leadId: id },
        data: {
          status: "PENDING",
          confirmedAt: null,
          selectedUrl: "",
          explanation:
            "Website edited manually; previous evidence retained for reference.",
        },
      });
    await tx.leadReview.upsert({
      where: { leadId: id },
      create: { leadId: id, phone: data.phone },
      update: { phone: data.phone },
    });
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: "EDIT",
        body: "Saved contact details, notes and follow-up. No contact initiated.",
      },
    });
  });
}
export async function setSavedVisibility(
  db: PrismaClient,
  organizationId: string,
  id: string,
  removed: boolean,
) {
  await db.$transaction(async (tx) => {
    await getLead(tx, organizationId, id);
    await tx.savedLeadState.upsert({
      where: { leadId: id },
      create: { leadId: id, removedAt: removed ? new Date() : null },
      update: { removedAt: removed ? new Date() : null },
    });
  });
}
export async function addLeadToClients(
  db: PrismaClient,
  organizationId: string,
  id: string,
) {
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    if (lead.clientId) return lead.clientId;
    if (
      lead.contactStatus === "DO_NOT_CONTACT" ||
      (await isSuppressed(tx, organizationId, lead))
    )
      throw new Error(
        "Do-not-contact restriction: adding this lead to Clients is blocked.",
      );
    // Obtain SQLite's write lock before matching/creating, including requests for different leads.
    await tx.lead.update({ where: { id }, data: { approvedAt: null } });
    const clients = await tx.client.findMany({ where: { organizationId } });
    const matches = matchingClients(lead, clients);
    if (matches.length > 1)
      throw new Error(
        "Multiple matching clients found. Resolve duplicates in Clients before adding this company.",
      );
    const review = await tx.leadReview.findUnique({ where: { leadId: id } });
    const client =
      matches[0] ??
      (await saveClient(
        db,
        organizationId,
        {
          companyName: lead.companyName,
          organizationNumber: lead.orgNumber,
          status: "LEAD",
          contactPerson: "",
          email: lead.email,
          phone: review?.phone ?? "",
          website: lead.website,
          address: lead.municipality,
          tags: lead.tags,
          summary: lead.notes,
        },
        undefined,
        tx,
      ));
    if (!matches.length) {
      // Industry has no dedicated Client column; preserve it as an internal note.
      if (lead.industry)
        await tx.note.create({
          data: {
            organizationId,
            clientId: client.id,
            body: `Industry: ${lead.industry}${lead.industryCode ? ` (${lead.industryCode})` : ""}`,
          },
        });
      if (lead.followUpAt)
        await tx.client.update({
          where: { id: client.id },
          data: { followUpAt: lead.followUpAt },
        });
    }
    await tx.lead.update({
      where: { id },
      data: {
        clientId: client.id,
        contactStatus: "CONVERTED",
        approvedAt: null,
      },
    });
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: "CONVERTED",
        body: matches.length
          ? "Linked to existing client without changing client data"
          : "Added to Clients as Lead",
      },
    });
    return client.id;
  });
}
