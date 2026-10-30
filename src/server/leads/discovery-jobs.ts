import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { auditLead, getLead, getConfig } from "./service";
import { discoverWebsite } from "./discovery-matching";
import { publicUrl } from "./public-web";
import type { WebsiteCandidate } from "../../lib/website-discovery";
export const jobInput = z.object({
  ids: z.array(z.string().min(1).max(100)).max(500).default([]),
  allWithout: z.boolean().default(false),
  analyze: z.boolean().default(false),
});
export async function getDiscoveryBatch(
  db: Prisma.TransactionClient,
  organizationId: string,
) {
  const batch = await db.discoveryBatch.findUnique({
    where: { organizationId },
    include: {
      items: {
        include: { lead: { select: { companyName: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!batch) return null;
  return {
    id: batch.id,
    status: batch.status,
    analyze: batch.analyze,
    busy: !!batch.leaseUntil && batch.leaseUntil > new Date(),
    total: batch.items.length,
    completed: batch.items.filter((i) =>
      ["DONE", "FAILED", "SKIPPED"].includes(i.state),
    ).length,
    verified: batch.items.filter((i) => i.outcome === "VERIFIED").length,
    possible: batch.items.filter((i) => i.outcome === "POSSIBLE").length,
    none: batch.items.filter((i) => i.outcome === "NONE").length,
    failed: batch.items.filter((i) => i.state === "FAILED").length,
    items: batch.items.map((i) => ({
      id: i.id,
      leadId: i.leadId,
      name: i.lead.companyName,
      state: i.state,
      outcome: i.outcome,
      error: i.error,
    })),
  };
}
export async function startDiscoveryBatch(
  db: PrismaClient,
  organizationId: string,
  input: unknown,
) {
  const parsed = jobInput.parse(input);
  return db.$transaction(async (tx) => {
    const existing = await tx.discoveryBatch.findUnique({
      where: { organizationId },
      include: { items: { where: { state: { in: ["QUEUED", "RUNNING"] } } } },
    });
    if (
      existing &&
      (existing.items.length ||
        (existing.leaseUntil && existing.leaseUntil > new Date()))
    )
      throw new Error(
        "A queue already exists. Resume or stop it before starting a new search.",
      );
    const where: Prisma.LeadWhereInput = {
      organizationId,
      ...(parsed.allWithout
        ? { website: "", websiteStatus: { not: "NO_WEBSITE" } }
        : { id: { in: [...new Set(parsed.ids)] } }),
    };
    const leads = await tx.lead.findMany({
      where,
      select: { id: true },
      take: 501,
      orderBy: { discoveredAt: "desc" },
    });
    if (!leads.length)
      throw new Error(
        "No selected companies or companies without a website URL",
      );
    if (leads.length > 500)
      throw new Error(
        "Maximum 500 companies per queue. Select a smaller group.",
      );
    if (!parsed.allWithout && leads.length !== new Set(parsed.ids).size)
      throw new Error("A selected lead does not belong to this workspace");
    const batch = existing
      ? await tx.discoveryBatch.update({
          where: { id: existing.id },
          data: {
            status: "RUNNING",
            analyze: parsed.analyze,
            leaseToken: null,
            leaseUntil: null,
            createdAt: new Date(),
          },
        })
      : await tx.discoveryBatch.create({
          data: { organizationId, analyze: parsed.analyze },
        });
    await tx.discoveryItem.deleteMany({ where: { batchId: batch.id } });
    await tx.discoveryItem.createMany({
      data: leads.map((l) => ({ batchId: batch.id, leadId: l.id })),
    });
    return getDiscoveryBatch(tx, organizationId);
  });
}
export async function controlDiscoveryBatch(
  db: PrismaClient,
  organizationId: string,
  command: "pause" | "resume" | "cancel" | "retry",
) {
  return db.$transaction(async (tx) => {
    const batch = await tx.discoveryBatch.findUnique({
      where: { organizationId },
    });
    if (!batch) throw new Error("No active queue");
    if (command === "retry") {
      if (batch.leaseUntil && batch.leaseUntil > new Date())
        throw new Error("Wait for the current check to finish");
      await tx.discoveryItem.updateMany({
        where: { batchId: batch.id, state: "FAILED" },
        data: { state: "QUEUED", error: "", outcome: "", completedAt: null },
      });
    }
    if (command === "cancel")
      await tx.discoveryItem.updateMany({
        where: {
          batchId: batch.id,
          state: {
            in:
              batch.leaseUntil && batch.leaseUntil > new Date()
                ? ["QUEUED"]
                : ["QUEUED", "RUNNING"],
          },
        },
        data: {
          state: "SKIPPED",
          error: "Stopped by user",
          completedAt: new Date(),
        },
      });
    await tx.discoveryBatch.update({
      where: { id: batch.id },
      data: {
        status:
          command === "pause"
            ? "PAUSED"
            : command === "cancel"
              ? "CANCELLED"
              : "RUNNING",
      },
    });
    return getDiscoveryBatch(tx, organizationId);
  });
}
type JobDependencies = {
  discover?: typeof discoverWebsite;
  audit?: typeof auditLead;
};
export async function processDiscoveryItem(
  db: PrismaClient,
  organizationId: string,
  dependencies: JobDependencies = {},
) {
  const runtime = globalThis as unknown as { websiteDiscoveryBusy?: boolean };
  if (runtime.websiteDiscoveryBusy)
    return getDiscoveryBatch(db, organizationId);
  runtime.websiteDiscoveryBusy = true;
  try {
    return await processLockedItem(db, organizationId, dependencies);
  } finally {
    runtime.websiteDiscoveryBusy = false;
  }
}
async function processLockedItem(
  db: PrismaClient,
  organizationId: string,
  dependencies: JobDependencies,
) {
  const batch = await db.discoveryBatch.findUnique({
    where: { organizationId },
  });
  if (!batch || batch.status !== "RUNNING")
    return getDiscoveryBatch(db, organizationId);
  const token = randomUUID();
  const lock = await db.discoveryBatch.updateMany({
    where: {
      id: batch.id,
      status: "RUNNING",
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
    },
    data: { leaseUntil: new Date(Date.now() + 600000), leaseToken: token },
  });
  if (!lock.count) return getDiscoveryBatch(db, organizationId);
  let itemId: string | undefined,
    leadId: string | undefined,
    leadLocked = false;
  try {
    await db.discoveryItem.updateMany({
      where: { batchId: batch.id, state: "RUNNING" },
      data: { state: "QUEUED" },
    });
    const item = await db.discoveryItem.findFirst({
      where: { batchId: batch.id, state: "QUEUED" },
      orderBy: { id: "asc" },
    });
    if (!item) {
      await db.discoveryBatch.updateMany({
        where: { id: batch.id, status: "RUNNING" },
        data: { status: "COMPLETE" },
      });
      return getDiscoveryBatch(db, organizationId);
    }
    itemId = item.id;
    leadId = item.leadId;
    await db.discoveryItem.update({
      where: { id: item.id },
      data: { state: "RUNNING", error: "", outcome: "" },
    });
    const lead = await getLead(db, organizationId, item.leadId);
    const locked = await db.lead.updateMany({
      where: {
        id: lead.id,
        organizationId,
        OR: [{ scanUntil: null }, { scanUntil: { lte: new Date() } }],
      },
      data: { scanUntil: new Date(Date.now() + 600000) },
    });
    if (!locked.count)
      throw new Error(
        "Another website check is running for this company. Try again later.",
      );
    leadLocked = true;
    const previous = await db.websiteDiscovery.findUnique({
      where: { leadId: lead.id },
    });
    if (previous && previous.checkedAt.getTime() > Date.now() - 60000)
      throw new Error(
        "Wait one minute before repeating discovery for this company.",
      );
    const result = await (dependencies.discover ?? discoverWebsite)(lead);
    let outcome = result.status;
    let auditUrl = "";
    let error = "";
    await db.$transaction(async (tx) => {
      const current = await getLead(tx, organizationId, lead.id);
      const stale =
        current.website !== lead.website ||
        current.websiteStatus === "NO_WEBSITE" ||
        current.companyName !== lead.companyName;
      const candidate = result.candidates.find(
        (c) => c.status === "VERIFIED" && c.url === result.selectedUrl,
      );
      const replacesExisting =
        !!lead.website && !!candidate && candidate.url !== lead.website;
      if (stale || replacesExisting) {
        outcome = "POSSIBLE";
        result.explanation +=
          " Existing or recently edited website information was preserved. Confirm the candidate manually.";
      }
      const selected = outcome === "VERIFIED" ? result.selectedUrl : "";
      await tx.websiteDiscovery.upsert({
        where: { leadId: lead.id },
        create: {
          leadId: lead.id,
          status: outcome,
          candidates: JSON.stringify(result.candidates),
          sources: JSON.stringify(result.sources),
          explanation: result.explanation,
          selectedUrl: selected,
          startingWebsite: lead.website,
        },
        update: {
          status: outcome,
          candidates: JSON.stringify(result.candidates),
          sources: JSON.stringify(result.sources),
          explanation: result.explanation,
          selectedUrl: selected,
          startingWebsite: lead.website,
          checkedAt: new Date(),
          confirmedAt: null,
        },
      });
      if (selected && candidate) {
        auditUrl = selected;
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            website: selected,
            websiteSource: `${candidate.source}: ${candidate.sourceUrl}`,
            websiteStatus:
              current.website === selected
                ? current.websiteStatus
                : "UNVERIFIED",
            websiteVerifiedAt:
              current.website === selected ? current.websiteVerifiedAt : null,
            score: current.website === selected ? current.score : null,
            scoreAssessment:
              current.website === selected
                ? current.scoreAssessment
                : "INSUFFICIENT",
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
          leadId: lead.id,
          kind: "WEBSITE_DISCOVERY",
          body: result.explanation,
        },
      });
    });
    await db.lead.updateMany({
      where: { id: lead.id, organizationId },
      data: { scanUntil: null },
    });
    leadLocked = false;
    if (batch.analyze && auditUrl) {
      try {
        const config = await getConfig(db, organizationId);
        await new Promise((r) => setTimeout(r, config.requestDelayMs));
        const current = await getLead(db, organizationId, lead.id);
        if (current.website !== auditUrl)
          throw new Error("Website URL changed before the audit");
        await (dependencies.audit ?? auditLead)(db, organizationId, lead.id);
      } catch (e) {
        error = `Website association confirmed, but audit failed: ${(e as Error).message}`;
      }
    }
    if (result.status === "FAILED") error = result.explanation;
    await db.discoveryItem.update({
      where: { id: item.id },
      data: {
        state: error ? "FAILED" : "DONE",
        outcome,
        error,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    if (itemId)
      await db.discoveryItem.update({
        where: { id: itemId },
        data: {
          state: "FAILED",
          outcome: "FAILED",
          error: (e as Error).message,
          completedAt: new Date(),
        },
      });
  } finally {
    if (leadLocked && leadId)
      await db.lead.updateMany({
        where: { id: leadId, organizationId },
        data: { scanUntil: null },
      });
    await db.discoveryBatch.updateMany({
      where: { id: batch.id, leaseToken: token },
      data: { leaseUntil: null, leaseToken: null },
    });
  }
  if (
    !(await db.discoveryItem.count({
      where: { batchId: batch.id, state: { in: ["QUEUED", "RUNNING"] } },
    }))
  )
    await db.discoveryBatch.updateMany({
      where: { id: batch.id, status: "RUNNING" },
      data: { status: "COMPLETE" },
    });
  return getDiscoveryBatch(db, organizationId);
}
export async function confirmWebsiteCandidate(
  db: PrismaClient,
  organizationId: string,
  leadId: string,
  index: number,
  explanation: string,
) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 4 ||
    explanation.trim().length < 10 ||
    explanation.length > 2000
  )
    throw new Error(
      "Select a candidate and document how company association was checked",
    );
  return db.$transaction(async (tx) => {
    const lead = await getLead(tx, organizationId, leadId);
    if (lead.scanUntil && lead.scanUntil > new Date())
      throw new Error("Wait for the website check to finish");
    const discovery = await tx.websiteDiscovery.findUnique({
      where: { leadId },
    });
    if (!discovery) throw new Error("No saved candidates");
    const candidates = JSON.parse(discovery.candidates) as WebsiteCandidate[];
    const candidate = candidates[index];
    if (!candidate) throw new Error("Candidate not found");
    const url = publicUrl(candidate.url).href;
    candidate.evidence.push("Manual confirmation: " + explanation.trim());
    await tx.websiteDiscovery.update({
      where: { leadId },
      data: {
        status: "VERIFIED",
        selectedUrl: url,
        candidates: JSON.stringify(candidates),
        confirmedAt: new Date(),
        explanation:
          "Company association manually confirmed: " + explanation.trim(),
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: {
        website: url,
        websiteSource: `Manually confirmed candidate from ${candidate.source}`,
        websiteStatus: lead.website === url ? lead.websiteStatus : "UNVERIFIED",
        websiteVerifiedAt: lead.website === url ? lead.websiteVerifiedAt : null,
        score: lead.website === url ? lead.score : null,
        scoreAssessment:
          lead.website === url ? lead.scoreAssessment : "INSUFFICIENT",
        approvedAt: null,
        contactStatus:
          lead.contactStatus === "APPROVED"
            ? "AWAITING_REVIEW"
            : lead.contactStatus,
      },
    });
    await tx.outreachActivity.create({
      data: { leadId, kind: "WEBSITE_CONFIRMED", body: explanation.trim() },
    });
  });
}
