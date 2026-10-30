import Link from "next/link";
import { config } from "@/lib/module-config";
import { type Kind, dateKey, label, shiftDate } from "@/lib/business";
import { moduleRows } from "@/server/module-queries";
import { dateLabel } from "@/lib/utils";
import { currency } from "@/server/currency";
import { Button } from "./ui/button";
import { StatusControl, GenerateForm } from "./business-forms";
export type Filters = {
  q?: string;
  status?: string;
  view?: string;
  due?: string;
  archived?: string;
  clientId?: string;
  projectId?: string;
  page?: string;
  serviceId?: string;
  agreementId?: string;
};
export async function ModuleList({
  organizationId,
  kind,
  filters = {},
  clientId: providedClientId,
  projectId: providedProjectId,
  userId,
}: {
  organizationId: string;
  kind: Kind;
  filters?: Filters;
  clientId?: string;
  projectId?: string;
  userId?: string;
}) {
  const cfg = config[kind];
  const money = await currency(organizationId);
  const clientId = providedClientId ?? filters.clientId;
  const projectId = providedProjectId ?? filters.projectId;
  const q = (filters.q ?? "").toLowerCase();
  const today = dateKey();
  let rows = await moduleRows(
    organizationId,
    kind,
    clientId ?? filters.clientId,
    projectId ?? filters.projectId,
    filters,
  );
  rows = rows.filter(
    (r) =>
      (!q ||
        `${r.title} ${r.clientName ?? ""} ${r.subtitle ?? ""}`
          .toLowerCase()
          .includes(q)) &&
      (!filters.status || r.status === filters.status) &&
      (filters.archived === "all" || !r.archived),
  );
  if (filters.due)
    rows = rows.filter((r) =>
      filters.due === "mine"
        ? r.assigneeId === userId
        : filters.due === "completed"
          ? ["COMPLETED", "PAID", "RESOLVED", "CLOSED"].includes(r.status)
          : r.dueDate &&
            !["COMPLETED", "PAID", "CANCELLED", "RESOLVED", "CLOSED"].includes(
              r.status,
            ) &&
            (filters.due === "overdue"
              ? dateKey(r.dueDate) < today
              : filters.due === "today"
                ? dateKey(r.dueDate) === today
                : dateKey(r.dueDate) > today &&
                  dateKey(r.dueDate) <= shiftDate(today, 30)),
    );
  const query = new URLSearchParams({
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.agreementId ? { agreementId: filters.agreementId } : {}),
  }).toString();
  const board =
    filters.view === "board" && ["projects", "tasks"].includes(kind);
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const count = rows.length;
  const displayed = board ? rows : rows.slice((page - 1) * 25, page * 25);
  const statuses = cfg.statuses ?? ["ACTIVE", "INACTIVE"];
  const pageUrl = (number: number) =>
    `/${kind}?${new URLSearchParams({ ...filters, ...(clientId ? { clientId } : {}), ...(projectId ? { projectId } : {}), page: String(number) })}`;
  return (
    <section>
      <div className="flex flex-wrap justify-between gap-4 items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold">{cfg.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {count} records · {cfg.description}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {kind === "services" && (
            <Button asChild variant="outline">
              <Link href="/agreements">Client agreements</Link>
            </Button>
          )}
          {kind === "agreements" && (
            <Button asChild variant="outline">
              <Link href="/services">Service catalog</Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/${kind}/new${query ? "?" + query : ""}`}>
              New {cfg.singular}
            </Link>
          </Button>
        </div>
      </div>
      {kind === "payments" && <GenerateForm />}
      {kind === "payments" && (
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {[
            [
              "Expected (filtered)",
              rows
                .filter((r) => r.status !== "CANCELLED")
                .reduce((a, r) => a + (r.amount ?? 0), 0),
            ],
            [
              "Received on these obligations",
              rows.reduce((a, r) => a + (r.received ?? 0), 0),
            ],
            ["Outstanding", rows.reduce((a, r) => a + (r.outstanding ?? 0), 0)],
          ].map(([title, value]) => (
            <div className="panel p-5" key={String(title)}>
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="text-xl font-semibold mt-2">
                {money(Number(value))}
              </p>
            </div>
          ))}
        </div>
      )}
      <form action={`/${kind}`} className="panel p-4 flex flex-wrap gap-3 mb-5">
        {clientId && <input type="hidden" name="clientId" value={clientId} />}
        {projectId && (
          <input type="hidden" name="projectId" value={projectId} />
        )}
        {filters.serviceId && (
          <input type="hidden" name="serviceId" value={filters.serviceId} />
        )}
        {filters.agreementId && (
          <input type="hidden" name="agreementId" value={filters.agreementId} />
        )}
        <input
          name="q"
          aria-label="Search records"
          placeholder="Search records…"
          defaultValue={filters.q}
          className="flex-1 min-w-40"
        />
        <select
          name="status"
          aria-label="Filter status"
          defaultValue={filters.status ?? ""}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        {["projects", "tasks", "support", "payments", "reminders"].includes(
          kind,
        ) && (
          <select
            name="due"
            aria-label="Deadline filter"
            defaultValue={filters.due ?? ""}
            className="w-auto"
          >
            <option value="">All dates</option>
            <option value="today">Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Next 30 days</option>
            <option value="completed">Completed / paid</option>
            {kind === "tasks" && <option value="mine">My tasks</option>}
          </select>
        )}
        {["projects", "tasks"].includes(kind) && (
          <>
            <select
              name="view"
              aria-label="View"
              defaultValue={filters.view ?? "list"}
              className="w-auto"
            >
              <option value="list">List</option>
              <option value="board">Kanban</option>
            </select>
            <select
              name="archived"
              aria-label="Archived records"
              defaultValue={filters.archived ?? ""}
              className="w-auto"
            >
              <option value="">Current records</option>
              <option value="all">Include archived</option>
            </select>
          </>
        )}
        <Button variant="outline">Apply</Button>
      </form>
      {board ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => (
            <div
              key={status}
              className="bg-muted/70 rounded-xl p-3 w-64 shrink-0"
            >
              <h3 className="font-semibold text-xs mb-4">
                {label(status)} ·{" "}
                {rows.filter((r) => r.status === status).length}
              </h3>
              <div className="space-y-3">
                {rows
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <article className="panel p-4" key={r.id}>
                      <Link className="font-medium" href={`/${kind}/${r.id}`}>
                        {r.title}
                      </Link>
                      <p className="text-xs text-muted-foreground my-3">
                        {r.clientName}
                      </p>
                      <StatusControl
                        kind={kind}
                        id={r.id}
                        status={r.status}
                        statuses={statuses}
                      />
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {displayed.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Due / next date</th>
                    <th>
                      {kind === "projects"
                        ? "Progress"
                        : kind === "payments"
                          ? "Outstanding"
                          : kind === "services" || kind === "agreements"
                            ? "Price"
                            : "Priority"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          className="font-semibold text-blue-600 dark:text-blue-400"
                          href={`/${kind}/${r.id}`}
                        >
                          {r.title}
                        </Link>
                        <p className="text-muted-foreground text-xs mt-1">
                          {r.subtitle}
                          {r.archived ? " · Archived" : ""}
                        </p>
                      </td>
                      <td>
                        {r.clientId ? (
                          <Link href={`/clients/${r.clientId}`}>
                            {r.clientName}
                          </Link>
                        ) : (
                          "Agency"
                        )}
                      </td>
                      <td>
                        <span className={`badge ${r.status}`}>
                          {label(r.status)}
                        </span>
                      </td>
                      <td
                        className={
                          r.dueDate &&
                          dateKey(r.dueDate) < today &&
                          ![
                            "COMPLETED",
                            "PAID",
                            "CANCELLED",
                            "RESOLVED",
                            "CLOSED",
                          ].includes(r.status)
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {r.dueDate ? dateLabel(r.dueDate) : "—"}
                      </td>
                      <td>
                        {r.progress !== undefined ? (
                          <div>
                            <span>{r.progress}%</span>
                            <progress
                              value={r.progress}
                              max={100}
                              className="block w-24 mt-2 h-1.5 accent-blue-600"
                            />
                          </div>
                        ) : r.outstanding !== undefined ? (
                          money(r.outstanding)
                        ) : r.amount !== undefined ? (
                          money(r.amount)
                        ) : (
                          label(r.priority ?? "—")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              No matching records. Add a {cfg.singular} or adjust your filters.
            </div>
          )}
          <div className="p-4 text-xs text-muted-foreground flex justify-between">
            <span>
              Page {page} · {count} records
            </span>
            <div className="flex gap-4">
              {page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}
              {page * 25 < count && <Link href={pageUrl(page + 1)}>Next</Link>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
