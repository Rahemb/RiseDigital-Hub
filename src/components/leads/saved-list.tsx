import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { workspace } from "@/server/auth";
import { matchingClients, savedStatuses, savedStatus } from "@/lib/saved-leads";
import { GoogleSearch } from "./google-search";
import { ClientLeadAction } from "./client-action";
import { ActionForm } from "./forms";
export async function SavedList({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const { organization } = await workspace();
  const val = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const page = Math.max(1, Math.min(10000, Number.parseInt(val("page")) || 1));
  const status = val("status");
  const aliases: Record<string, string[]> = {
    NOT_CONTACTED: ["NOT_CONTACTED"],
    AWAITING_REVIEW: [
      "AWAITING_REVIEW",
      "DRAFT_READY",
      "APPROVED",
      "FOLLOW_UP",
    ],
    CONTACTED: ["CONTACTED", "REPLIED"],
    INTERESTED: ["INTERESTED"],
    NOT_INTERESTED: ["NOT_INTERESTED", "DO_NOT_CONTACT"],
  };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const where: Prisma.LeadWhereInput = {
    organizationId: organization.id,
    AND: [
      val("removed") === "1"
        ? { savedState: { is: { removedAt: { not: null } } } }
        : {
            OR: [
              { savedState: { is: null } },
              { savedState: { is: { removedAt: null } } },
            ],
          },
      ...(val("q")
        ? [
            {
              OR: [
                { companyName: { contains: val("q").slice(0, 180) } },
                { orgNumber: { contains: val("q").slice(0, 180) } },
                { municipality: { contains: val("q").slice(0, 180) } },
              ],
            },
          ]
        : []),
      ...(Object.hasOwn(aliases, status)
        ? [{ contactStatus: { in: aliases[status] } }]
        : []),
      ...(val("due") === "1"
        ? [{ followUpAt: { lt: new Date(`${today}T00:00:00Z`) } }]
        : []),
      ...(val("ids")
        ? [{ id: { in: val("ids").split(",").slice(0, 500) } }]
        : []),
    ],
  };
  const [leads, total, clients, suppressions] = await Promise.all([
    db.lead.findMany({
      where,
      include: { savedState: true },
      orderBy:
        val("sort") === "followup"
          ? [{ followUpAt: "asc" }, { id: "asc" }]
          : val("sort") === "name"
            ? [{ companyName: "asc" }, { id: "asc" }]
            : [{ discoveredAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * 25,
      take: 25,
    }),
    db.lead.count({ where }),
    db.client.findMany({
      where: { organizationId: organization.id },
      select: { id: true, companyName: true, organizationNumber: true },
    }),
    db.suppression.findMany({
      where: { organizationId: organization.id },
      select: { key: true },
    }),
  ]);
  const blocked = new Set(suppressions.map((s) => s.key));
  function url(next: number) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (typeof v === "string") q.set(k, v);
    q.set("page", String(next));
    return `/leads/list?${q}`;
  }
  return (
    <section className="panel p-5 space-y-4">
      <h2 className="font-semibold">
        Saved Leads{" "}
        <span className="text-muted-foreground font-normal">({total})</span>
      </h2>
      <form className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Search
          <input
            name="q"
            defaultValue={val("q")}
            placeholder="Company or municipality"
          />
        </label>
        <label className="text-sm">
          Status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.entries(savedStatuses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Sort
          <select name="sort" defaultValue={val("sort")}>
            <option value="">Newest first</option>
            <option value="name">Company name</option>
            <option value="followup">Follow-up date</option>
          </select>
        </label>
        <label className="text-sm">
          Show
          <select name="removed" defaultValue={val("removed")}>
            <option value="">Saved leads</option>
            <option value="1">Removed from list</option>
          </select>
        </label>
        <label className="text-sm">
          <input
            type="checkbox"
            name="due"
            value="1"
            defaultChecked={val("due") === "1"}
          />
          Overdue follow-ups
        </label>
        <button className="rounded-md bg-blue-600 text-white px-4 py-2">
          Filter
        </button>
        <Link href="/leads/list" className="text-sm underline">
          Reset
        </Link>
      </form>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-sm">
          <thead>
            <tr>
              {[
                "Company",
                "Industry",
                "Municipality",
                "Status",
                "Follow-up",
                "Actions",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const matches = matchingClients(lead, clients);
              const clientId =
                lead.clientId ?? (matches.length === 1 ? matches[0].id : null);
              const suppressed =
                lead.contactStatus === "DO_NOT_CONTACT" ||
                blocked.has(`org:${lead.orgNumber}`) ||
                blocked.has(`email:${lead.email.toLowerCase()}`);
              const due = lead.followUpAt?.toISOString().slice(0, 10);
              return (
                <tr key={lead.id}>
                  <td>
                    <Link
                      className="font-medium text-blue-600 underline"
                      href={`/leads/${lead.id}`}
                    >
                      {lead.companyName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {lead.orgNumber}
                    </p>
                  </td>
                  <td>{lead.industry || "—"}</td>
                  <td>{lead.municipality || "—"}</td>
                  <td>
                    {suppressed
                      ? "Do not contact"
                      : lead.clientId
                        ? "In Clients"
                        : savedStatuses[savedStatus(lead.contactStatus)]}
                  </td>
                  <td
                    className={
                      due && due < today
                        ? "text-amber-700 dark:text-amber-300"
                        : ""
                    }
                  >
                    {due ?? "—"}
                    {due && due < today && (
                      <span className="block text-xs">Overdue</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2 items-start">
                      <GoogleSearch
                        companyName={lead.companyName}
                        municipality={lead.municipality}
                        compact
                      />
                      <ClientLeadAction
                        id={lead.id}
                        clientId={clientId}
                        blocked={suppressed}
                      />
                      <ActionForm
                        command={
                          lead.savedState?.removedAt
                            ? "restoreSaved"
                            : "removeSaved"
                        }
                        id={lead.id}
                        label={
                          lead.savedState?.removedAt
                            ? "Save for Later"
                            : "Remove"
                        }
                        confirm={
                          lead.savedState?.removedAt
                            ? undefined
                            : "Remove from Saved Leads? History and client links will be preserved."
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!leads.length && (
        <p className="text-muted-foreground py-4">
          No matching saved leads.{" "}
          <Link href="/leads/discover" className="text-blue-600 underline">
            Discover companies
          </Link>{" "}
          to save one for later.
        </p>
      )}
      <div className="flex gap-4 text-sm">
        {page > 1 && <Link href={url(page - 1)}>Previous</Link>}
        <span>Page {page}</span>
        {page * 25 < total && <Link href={url(page + 1)}>Next</Link>}
      </div>
    </section>
  );
}
