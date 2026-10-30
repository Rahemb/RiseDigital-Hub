"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { assertOrigin, workspace } from "@/server/auth";
import { searchSchema, leadValidationMessage } from "@/lib/leads";
import {
  registrySearch,
  signCompanies,
  verifyCompanies,
} from "@/server/leads/brreg";
import { parseCsv } from "@/server/leads/csv";
import * as service from "@/server/leads/service";
import { matchingClients } from "@/lib/saved-leads";
import {
  addLeadToClients,
  saveSimpleLead,
  setSavedVisibility,
} from "@/server/leads/saved";
export type LeadResult = {
  error?: string;
  message?: string;
  id?: string;
  ids?: string[];
  clientId?: string;
};
function errorMessage(e: unknown) {
  if (e instanceof z.ZodError) return leadValidationMessage(e);
  if (e instanceof SyntaxError)
    return "Invalid JSON. Check commas, quotes and brackets.";
  if (e instanceof Error && !/prisma|sqlite|invocation/i.test(e.message))
    return e.message;
  return "Could not save. Check the fields and try again.";
}
async function context() {
  await assertOrigin();
  return (await workspace()).organization.id;
}
export async function discoverCompanies(input: unknown) {
  const organizationId = await context();
  try {
    const query = searchSchema.parse(input);
    const config = await service.reserveRequest(db, organizationId);
    const result = await registrySearch(query, config);
    const existing = query.exclude
      ? await db.lead.findMany({
          where: {
            organizationId,
            orgNumber: { in: result.companies.map((c) => c.orgNumber) },
          },
          select: { orgNumber: true },
        })
      : [];
    const companies = result.companies.filter(
      (c) => !existing.some((e) => e.orgNumber === c.orgNumber),
    );
    const clients = await db.client.findMany({
      where: { organizationId },
      select: { id: true, companyName: true, organizationNumber: true },
    });
    return {
      data: {
        ...result,
        companies: companies.map((company) => {
          const matches = matchingClients(company, clients);
          return {
            ...company,
            clientId: matches.length === 1 ? matches[0].id : null,
          };
        }),
        excluded: existing.length,
        token: signCompanies(organizationId, companies),
      },
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function importCompanies(
  token: string,
  selected: string[],
): Promise<LeadResult> {
  const organizationId = await context();
  try {
    const ids = z.array(z.string()).max(100).parse(selected);
    const rows = verifyCompanies(token, organizationId).filter((c) =>
      ids.includes(c.orgNumber),
    );
    const result = await service.importLeads(db, organizationId, "BRREG", rows);
    revalidatePath("/leads", "layout");
    return {
      message: `${result.imported} imported. ${result.skipped.join("; ")}`,
      ids: result.ids,
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function previewCsv(text: string) {
  const organizationId = await context();
  try {
    const rows = parseCsv(text);
    const result = [];
    const seen = new Set<string>();
    for (const row of rows) {
      let error = row.error;
      if (row.data) {
        if (
          seen.has(row.data.orgNumber) ||
          (await db.lead.findUnique({
            where: {
              organizationId_orgNumber: {
                organizationId,
                orgNumber: row.data.orgNumber,
              },
            },
          }))
        )
          error = "Already exists / duplicate";
        if (await service.isSuppressed(db, organizationId, row.data))
          error = "Do-not-contact restriction: import blocked";
        seen.add(row.data.orgNumber);
      }
      result.push({ ...row, error });
    }
    return { rows: result };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function importCsv(text: string): Promise<LeadResult> {
  const organizationId = await context();
  try {
    const rows = parseCsv(text);
    const valid = rows.filter((r) => r.data && !r.error).map((r) => r.data!);
    const result = await service.importLeads(db, organizationId, "CSV", valid);
    revalidatePath("/leads", "layout");
    return {
      message: `${result.imported} imported. ${rows.length - valid.length} invalid rows. ${result.skipped.join("; ")}`,
      ids: result.ids,
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function leadCommand(
  command: string,
  id: string,
  _previous: LeadResult,
  form: FormData,
): Promise<LeadResult> {
  const organizationId = await context();
  try {
    const data = Object.fromEntries(form);
    let message = "Saved";
    let resultId: string | undefined;
    switch (command) {
      case "saveSimple":
        await saveSimpleLead(db, organizationId, id, data);
        break;
      case "addClient": {
        const clientId = await addLeadToClients(db, organizationId, id);
        revalidatePath("/leads", "layout");
        revalidatePath("/clients");
        revalidatePath("/");
        return {
          message:
            "Available in Clients. Existing client data was not changed.",
          clientId,
        };
      }
      case "removeSaved":
        await setSavedVisibility(db, organizationId, id, true);
        message =
          "Removed from Saved Leads. Records and history are preserved.";
        break;
      case "restoreSaved":
        await setSavedVisibility(db, organizationId, id, false);
        message = "Saved for later";
        break;
      case "create": {
        const result = await service.importLeads(db, organizationId, "MANUAL", [
          data as never,
        ]);
        resultId = result.ids[0];
        message = `${result.imported} added. ${result.skipped.join("; ")}`;
        break;
      }
      case "edit":
        await service.editLead(db, organizationId, id, {
          ...data,
          noWebsite: form.has("noWebsite"),
        });
        break;
      case "audit":
        await service.auditLead(db, organizationId, id);
        message = "Website checked and assessment saved";
        break;
      case "draft":
        await service.saveDraft(db, organizationId, id, {
          template: String(data.template),
        });
        message = "Draft created. Review it before contact.";
        break;
      case "saveDraft":
        await service.saveDraft(db, organizationId, id, {
          template: String(data.template),
          subject: String(data.subject),
          body: String(data.body),
        });
        break;
      case "outreach":
        await service.outreach(db, organizationId, id, {
          ...data,
          recipientReviewed: form.has("recipientReviewed"),
          legalReviewed: form.has("legalReviewed"),
          providerReviewed: form.has("providerReviewed"),
        });
        break;
      case "convert":
        resultId = await service.convertLead(db, organizationId, id, data);
        message = "Linked to client records";
        break;
      case "settings":
        await service.saveConfig(
          db,
          organizationId,
          JSON.parse(String(data.config)),
        );
        message = "Settings saved. Run a new audit to update scores.";
        break;
      default:
        throw new Error("Unknown action");
    }
    revalidatePath("/leads", "layout");
    if (command === "convert") {
      revalidatePath("/clients");
      revalidatePath("/");
    }
    return { message, id: resultId };
  } catch (e) {
    revalidatePath("/leads", "layout");
    return { error: errorMessage(e) };
  }
}
export async function researchCompany(
  token: string,
  orgNumber: string,
  mode: "save" | "client",
): Promise<LeadResult> {
  const organizationId = await context();
  try {
    z.enum(["save", "client"]).parse(mode);
    const company = verifyCompanies(token, organizationId).find(
      (c) => c.orgNumber === orgNumber,
    );
    if (!company)
      throw new Error("Company not found in this preview. Search again.");
    if (await service.isSuppressed(db, organizationId, company))
      throw new Error(
        "Do-not-contact restriction: this company cannot be imported.",
      );
    let lead = await db.lead.findUnique({
      where: { organizationId_orgNumber: { organizationId, orgNumber } },
    });
    if (!lead) {
      await service.importLeads(db, organizationId, "BRREG", [company]);
      lead = await db.lead.findUniqueOrThrow({
        where: { organizationId_orgNumber: { organizationId, orgNumber } },
      });
    }
    if (mode === "client") {
      const clientId = await addLeadToClients(db, organizationId, lead.id);
      revalidatePath("/clients");
      revalidatePath("/");
      revalidatePath("/leads", "layout");
      return { clientId, message: "Available in Clients" };
    }
    await setSavedVisibility(db, organizationId, lead.id, false);
    revalidatePath("/leads", "layout");
    return { id: lead.id, message: "Saved for later" };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function prepareHandoff(id: string) {
  const organizationId = await context();
  try {
    return { data: await service.handoff(db, organizationId, id) };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
