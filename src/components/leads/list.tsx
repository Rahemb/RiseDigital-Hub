import { GoogleSearch } from "./google-search";
import { leadSystemText } from "@/lib/lead-legacy-text";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { workspace } from "@/server/auth";
import { contactLabels, qualificationLabels, websiteLabels } from "@/lib/leads";
import { getConfig, auditCutoff } from "@/server/leads/service";
import type { AuditData } from "@/server/leads/audit";
import { discoveryLabels } from "@/lib/website-discovery";
import { LeadSelection } from "./lead-selection";
type Params = Record<string, string | string[] | undefined>;
export async function LeadList({
  params,
  outreach = false,
  compact = false,
}: {
  params: Params;
  outreach?: boolean;
  compact?: boolean;
}) {
  const { organization } = await workspace();
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const q = value("q").slice(0, 180),
    status = value("status"),
    qualification = value("qualification"),
    website = value("website"),
    municipality = value("municipality").slice(0, 100);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(value("page"))) || 1),
  );
  const config = await getConfig(db, organization.id);
  const fresh = auditCutoff(config.auditDays);
  const where: Prisma.LeadWhereInput = {
    organizationId: organization.id,
    ...(value("ids")
      ? { id: { in: value("ids").split(",").slice(0, 500) } }
      : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { orgNumber: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {}),
    ...(status in contactLabels ? { contactStatus: status } : {}),
    ...(qualification in qualificationLabels ? { qualification } : {}),
    ...(website in websiteLabels ? { websiteStatus: website } : {}),
    ...(municipality ? { municipality: { contains: municipality } } : {}),
    ...(value("due") === "1" ? { followUpAt: { lte: new Date() } } : {}),
    ...(value("discovery") === "PENDING"
      ? {
          OR: undefined,
          websiteStatus: { not: "NO_WEBSITE" },
          AND: [
            ...(q
              ? [
                  {
                    OR: [
                      { companyName: { contains: q } },
                      { orgNumber: { contains: q } },
                      { tags: { contains: q } },
                    ],
                  },
                ]
              : []),
            {
              OR: [
                { discovery: { is: null } },
                { discovery: { is: { status: "PENDING" } } },
              ],
            },
          ],
        }
      : Object.hasOwn(discoveryLabels, value("discovery"))
        ? { discovery: { is: { status: value("discovery") } } }
        : {}),
    ...(value("audited") === "1"
      ? { websiteStatus: "VERIFIED", websiteVerifiedAt: { gte: fresh } }
      : {}),
  };
  const orderBy: Prisma.LeadOrderByWithRelationInput =
    value("sort") === "name"
      ? { companyName: "asc" }
      : value("sort") === "score"
        ? { score: "desc" }
        : value("sort") === "followup"
          ? { followUpAt: "asc" }
          : { discoveredAt: "desc" };
  const [total, leads, all, activity] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      include: { discovery: { select: { status: true } } },
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * 25,
      take: 25,
    }),
    db.lead.groupBy({
      by: ["qualification", "contactStatus", "websiteStatus"],
      where: { organizationId: organization.id },
      _count: true,
    }),
    db.outreachActivity.findMany({
      where: { lead: { organizationId: organization.id } },
      include: { lead: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const count = (fn: (r: (typeof all)[number]) => boolean) =>
    all.filter(fn).reduce((n, r) => n + r._count, 0);
  const auditedLeads = await db.lead.findMany({
    where: {
      organizationId: organization.id,
      websiteStatus: "VERIFIED",
      websiteVerifiedAt: { gte: fresh },
    },
    select: {
      website: true,
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { url: true, status: true, findings: true },
      },
    },
  });
  const opportunities = auditedLeads.filter((l) => {
    const a = l.audits[0];
    return (
      a?.status === "SUCCESS" &&
      a.url === l.website &&
      (JSON.parse(a.findings) as AuditData).findings.some(
        (f) =>
          f.kind === "VERIFIED" &&
          [
            "title",
            "description",
            "viewport",
            "alt",
            "heading",
            "https",
            "language",
          ].includes(f.key),
      )
    );
  }).length;
  const metrics = [
    ["Total leads", count(() => true)],
    ["New leads", count((r) => r.qualification === "NEW")],
    ["Qualified leads", count((r) => r.qualification === "QUALIFIED")],
    [
      "Reviewing",
      count(
        (r) =>
          r.qualification === "REVIEW" || r.contactStatus === "AWAITING_REVIEW",
      ),
    ],
    ["Contacted", count((r) => r.contactStatus === "CONTACTED")],
    ["Interested", count((r) => r.contactStatus === "INTERESTED")],
    [
      "Not a fit",
      count(
        (r) =>
          r.qualification === "REJECTED" ||
          r.contactStatus === "NOT_INTERESTED",
      ),
    ],
    ["Converted", count((r) => r.contactStatus === "CONVERTED")],
    ["No website · confirmed", count((r) => r.websiteStatus === "NO_WEBSITE")],
    ["Potential website improvements", opportunities],
  ];
  const discoveryCounts = await db.websiteDiscovery.groupBy({
    by: ["status"],
    where: { lead: { organizationId: organization.id } },
    _count: true,
  });
  const discoveryCount = (status: string) =>
    discoveryCounts.find((r) => r.status === status)?._count ?? 0;
  const notSearched = await db.lead.count({
    where: {
      organizationId: organization.id,
      websiteStatus: { not: "NO_WEBSITE" },
      OR: [
        { discovery: { is: null } },
        { discovery: { is: { status: "PENDING" } } },
      ],
    },
  });
  function url(next: number) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (typeof v === "string") p.set(k, v);
    p.set("page", String(next));
    return `${outreach ? "/leads/outreach" : compact ? "/leads/list" : "/leads"}?${p}`;
  }
  return (
    <>
      {!compact && !outreach && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {metrics
            .filter(([label]) =>
              [
                "Total leads",
                "New leads",
                "Qualified leads",
                "Contacted",
                "Interested",
              ].includes(String(label)),
            )
            .map(([label, n]) => (
              <div key={label} className="panel p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold mt-2">{n}</p>
              </div>
            ))}
        </div>
      )}
      <details className="text-sm">
        <summary className="text-muted-foreground">
          Advanced website statistics
        </summary>
        <Link
          className="text-sm text-primary underline"
          href="/leads?discovery=VERIFIED&audited=1&sort=score"
        >
          Prioritize verified websites by current opportunity score →
        </Link>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            ["Awaiting website discovery", notSearched, "PENDING"],
            ["Verified websites", discoveryCount("VERIFIED"), "VERIFIED"],
            [
              "Possible website matches",
              discoveryCount("POSSIBLE"),
              "POSSIBLE",
            ],
            ["No verified website found", discoveryCount("NONE"), "NONE"],
            ["Successful current audit", auditedLeads.length, "AUDITED"],
          ].map(([label, n, status]) => (
            <Link
              key={label}
              className="panel p-4 hover:border-primary"
              href={
                status === "AUDITED"
                  ? "/leads?audited=1&sort=score"
                  : `/leads?discovery=${status}`
              }
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold mt-2">{n}</p>
            </Link>
          ))}
        </div>
      </details>
      <section className="panel p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="font-semibold">
            {outreach ? "Outreach and follow-ups" : "All leads"} · {total}
          </h2>
          <a
            className="text-sm text-primary underline"
            href="/api/leads/export"
            download
          >
            Export CSV
          </a>
        </div>
        <form className="flex flex-wrap items-end gap-3">
          {value("ids") && (
            <input type="hidden" name="ids" value={value("ids")} />
          )}
          <details className="text-sm">
            <summary>Advanced filters</summary>
            <div className="flex flex-wrap items-end gap-3 mt-3">
              <label className="text-sm">
                Website discovery
                <select
                  name="discovery"
                  defaultValue={value("discovery")}
                  className="field block"
                >
                  <option value="">All</option>
                  {Object.entries(discoveryLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <input
                  type="checkbox"
                  name="audited"
                  value="1"
                  defaultChecked={value("audited") === "1"}
                />{" "}
                Successful current audit
              </label>
            </div>
          </details>
          <label className="text-sm">
            Search
            <input
              name="q"
              defaultValue={q}
              className="field block"
              placeholder="Name, organization number or tag"
            />
          </label>
          <label className="text-sm">
            Contact status
            <select name="status" defaultValue={status} className="field block">
              <option value="">All</option>
              {Object.entries(contactLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Qualification
            <select
              name="qualification"
              defaultValue={qualification}
              className="field block"
            >
              <option value="">All</option>
              {Object.entries(qualificationLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Website
            <select
              name="website"
              defaultValue={website}
              className="field block"
            >
              <option value="">All</option>
              {Object.entries(websiteLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Municipality
            <input
              name="municipality"
              defaultValue={municipality}
              className="field block"
            />
          </label>
          <label className="text-sm">
            Sort
            <select
              name="sort"
              defaultValue={value("sort")}
              className="field block"
            >
              <option value="">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="score">Highest score</option>
              <option value="followup">Follow-up</option>
            </select>
          </label>
          <label className="text-sm">
            <input
              name="due"
              value="1"
              type="checkbox"
              defaultChecked={value("due") === "1"}
            />{" "}
            Overdue follow-up
          </label>
          <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
            Filter
          </button>
          <Link
            href={
              outreach ? "/leads/outreach" : compact ? "/leads/list" : "/leads"
            }
            className="text-sm underline"
          >
            Reset
          </Link>
        </form>
        <LeadSelection>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  {[
                    "Select",
                    "Company",
                    "Location / industry",
                    "Qualification",
                    "Contact status",
                    "Follow-up",
                    "Research",
                  ].map((h) => (
                    <th key={h} className="text-left p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        name="ids"
                        value={l.id}
                        aria-label={`Select ${l.companyName}`}
                      />
                    </td>
                    <td className="p-3">
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/leads/${l.id}`}
                      >
                        {l.companyName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {l.orgNumber}
                      </p>
                    </td>
                    <td className="p-3">
                      {l.municipality || "Unknown"}
                      <p className="text-xs text-muted-foreground">
                        {l.industry || "Unknown industry"}
                      </p>
                    </td>
                    <td className="p-3">
                      {
                        qualificationLabels[
                          l.qualification as keyof typeof qualificationLabels
                        ]
                      }
                    </td>
                    <td className="p-3">
                      {
                        contactLabels[
                          l.contactStatus as keyof typeof contactLabels
                        ]
                      }
                    </td>
                    <td className="p-3">
                      {l.followUpAt?.toLocaleDateString("en-GB", {
                        timeZone: "Europe/Oslo",
                      }) ?? "—"}
                    </td>
                    <td className="p-3">
                      <GoogleSearch
                        companyName={l.companyName}
                        municipality={l.municipality}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LeadSelection>
        {!leads.length && (
          <p className="py-6 text-muted-foreground">
            No matching leads. Discover companies or add a lead manually.
          </p>
        )}
        <div className="flex gap-4 text-sm">
          {page > 1 && <Link href={url(page - 1)}>← Previous</Link>}
          <span>Page {page} · 25 per page</span>
          {page * 25 < total && <Link href={url(page + 1)}>Next →</Link>}
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="font-semibold mb-3">Recent activity</h2>
        {activity.length ? (
          activity.map((a) => (
            <p key={a.id} className="text-sm border-t border-border py-3">
              <Link href={`/leads/${a.leadId}`} className="text-primary">
                {a.lead.companyName}
              </Link>{" "}
              ·{" "}
              {[
                "IMPORT",
                "EDIT",
                "AUDIT",
                "DRAFT",
                "CONVERTED",
                "WEBSITE_DISCOVERY",
              ].includes(a.kind)
                ? leadSystemText(a.body)
                : a.body}
              <span className="block text-xs text-muted-foreground">
                {a.createdAt.toLocaleString("en-GB", {
                  timeZone: "Europe/Oslo",
                })}
              </span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Activity appears when you add your first lead.
          </p>
        )}
      </section>
    </>
  );
}
