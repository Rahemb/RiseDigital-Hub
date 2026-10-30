import Link from "next/link";
import { notFound } from "next/navigation";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { choices, recordData, formValues } from "@/server/module-queries";
import { kindSchema, paymentSummary, label, progress } from "@/lib/business";
import { config } from "@/lib/module-config";
import { Button } from "@/components/ui/button";
import { ModuleList } from "@/components/module-list";
import {
  CommentForm,
  TransactionForm,
  StatusControl,
} from "@/components/business-forms";
import { dateLabel } from "@/lib/utils";
import { currency } from "@/server/currency";
import { DocumentList } from "@/components/documents";
export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { module, id } = await params;
  const parsed = kindSchema.safeParse(module);
  if (!parsed.success) notFound();
  const kind = parsed.data;
  const { organization, user } = await workspace();
  const money = await currency(organization.id);
  const record = await recordData(organization.id, kind, id);
  if (!record) notFound();
  const values = formValues(record);
  const opts = await choices(organization.id);
  const title =
    "name" in record
      ? record.name
      : "title" in record
        ? record.title
        : "reference" in record
          ? record.reference || "Payment obligation"
          : (opts.services.find((o) => o.value === values.serviceId)?.label ??
            "Agreement");
  const clientId = "clientId" in record ? record.clientId : undefined;
  const [activities, comments, payment, tasks] = await Promise.all([
    db.activityLog.findMany({
      where: {
        organizationId: organization.id,
        entityType: kind,
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    kind === "tasks"
      ? db.taskComment.findMany({
          where: { taskId: id },
          orderBy: { createdAt: "desc" },
        })
      : kind === "projects"
        ? db.note.findMany({
            where: { organizationId: organization.id, projectId: id },
            orderBy: { createdAt: "desc" },
          })
        : kind === "support"
          ? db.ticketComment.findMany({
              where: { ticketId: id },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
    kind === "payments"
      ? db.paymentObligation.findFirst({
          where: { id, organizationId: organization.id },
          include: { transactions: { orderBy: { paidAt: "desc" } } },
        })
      : Promise.resolve(null),
    kind === "projects"
      ? db.task.findMany({
          where: {
            organizationId: organization.id,
            projectId: id,
            archived: false,
          },
        })
      : Promise.resolve([]),
  ]);
  const summary = payment ? paymentSummary(payment) : null;
  return (
    <>
      <Link href={`/${kind}`} className="text-xs text-muted-foreground">
        ← {config[kind].title}
      </Link>
      <div className="flex justify-between gap-4 items-start my-6">
        <div>
          <p className="eyebrow mb-2">{config[kind].singular}</p>
          <h1 className="page-heading">{title}</h1>
          {clientId && (
            <Link
              href={`/clients/${clientId}`}
              className="text-blue-500 text-sm inline-block mt-2"
            >
              {opts.clients.find((c) => c.value === clientId)?.label}
            </Link>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/${kind}/${id}/edit`}>Edit {config[kind].singular}</Link>
        </Button>
      </div>
      {(await searchParams).saved && (
        <p role="status" className="text-emerald-600 mb-5">
          Saved successfully.
        </p>
      )}
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="font-semibold mb-5">Details</h2>
            <dl className="grid sm:grid-cols-2 gap-5">
              {config[kind].fields
                .filter(
                  (f) =>
                    values[f.name] &&
                    !["name", "title", "clientId"].includes(f.name),
                )
                .map((f) => (
                  <div
                    key={f.name}
                    className={f.type === "textarea" ? "sm:col-span-2" : ""}
                  >
                    <dt className="text-xs text-muted-foreground mb-1">
                      {f.label}
                    </dt>
                    <dd className="text-sm whitespace-pre-wrap break-words">
                      {f.source
                        ? (opts[f.source].find(
                            (o) => o.value === values[f.name],
                          )?.label ?? "—")
                        : f.options
                          ? f.options.find((o) => o.value === values[f.name])
                              ?.label
                          : values[f.name]}
                    </dd>
                  </div>
                ))}
            </dl>
            {kind === "projects" && (
              <div className="mt-6">
                <p className="text-sm">
                  Task progress: {progress(tasks)}% ·{" "}
                  {tasks.filter((t) => t.status === "COMPLETED").length}/
                  {tasks.length} completed
                </p>
                <progress
                  className="w-full h-2 mt-3 accent-blue-600"
                  max={100}
                  value={progress(tasks)}
                />
                {!tasks.length && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No tasks yet. Progress is 0% until tasks are completed.
                  </p>
                )}
              </div>
            )}
            {(kind === "tasks" || kind === "projects") &&
              "status" in record && (
                <div className="mt-6">
                  <StatusControl
                    kind={kind}
                    id={id}
                    status={record.status}
                    statuses={config[kind].statuses!}
                  />
                </div>
              )}
          </section>
          {payment && summary && (
            <>
              <section className="panel p-6">
                <div className="grid sm:grid-cols-3 gap-5">
                  {[
                    ["Expected", money(payment.amountOre)],
                    ["Received", money(summary.received)],
                    ["Outstanding", money(summary.outstanding)],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs text-muted-foreground">{l}</p>
                      <p className="text-xl font-semibold mt-2">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="badge mt-5">{label(summary.status)}</p>
              </section>
              {summary.outstanding > 0 && (
                <TransactionForm id={id} outstanding={summary.outstanding} />
              )}
              <section className="panel p-6">
                <h2 className="font-semibold mb-4">Payment history</h2>
                {payment.transactions.length ? (
                  payment.transactions.map((t) => (
                    <div key={t.id} className="py-4 border-t border-border">
                      <p>
                        {money(t.amountOre)} · {dateLabel(t.paidAt)} ·{" "}
                        {label(t.method)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.reference} {t.notes}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No money received yet.
                  </p>
                )}
              </section>
            </>
          )}
          {["tasks", "projects", "support"].includes(kind) && (
            <>
              <CommentForm kind={kind} id={id} />
              {comments.map((c) => (
                <article className="panel p-5" key={c.id}>
                  <p className="text-xs text-muted-foreground mb-3">
                    {dateLabel(c.createdAt)}
                    {"authorName" in c ? ` · ${c.authorName}` : ""}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-7">
                    {c.body}
                  </p>
                </article>
              ))}
            </>
          )}
        </div>
        <aside className="panel p-6 h-fit">
          <h2 className="font-semibold mb-4">Record history</h2>
          {activities.length ? (
            activities.map((a) => (
              <div key={a.id} className="py-3 border-b border-border">
                <p className="text-sm">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateLabel(a.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No changes recorded.
            </p>
          )}
        </aside>
      </div>
      {kind === "projects" && (
        <div className="mt-8">
          <ModuleList
            organizationId={organization.id}
            kind="tasks"
            clientId={clientId}
            projectId={id}
            userId={user.id}
          />
        </div>
      )}
      {kind === "agreements" && (
        <div className="mt-8">
          <ModuleList
            organizationId={organization.id}
            kind="payments"
            clientId={clientId}
            filters={{ agreementId: id }}
          />
        </div>
      )}
      {kind === "services" && (
        <div className="mt-8">
          <ModuleList
            organizationId={organization.id}
            kind="agreements"
            filters={{ serviceId: id }}
          />
        </div>
      )}
      {(kind === "projects" || kind === "support") && clientId && (
        <div className="mt-8">
          <DocumentList
            organizationId={organization.id}
            clientId={clientId}
            projectId={kind === "projects" ? id : undefined}
            ticketId={kind === "support" ? id : undefined}
          />
        </div>
      )}
    </>
  );
}
