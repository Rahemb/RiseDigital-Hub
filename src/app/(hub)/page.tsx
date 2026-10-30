import Link from "next/link";
import {
  Users,
  FolderKanban,
  CheckSquare,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Sun,
  Activity,
  Wallet,
  Clock3,
} from "lucide-react";
import { workspace } from "@/server/auth";
import { dashboard } from "@/server/dashboard";
import { dateLabel } from "@/lib/utils";
import { currency } from "@/server/currency";
import { LiveRefresh } from "@/components/live-refresh";
import { Button } from "@/components/ui/button";
export default async function Dashboard() {
  const { organization, user } = await workspace();
  const money = await currency(organization.id);
  const d = await dashboard(organization.id);
  const focus = [
    ...d.overdueTasks.map((t) => ({
      title: t.title,
      detail: "Overdue task",
      href: `/tasks/${t.id}`,
    })),
    ...d.dueTasks.map((t) => ({
      title: t.title,
      detail: "Due today",
      href: `/tasks/${t.id}`,
    })),
    ...d.attention.map((c) => ({
      title: c.companyName,
      detail: "Client needs attention",
      href: `/clients/${c.id}`,
    })),
    ...d.deadlineProjects.map((p) => ({
      title: p.name,
      detail: "Project deadline approaching",
      href: `/projects/${p.id}`,
    })),
    ...d.upcomingPayments.map((p) => ({
      title: money(p.amountOre),
      detail: "Manual payment deadline",
      href: `/payments/${p.id}`,
    })),
    ...d.focusReminders.map((r) => ({
      title: r.title,
      detail: `Follow-up · ${r.client.companyName}`,
      href: `/reminders/${r.id}`,
    })),
    ...d.focusTickets.map((t) => ({
      title: t.title,
      detail: `Support · ${t.client.companyName}`,
      href: `/support/${t.id}`,
    })),
  ];
  return (
    <>
      <LiveRefresh />
      <div className="flex flex-wrap justify-between gap-5 items-center mb-8">
        <div>
          <p className="eyebrow mb-2">
            {dateLabel(new Date())} · YOUR WORKSPACE AT A GLANCE
          </p>
          <h1 className="page-heading">Let’s make room for good work.</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Welcome back, {user.name.split(" ")[0]}. Here’s where your agency
            stands.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus size={16} />
            New client
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          ["New project", "/projects/new"],
          ["New task", "/tasks/new"],
          ["Record payment", "/payments"],
          ["Schedule follow-up", "/reminders/new"],
          ["New ticket", "/support/new"],
        ].map(([title, href]) => (
          <Button key={href} asChild variant="outline">
            <Link href={href}>{title}</Link>
          </Button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-7">
        {[
          {
            label: "Active clients",
            value: d.clients.filter((c) => c.status === "ACTIVE").length,
            detail: `${d.clients.filter((c) => c.status === "LEAD").length} leads in your pipeline`,
            icon: Users,
          },
          {
            label: "Active projects",
            value: d.projects.length,
            detail: "Planned and ongoing work",
            icon: FolderKanban,
          },
          {
            label: "Pending tasks",
            value: d.tasks.length,
            detail: `${d.overdueTasks.length} overdue · ${d.dueTasks.length} due today`,
            icon: CheckSquare,
          },
          {
            label: "Expected this month",
            value: money(d.expected),
            detail: "Payment obligations · not received",
            icon: Wallet,
          },
          {
            label: "Overdue tasks",
            value: d.overdueTasks.length,
            detail: "Open tasks past their due date",
            icon: Clock3,
          },
          {
            label: "Clients needing attention",
            value: d.attention.length,
            detail: "Due follow-ups or urgent support",
            icon: Users,
          },
          {
            label: "Open support",
            value: d.tickets.length,
            detail: "Requests awaiting resolution",
            icon: Activity,
          },
          {
            label: "Received this month",
            value: money(d.received),
            detail: "Recorded payment transactions",
            icon: Wallet,
          },
        ].map((s) => (
          <div key={s.label} className="panel p-5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon size={17} className="text-blue-500" />
            </div>
            <div className="stat-number">{s.value}</div>
            <p className="text-[11px] text-muted-foreground mt-2">{s.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-[1.65fr_1fr] gap-6 mb-7">
        <section className="panel overflow-hidden">
          <div className="flex justify-between p-6 border-b border-border">
            <div className="flex gap-3">
              <div className="text-amber-500 mt-1">
                <Sun size={21} />
              </div>
              <div>
                <h2 className="font-semibold">My Focus Today</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  The next steps that deserve your attention.
                </p>
              </div>
            </div>
            <span className="badge h-fit">{focus.length} items</span>
          </div>
          {focus.length ? (
            focus.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex justify-between items-center p-5 border-b border-border hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.detail}
                  </p>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))
          ) : (
            <div className="empty py-14">
              <div className="mx-auto mb-4 grid place-items-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckSquare size={23} />
              </div>
              <h3 className="font-medium text-foreground">A clear day ahead</h3>
              <p className="mt-1">
                No deadlines or follow-ups need your attention.
              </p>
              <p className="text-xs mt-2">
                Your tasks, follow-ups and client deadlines are up to date.
              </p>
            </div>
          )}
        </section>
        <section className="panel p-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Financial snapshot</h2>
            <ArrowUpRight size={18} className="text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manual tracking · NOK
          </p>
          <div className="mt-7">
            <p className="text-xs text-muted-foreground">
              Payments received this month
            </p>
            <div className="stat-number mt-2">{money(d.received)}</div>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
              <span className="status-dot" />
              Based on recorded transactions
            </div>
          </div>
          <div className="mt-7 pt-5 border-t border-border flex justify-between">
            <span className="text-xs text-muted-foreground">
              Outstanding balances
            </span>
            <span className="font-semibold">{money(d.outstanding)}</span>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground mt-5">
            Expected revenue and received payments are tracked separately. This
            workspace does not charge clients.
          </p>
        </section>
      </div>
      <div className="grid xl:grid-cols-[1.65fr_1fr] gap-6">
        <section className="panel overflow-hidden">
          <div className="flex justify-between p-6 items-center">
            <div>
              <h2 className="font-semibold">Your clients</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Recently updated relationships
              </p>
            </div>
            <Link
              href="/clients"
              className="text-xs text-blue-500 flex gap-2 items-center"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {d.clients.length ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {d.clients.slice(0, 5).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-3 font-semibold"
                        >
                          <span className="avatar">
                            {c.companyName.slice(0, 2).toUpperCase()}
                          </span>
                          {c.companyName}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${c.status}`}>
                          {c.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {c.contactPerson}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <Users className="mx-auto mb-3" />
              <p>No clients yet. Start with your first relationship.</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/clients/new">Add your first client</Link>
              </Button>
            </div>
          )}
        </section>
        <section className="panel p-6">
          <div className="flex gap-2 items-center mb-6">
            <Activity size={17} className="text-muted-foreground" />
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          {d.activities.length ? (
            <div className="space-y-6">
              {d.activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs leading-5">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {dateLabel(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty px-0">
              <Clock3 className="mx-auto mb-3" />
              Your workspace history starts with your first client.
            </div>
          )}
        </section>
      </div>
      <section className="panel p-6 mt-7">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-semibold">Upcoming scheduled work</h2>
          <Link className="text-xs text-blue-500" href="/calendar">
            Open calendar →
          </Link>
        </div>
        {d.scheduled.length ? (
          d.scheduled.slice(0, 12).map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex justify-between gap-4 py-3 border-t border-border"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.type}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {dateLabel(item.date)}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming scheduled work in your {organization.focusDays}-day
            focus window.
          </p>
        )}
      </section>
    </>
  );
}
