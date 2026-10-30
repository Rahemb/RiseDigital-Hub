import { Prisma, type PrismaClient, type Lead } from "@prisma/client";
import { z } from "zod";
import {
  leadInput,
  readConfig,
  configSchema,
  contactLabels,
  qualificationLabels,
  templateLabels,
  type LeadInput,
} from "../../lib/leads";
import { clientSchema } from "../../lib/validation";
import { reviewSchema } from "../../lib/lead-research";
import { saveClient } from "../clients";
import { analyzeHtml, scoreLead, draftEmail, type AuditData } from "./audit";
import { fetchPublic, type WebResult } from "./public-web";
import type { RegistryCompany } from "./brreg";
type DB = Prisma.TransactionClient;
export function auditCutoff(days: number) {
  return new Date(Date.now() - days * 86400000);
}
export async function getLead(db: DB, organizationId: string, id: string) {
  const lead = await db.lead.findFirst({ where: { id, organizationId } });
  if (!lead) throw new Error("Lead not found");
  return lead;
}
export async function getConfig(db: DB, organizationId: string) {
  return readConfig(
    (await db.leadSettings.findUnique({ where: { organizationId } }))?.config,
  );
}
export async function saveConfig(
  db: PrismaClient,
  organizationId: string,
  input: unknown,
) {
  const config = configSchema.parse(input);
  await db.$transaction(async (tx) => {
    await tx.leadSettings.upsert({
      where: { organizationId },
      create: { organizationId, config: JSON.stringify(config) },
      update: { config: JSON.stringify(config) },
    });
    await tx.lead.updateMany({
      where: { organizationId },
      data: { score: null, scoreAssessment: "INSUFFICIENT" },
    });
  });
}
export async function reserveRequest(db: PrismaClient, organizationId: string) {
  const config = await getConfig(db, organizationId);
  await db.leadSettings.upsert({
    where: { organizationId },
    create: { organizationId, config: JSON.stringify(config) },
    update: {},
  });
  const reserved = await db.leadSettings.updateMany({
    where: {
      organizationId,
      OR: [{ requestAfter: null }, { requestAfter: { lte: new Date() } }],
    },
    data: { requestAfter: new Date(Date.now() + config.requestDelayMs) },
  });
  if (!reserved.count) throw new Error("Wait briefly before the next request");
  return config;
}
export async function isSuppressed(
  db: DB,
  organizationId: string,
  lead: Pick<Lead, "orgNumber" | "email">,
) {
  return !!(await db.suppression.findFirst({
    where: {
      organizationId,
      key: {
        in: [`org:${lead.orgNumber}`, `email:${lead.email.toLowerCase()}`],
      },
    },
  }));
}
async function contactable(db: DB, organizationId: string, lead: Lead) {
  if (
    lead.clientId ||
    lead.contactStatus === "DO_NOT_CONTACT" ||
    (await isSuppressed(db, organizationId, lead))
  )
    throw new Error("Further contact is blocked for this company or recipient");
}
export async function importLeads(
  db: PrismaClient,
  organizationId: string,
  kind: "MANUAL" | "CSV" | "BRREG",
  rows: (LeadInput | RegistryCompany)[],
) {
  if (!rows.length || rows.length > 200)
    throw new Error("Select between 1 and 200 companies");
  return db.$transaction(
    async (tx) => {
      const source = await tx.leadSource.upsert({
        where: { organizationId_kind: { organizationId, kind } },
        create: {
          organizationId,
          kind,
          name:
            kind === "BRREG"
              ? "Brønnøysundregistrene / Enhetsregisteret"
              : kind === "CSV"
                ? "CSV-import"
                : "Add lead manually",
          url:
            kind === "BRREG"
              ? "https://data.brreg.no/enhetsregisteret/api/"
              : "",
        },
        update: {},
      });
      let imported = 0;
      const skipped: string[] = [];
      const ids: string[] = [];
      for (const raw of rows) {
        const data = leadInput.parse(raw);
        if (await isSuppressed(tx, organizationId, data)) {
          skipped.push(`${data.companyName}: do-not-contact restriction`);
          continue;
        }
        if (
          await tx.lead.findUnique({
            where: {
              organizationId_orgNumber: {
                organizationId,
                orgNumber: data.orgNumber,
              },
            },
          })
        ) {
          skipped.push(`${data.companyName}: already exists`);
          continue;
        }
        const registry = kind === "BRREG" ? (raw as RegistryCompany) : null;
        const lead = await tx.lead.create({
          data: {
            ...data,
            organizationId,
            sourceId: source.id,
            registryVerified: !!registry,
            registryActive: registry?.active,
            websiteStatus: data.website ? "UNVERIFIED" : "UNKNOWN",
            websiteSource: data.website
              ? (registry?.sourceUrl ?? source.name)
              : "",
            emailSource: data.email ? (registry?.sourceUrl ?? source.name) : "",
            emailStatus: data.email && registry ? "PUBLISHED" : "UNVERIFIED",
            emailKind: /^(post|kontakt|info|firmapost|hei|hello|office)@/i.test(
              data.email,
            )
              ? "GENERIC"
              : "UNKNOWN",
          },
        });
        await tx.outreachActivity.create({
          data: {
            leadId: lead.id,
            kind: "IMPORT",
            body: `Imported from ${source.name}`,
          },
        });
        ids.push(lead.id);
        imported++;
      }
      return { imported, skipped, ids };
    },
    { timeout: 15000 },
  );
}
const editSchema = leadInput.omit({ orgNumber: true }).extend({
  qualification: z.enum(
    Object.keys(qualificationLabels) as [
      keyof typeof qualificationLabels,
      ...(keyof typeof qualificationLabels)[],
    ],
  ),
  emailSource: z.string().trim().max(1000),
  emailStatus: z.enum(["UNVERIFIED", "PUBLISHED", "VERIFIED"]),
  emailKind: z.enum(["UNKNOWN", "GENERIC", "PERSONAL"]),
  noWebsite: z.boolean().default(false),
});
export async function editLead(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: unknown,
) {
  const data = editSchema.parse(input);
  const review = reviewSchema.parse(input);
  if (data.emailStatus !== "UNVERIFIED" && (!data.email || !data.emailSource))
    throw new Error("Enter email and source before verification");
  if (data.noWebsite && data.website)
    throw new Error("Remove the URL before confirming no website");
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    const { noWebsite, ...fields } = data;
    if (Object.values(review).some((v) => v !== undefined))
      await tx.leadReview.upsert({
        where: { leadId: id },
        create: { leadId: id, ...review },
        update: review,
      });
    const changed = data.website !== lead.website;
    const identityChanged =
      data.companyName !== lead.companyName ||
      data.industryCode !== lead.industryCode;
    if (
      changed ||
      identityChanged ||
      noWebsite ||
      lead.websiteStatus === "NO_WEBSITE"
    )
      await tx.websiteDiscovery.updateMany({
        where: { leadId: id },
        data: {
          status: "PENDING",
          selectedUrl: "",
          confirmedAt: null,
          explanation:
            "Details were manually edited. Run discovery again or reconfirm the candidate.",
        },
      });
    await tx.lead.update({
      where: { id },
      data: {
        ...fields,
        registryVerified: identityChanged ? false : lead.registryVerified,
        ...(identityChanged
          ? { score: null, scoreAssessment: "INSUFFICIENT" }
          : {}),
        reviewedAt: new Date(),
        approvedAt: null,
        contactStatus:
          lead.contactStatus === "APPROVED"
            ? "AWAITING_REVIEW"
            : lead.contactStatus,
        ...(changed || noWebsite || lead.websiteStatus === "NO_WEBSITE"
          ? {
              websiteStatus: noWebsite
                ? "NO_WEBSITE"
                : data.website
                  ? "UNVERIFIED"
                  : "UNKNOWN",
              websiteSource: "Manually entered",
              websiteVerifiedAt: null,
              score: null,
              scoreAssessment: "INSUFFICIENT",
            }
          : {}),
      },
    });
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: "EDIT",
        body: "Company review saved",
      },
    });
  });
}
export async function currentAudit(db: DB, lead: Lead) {
  const config = await getConfig(db, lead.organizationId);
  if (lead.websiteStatus !== "VERIFIED") return null;
  const audit = await db.websiteAudit.findFirst({
    where: {
      leadId: lead.id,
      url: lead.website,
      status: "SUCCESS",
      createdAt: { gte: new Date(Date.now() - config.auditDays * 86400000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return audit ? (JSON.parse(audit.findings) as AuditData) : null;
}
const scanState = globalThis as unknown as { leadScanBusy?: boolean };
export async function auditLead(
  db: PrismaClient,
  organizationId: string,
  id: string,
  fetcher: (url: string) => Promise<WebResult> = fetchPublic,
) {
  if (scanState.leadScanBusy)
    throw new Error(
      "A website is already being analyzed. Try again afterwards.",
    );
  scanState.leadScanBusy = true;
  let reserved = false;
  try {
    const lead = await getLead(db, organizationId, id);
    if (!lead.website) throw new Error("Add a website URL first");
    const config = await reserveRequest(db, organizationId);
    const last = await db.websiteAudit.findFirst({
      where: { leadId: id, createdAt: { gte: new Date(Date.now() - 60000) } },
    });
    if (last)
      throw new Error("Wait one minute before checking the same website again");
    const lock = await db.lead.updateMany({
      where: {
        id,
        organizationId,
        OR: [{ scanUntil: null }, { scanUntil: { lte: new Date() } }],
      },
      data: { scanUntil: new Date(Date.now() + 300000) },
    });
    if (!lock.count) throw new Error("This company is already being analyzed");
    reserved = true;
    let result: WebResult | undefined;
    let audit: AuditData | null = null;
    let error = "";
    try {
      result = await fetcher(lead.website);
      if (result.status < 200 || result.status >= 300)
        throw new Error(`Website returned HTTP ${result.status}`);
      if (!/text\/html|application\/xhtml\+xml/i.test(result.type))
        throw new Error("Response is not an HTML page");
      audit = analyzeHtml(result.body, result.url, result.status, config.rules);
      if (result.url.startsWith("https:"))
        audit.findings.push({
          key: "httpsAvailable",
          kind: "VERIFIED",
          text: "HTTPS was available with a valid TLS certificate during the check.",
          points: 0,
        });
      else {
        const secure = new URL(result.url);
        secure.protocol = "https:";
        secure.port = "";
        try {
          const probe = await fetcher(secure.href);
          const available =
            probe.url.startsWith("https:") &&
            probe.status >= 200 &&
            probe.status < 300;
          audit.findings.push({
            key: "httpsAvailable",
            kind: available ? "VERIFIED" : "UNKNOWN",
            text: available
              ? "The HTTPS version also responded. Consider using the HTTPS URL."
              : "HTTPS could not be verified in this check.",
            points: 0,
          });
        } catch {
          audit.findings.push({
            key: "httpsAvailable",
            kind: "UNKNOWN",
            text: "HTTPS could not be verified. This does not prove HTTPS is unavailable.",
            points: 0,
          });
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Website could not be checked";
    }
    await db.$transaction(async (tx) => {
      const current = await getLead(tx, organizationId, id);
      const same = current.website === lead.website;
      await tx.websiteAudit.create({
        data: {
          leadId: id,
          url: lead.website,
          status: audit ? "SUCCESS" : "FAILED",
          httpStatus: result?.status,
          findings: JSON.stringify(audit),
          error,
        },
      });
      if (same) {
        const score = scoreLead(
          { ...current, websiteStatus: audit ? "VERIFIED" : "FAILED" },
          audit,
          config,
        );
        await tx.leadScore.create({
          data: {
            leadId: id,
            value: score.value,
            assessment: score.assessment,
            reasons: JSON.stringify(score.reasons),
            rules: JSON.stringify(config.rules),
          },
        });
        await tx.lead.update({
          where: { id },
          data: {
            websiteStatus: audit ? "VERIFIED" : "FAILED",
            websiteVerifiedAt: audit ? new Date() : null,
            score: score.value,
            scoreAssessment: score.assessment,
            approvedAt: null,
            contactStatus:
              current.contactStatus === "APPROVED"
                ? "AWAITING_REVIEW"
                : current.contactStatus,
          },
        });
      }
      await tx.outreachActivity.create({
        data: {
          leadId: id,
          kind: "AUDIT",
          body: audit
            ? "Website checked and score calculated"
            : `Check failed: ${error}`,
        },
      });
    });
    if (error) throw new Error(error);
    return audit;
  } finally {
    try {
      if (reserved)
        await db.lead.updateMany({
          where: { id, organizationId },
          data: { scanUntil: null },
        });
    } finally {
      scanState.leadScanBusy = false;
    }
  }
}
export async function saveDraft(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: { template: string; subject?: string; body?: string },
) {
  const template = z
    .enum(
      Object.keys(templateLabels) as [
        keyof typeof templateLabels,
        ...(keyof typeof templateLabels)[],
      ],
    )
    .parse(input.template);
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    await contactable(tx, organizationId, lead);
    const generated = draftEmail(
      lead.companyName,
      template,
      await currentAudit(tx, lead),
    );
    const data = z
      .object({
        subject: z
          .string()
          .trim()
          .min(1)
          .max(180)
          .refine(
            (v) => !/[\r\n]/.test(v),
            "Subject must not contain line breaks",
          ),
        body: z.string().trim().min(1).max(12000),
      })
      .parse(input.subject === undefined ? generated : input);
    const draft = await tx.outreachDraft.create({
      data: { leadId: id, template, ...data },
    });
    await tx.lead.update({
      where: { id },
      data: {
        contactStatus:
          input.subject === undefined ? "DRAFT_READY" : "AWAITING_REVIEW",
        approvedAt: null,
      },
    });
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: "DRAFT",
        body: "Email draft saved. No email was sent.",
      },
    });
    return draft;
  });
}
const outreachSchema = z.object({
  status: z.enum(
    Object.keys(contactLabels) as [
      keyof typeof contactLabels,
      ...(keyof typeof contactLabels)[],
    ],
  ),
  note: z.string().trim().min(1).max(5000),
  followUp: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
    .default(""),
  recipientReviewed: z.boolean().default(false),
  legalReviewed: z.boolean().default(false),
  providerReviewed: z.boolean().default(false),
  consent: z.string().max(1000).default(""),
});
export async function outreach(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: unknown,
) {
  const data = outreachSchema.parse(input);
  if (data.status === "CONVERTED") throw new Error("Use Convert to client");
  const followUp = data.followUp
    ? new Date(`${data.followUp}T12:00:00Z`)
    : null;
  if (
    followUp &&
    (!Number.isFinite(followUp.getTime()) ||
      followUp.toISOString().slice(0, 10) !== data.followUp)
  )
    throw new Error("Invalid follow-up date");
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    if (data.status === "DO_NOT_CONTACT") {
      for (const key of [
        `org:${lead.orgNumber}`,
        ...(lead.email ? [`email:${lead.email}`] : []),
      ])
        await tx.suppression.upsert({
          where: { organizationId_key: { organizationId, key } },
          create: { organizationId, key, reason: data.note },
          update: { reason: data.note },
        });
      await tx.lead.updateMany({
        where: {
          organizationId,
          OR: [
            { orgNumber: lead.orgNumber },
            ...(lead.email ? [{ email: lead.email }] : []),
          ],
        },
        data: {
          contactStatus: "DO_NOT_CONTACT",
          approvedAt: null,
          followUpAt: null,
        },
      });
    } else {
      await contactable(tx, organizationId, lead);
      if (data.status === "APPROVED") {
        if (
          !data.recipientReviewed ||
          !data.legalReviewed ||
          !data.providerReviewed ||
          data.note.length < 10
        )
          throw new Error("Complete and document the compliance review");
        if (
          !lead.email ||
          lead.emailStatus === "UNVERIFIED" ||
          lead.emailKind === "UNKNOWN"
        )
          throw new Error("Check the email, source and recipient type first");
        if (lead.emailKind === "PERSONAL" && data.consent.trim().length < 10)
          throw new Error(
            "Document consent or a specific relevant exception for a personal recipient",
          );
        if (!(await tx.outreachDraft.findFirst({ where: { leadId: id } })))
          throw new Error("Save and review a draft first");
      }
      if (data.status === "CONTACTED" && !lead.approvedAt)
        throw new Error("Contact must be reviewed and approved first");
      await tx.lead.update({
        where: { id },
        data: {
          contactStatus: data.status,
          followUpAt: followUp,
          approvedAt: data.status === "APPROVED" ? new Date() : null,
          ...(data.status === "APPROVED"
            ? { complianceNotes: data.note + "\n" + data.consent }
            : {}),
        },
      });
    }
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: data.status,
        body: data.note + (data.consent ? "\n" + data.consent : ""),
      },
    });
  });
}
export async function handoff(db: DB, organizationId: string, id: string) {
  const lead = await getLead(db, organizationId, id);
  await contactable(db, organizationId, lead);
  if (lead.contactStatus !== "APPROVED" || !lead.approvedAt || !lead.email)
    throw new Error("Approve the compliance review first");
  const draft = await db.outreachDraft.findFirst({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!draft) throw new Error("Draft missing");
  return { email: lead.email, subject: draft.subject, body: draft.body };
}
export async function convertLead(
  db: PrismaClient,
  organizationId: string,
  id: string,
  input: unknown,
) {
  const fields = z
    .object({ contactPerson: z.string(), email: z.string() })
    .parse(input);
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, id);
    if (lead.clientId) return lead.clientId;
    await contactable(tx, organizationId, lead);
    if (lead.qualification !== "QUALIFIED")
      throw new Error("Qualify the lead before conversion");
    const candidates = await tx.client.findMany({
      where: { organizationId },
      select: { id: true, organizationNumber: true },
    });
    const matches = candidates.filter(
      (c) => c.organizationNumber.replace(/\s/g, "") === lead.orgNumber,
    );
    if (matches.length > 1)
      throw new Error(
        "Multiple existing clients have this organization number. Resolve duplicates manually.",
      );
    const data = clientSchema.parse({
      companyName: lead.companyName,
      contactPerson: fields.contactPerson,
      email: fields.email,
      phone:
        (await tx.leadReview.findUnique({ where: { leadId: id } }))?.phone ??
        "",
      website: lead.website,
      organizationNumber: lead.orgNumber,
      address: "",
      status: "LEAD",
      tags: lead.tags,
      summary: lead.notes,
    });
    const client =
      matches[0] ?? (await saveClient(db, organizationId, data, undefined, tx));
    await tx.lead.update({
      where: { id },
      data: {
        clientId: client.id,
        contactStatus: "CONVERTED",
        approvedAt: null,
        followUpAt: null,
      },
    });
    await tx.activityLog.create({
      data: {
        organizationId,
        clientId: client.id,
        message: `Lead Finder: ${matches.length ? "Linked to existing" : "Opprettet"} kunde ${lead.companyName}`,
      },
    });
    await tx.outreachActivity.create({
      data: {
        leadId: id,
        kind: "CONVERTED",
        body: "Linked to client records without changing existing client data",
      },
    });
    return client.id;
  });
}
