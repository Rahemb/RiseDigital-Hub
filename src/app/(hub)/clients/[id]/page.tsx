import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Globe, Mail, Phone, MapPin } from "lucide-react";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { dateLabel } from "@/lib/utils";
import { currency } from "@/server/currency";
import { ModuleList, type Filters } from "@/components/module-list";
import { DocumentList } from "@/components/documents";
import { PaymentHistory } from "@/components/payment-history";
import type { Kind } from "@/lib/business";
const linkedTabs: Record<string, Kind> = {
  Projects: "projects",
  Services: "agreements",
  Tasks: "tasks",
  Payments: "payments",
  Support: "support",
  "Follow-ups": "reminders",
};
import { NoteForm, DeleteClient } from "@/components/client-actions";
import { Button } from "@/components/ui/button";
const tabs = [
  "Overview",
  "Projects",
  "Services",
  "Tasks",
  "Payments",
  "Documents",
  "Support",
  "Follow-ups",
  "Notes",
  "Activity",
];
export default async function ClientProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Filters & { tab?: string }>;
}) {
  const { organization, user } = await workspace();
  const money = await currency(organization.id);
  const { id } = await params;
  const filters = await searchParams;
  const { tab: requested } = filters;
  const tab = tabs.includes(requested ?? "") ? requested! : "Overview";
  const c = await db.client.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      projects: true,
      tasks: true,
      agreements: { include: { service: true } },
      obligations: { include: { transactions: true } },
      documents: true,
      reminders: { where: { completedAt: null }, orderBy: { dueDate: "asc" } },
      tickets: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } },
      notes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!c) notFound();
  const outstanding = c.obligations
    .filter((p) => !p.cancelled)
    .reduce(
      (a, p) =>
        a +
        Math.max(
          0,
          p.amountOre - p.transactions.reduce((s, t) => s + t.amountOre, 0),
        ),
      0,
    );
  const next = c.obligations
    .filter(
      (p) =>
        !p.cancelled &&
        p.amountOre > p.transactions.reduce((s, t) => s + t.amountOre, 0),
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  return (
    <>
      <Link
        href="/clients"
        className="inline-flex gap-2 items-center text-xs text-muted-foreground mb-6"
      >
        <ArrowLeft size={14} />
        All clients
      </Link>
      <div className="flex justify-between items-start gap-4 mb-7">
        <div className="flex gap-4 items-center">
          <span className="avatar w-14 h-14 text-xl">
            {c.companyName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="page-heading">{c.companyName}</h1>
            <div className="flex gap-3 items-center mt-2">
              <span className={`badge ${c.status}`}>
                {c.status.replaceAll("_", " ")}
              </span>
              <span className="text-xs text-muted-foreground">
                Client since {dateLabel(c.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clients/${id}/edit`}>
            <Pencil size={14} />
            Edit client
          </Link>
        </Button>
      </div>
      <div className="border-b border-border flex gap-7 overflow-x-auto mb-7">
        {tabs.map((t) => (
          <Link
            key={t}
            className={`tab ${tab === t ? "selected" : ""}`}
            href={`/clients/${id}?tab=${t}`}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === "Overview" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                [
                  "Open projects",
                  c.projects.filter(
                    (p) =>
                      !p.archived &&
                      !["COMPLETED", "CANCELLED"].includes(p.status),
                  ).length,
                ],
                [
                  "Pending tasks",
                  c.tasks.filter((t) => !t.archived && t.status !== "COMPLETED")
                    .length,
                ],
                ["Outstanding", money(outstanding)],
              ].map(([l, v]) => (
                <div key={l} className="panel p-5">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-2xl font-semibold mt-3">{v}</p>
                </div>
              ))}
            </div>
            <section className="panel p-6">
              <h2 className="font-semibold mb-3">Client overview</h2>
              <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                {c.summary ||
                  "Add an overview to capture the relationship, goals, and next steps."}
              </p>
              <div className="flex gap-2 mt-5 flex-wrap">
                {c.tags
                  .split(",")
                  .filter(Boolean)
                  .map((t, i) => (
                    <span className="badge" key={i}>
                      {t.trim()}
                    </span>
                  ))}
              </div>
            </section>
            <section className="panel p-6">
              <h2 className="font-semibold mb-4">At a glance</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  {c.agreements.filter((a) => a.active).length} active service
                  agreements
                </p>
                <p>
                  Next payment:{" "}
                  {next
                    ? `${money(next.amountOre)} · ${dateLabel(next.dueDate)}`
                    : "No upcoming payment obligations"}
                </p>
                <p>
                  {c.tasks.filter((t) => t.status === "COMPLETED").length} tasks
                  completed
                </p>
                <p>{c.tickets.length} open support tickets</p>
                <p>
                  Next follow-up:{" "}
                  {c.reminders[0]
                    ? `${c.reminders[0].title} · ${dateLabel(c.reminders[0].dueDate)}`
                    : "None scheduled"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                {(
                  [
                    "projects",
                    "tasks",
                    "agreements",
                    "payments",
                    "reminders",
                    "support",
                  ] as const
                ).map((kind) => (
                  <Button key={kind} asChild variant="outline">
                    <Link href={`/${kind}/new?clientId=${id}`}>
                      Add{" "}
                      {kind === "agreements"
                        ? "service"
                        : kind === "reminders"
                          ? "follow-up"
                          : kind === "support"
                            ? "ticket"
                            : kind.slice(0, -1)}
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          </div>
          <aside className="panel p-6 h-fit">
            <h2 className="font-semibold mb-5">Contact information</h2>
            <p className="font-medium text-sm mb-4">{c.contactPerson}</p>
            <div className="space-y-5 text-xs text-muted-foreground break-words">
              <p className="flex gap-3">
                <Mail size={15} className="shrink-0" />
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </p>
              {c.phone && (
                <p className="flex gap-3">
                  <Phone size={15} />
                  {c.phone}
                </p>
              )}
              {c.website && (
                <p className="flex gap-3">
                  <Globe size={15} className="shrink-0" />
                  <a target="_blank" rel="noopener noreferrer" href={c.website}>
                    {c.website}
                  </a>
                </p>
              )}
              {c.address && (
                <p className="flex gap-3">
                  <MapPin size={15} className="shrink-0" />
                  {c.address}
                </p>
              )}
              {c.organizationNumber && <p>Org. no. {c.organizationNumber}</p>}
            </div>
          </aside>
        </div>
      ) : tab === "Notes" ? (
        <div className="max-w-4xl">
          <NoteForm id={id} />
          {c.notes.map((n) => (
            <article className="panel p-5 mb-4" key={n.id}>
              <p className="text-xs text-muted-foreground mb-3">
                {dateLabel(n.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{n.body}</p>
            </article>
          ))}
        </div>
      ) : tab === "Activity" ? (
        <section className="panel p-6 space-y-5">
          {c.activities.map((a) => (
            <div key={a.id}>
              <p className="text-sm">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {dateLabel(a.createdAt)}
              </p>
            </div>
          ))}
        </section>
      ) : tab === "Documents" ? (
        <DocumentList
          organizationId={organization.id}
          clientId={id}
          q={filters.q}
        />
      ) : linkedTabs[tab] ? (
        <ModuleList
          organizationId={organization.id}
          userId={user.id}
          clientId={id}
          kind={linkedTabs[tab]}
          filters={filters}
        />
      ) : null}
      <DeleteClient id={id} />
      {tab === "Payments" && (
        <PaymentHistory organizationId={organization.id} clientId={id} />
      )}
    </>
  );
}
