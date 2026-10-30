import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { reportData } from "@/server/analytics";
import { day, dateKey, label } from "@/lib/business";
import { currency } from "@/server/currency";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/report-charts";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { organization } = await workspace();
  const money = await currency(organization.id);
  const q = await searchParams;
  let from = day.safeParse(q.from).success
    ? q.from!
    : dateKey().slice(0, 4) + "-01-01";
  let to = day.safeParse(q.to).success ? q.to! : dateKey();
  if (from > to) [from, to] = [to, from];
  const r = await reportData(db, organization.id, from, to);
  return (
    <>
      <h1 className="page-heading">Reports</h1>
      <p className="text-muted-foreground mt-2 mb-7">
        A clear view of your agency, built from your actual records.
      </p>
      <form className="panel p-4 flex flex-wrap gap-4 items-end mb-6">
        <label className="field">
          From
          <input type="date" name="from" defaultValue={from} required />
        </label>
        <label className="field">
          Through
          <input type="date" name="to" defaultValue={to} required />
        </label>
        <Button>Update reports</Button>
      </form>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          ["Expected revenue", money(r.expected)],
          ["Received payments", money(r.received)],
          ["Outstanding in period", money(r.outstanding)],
          ["Tasks completed in period", r.completedTasks],
          ["Active clients now", r.activeClients],
          ["Overdue tasks now", r.overdueTasks],
          ["Open support now", r.openSupport],
          ["New tickets in period", r.newSupport],
        ].map(([l, v]) => (
          <div key={l} className="panel p-5">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-semibold mt-3">{v}</p>
          </div>
        ))}
      </div>
      <section className="panel p-6 mb-6">
        <h2 className="font-semibold mb-5">Expected vs received · NOK</h2>
        <RevenueChart data={r.monthly} />
        <p className="text-xs text-muted-foreground mt-4">
          Expected: obligations due in the selected period. Received:
          transaction payment dates in the period. Outstanding: current unpaid
          balances on obligations due in the period. Client, project, and
          overdue totals are current snapshots.
        </p>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer">View chart data</summary>
          <table className="data-table mt-3">
            <thead>
              <tr>
                <th>Month</th>
                <th>Expected</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {r.monthly.map((m) => (
                <tr key={m.name}>
                  <td>{m.name}</td>
                  <td>{money(Math.round(m.expected * 100))}</td>
                  <td>{money(Math.round(m.received * 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <div className="grid lg:grid-cols-2 gap-6">
        {[
          ["Received revenue by client", r.byClient],
          ["Received revenue by service", r.byService],
        ].map(([title, rows]) => (
          <section className="panel p-6" key={String(title)}>
            <h2 className="font-semibold mb-4">{String(title)}</h2>
            {(rows as typeof r.byClient).length ? (
              (rows as typeof r.byClient).map((v, i) => (
                <div
                  className="flex justify-between gap-5 py-3 border-t border-border text-sm"
                  key={i}
                >
                  <span>{v.name}</span>
                  <span>{money(v.ore)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No received payments in this period.
              </p>
            )}
          </section>
        ))}
        <section className="panel p-6">
          <h2 className="font-semibold mb-4">Projects by status · current</h2>
          {r.projectsByStatus.map((s) => (
            <div
              className="flex justify-between py-3 text-sm border-t border-border"
              key={s.name}
            >
              <span>{label(s.name)}</span>
              <span>{s.value}</span>
            </div>
          ))}
          {!r.projectsByStatus.length && (
            <p className="text-sm text-muted-foreground">
              No current projects.
            </p>
          )}
        </section>
        <section className="panel p-6">
          <h2 className="font-semibold mb-4">Client pipeline</h2>
          <p className="text-sm text-muted-foreground">
            {r.leads} leads · {r.activeClients} active clients
          </p>
          <p className="text-xs text-muted-foreground leading-6 mt-4">
            This is an internal operations report, not a tax or accounting
            statement. No external analytics metrics are inferred.
          </p>
        </section>
      </div>
    </>
  );
}
