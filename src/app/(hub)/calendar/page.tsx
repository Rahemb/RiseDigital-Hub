import Link from "next/link";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  eachDayOfInterval,
} from "date-fns";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { calendarEvents } from "@/server/analytics";
import { day, dateKey } from "@/lib/business";
import { Button } from "@/components/ui/button";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; type?: string }>;
}) {
  const { organization } = await workspace();
  const q = await searchParams;
  const date = day.safeParse(q.date).success ? q.date! : dateKey();
  const anchor = parseISO(`${date}T12:00:00`);
  const weekly = q.view === "week";
  const options = {
    weekStartsOn: organization.weekStartsOn === 0 ? (0 as const) : (1 as const),
  };
  const start = startOfWeek(weekly ? anchor : startOfMonth(anchor), options);
  const end = endOfWeek(weekly ? anchor : endOfMonth(anchor), options);
  const events = (
    await calendarEvents(
      db,
      organization.id,
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd"),
    )
  ).filter((e) => !q.type || e.type === q.type);
  const days = eachDayOfInterval({ start, end });
  const url = (d: Date) =>
    `/calendar?${new URLSearchParams({ date: format(d, "yyyy-MM-dd"), view: weekly ? "week" : "month", type: q.type ?? "" })}`;
  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
        <div>
          <p className="eyebrow mb-2">SCHEDULE</p>
          <h1 className="page-heading">{format(anchor, "MMMM yyyy")}</h1>
          <p className="text-muted-foreground mt-2">
            Deadlines and follow-ups · Europe/Oslo
          </p>
        </div>
        <Button asChild>
          <Link href="/reminders/new">New follow-up</Link>
        </Button>
      </div>
      <form className="panel p-4 flex flex-wrap gap-3 mb-5">
        <input
          className="w-auto"
          type="date"
          aria-label="Calendar date"
          name="date"
          defaultValue={date}
        />
        <select
          className="w-auto"
          name="view"
          aria-label="Calendar view"
          defaultValue={weekly ? "week" : "month"}
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
        </select>
        <select
          className="w-auto"
          aria-label="Event type"
          name="type"
          defaultValue={q.type ?? ""}
        >
          <option value="">All events</option>
          {["Tasks", "Projects", "Payments", "Follow-ups", "Support"].map(
            (t) => (
              <option key={t}>{t}</option>
            ),
          )}
        </select>
        <Button variant="outline">Apply</Button>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href={url(weekly ? addDays(anchor, -7) : addMonths(anchor, -1))}
          >
            ← Previous
          </Link>
          <Link href="/calendar">Today</Link>
          <Link href={url(weekly ? addDays(anchor, 7) : addMonths(anchor, 1))}>
            Next →
          </Link>
        </div>
      </form>
      <div className="panel overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[760px]">
          {days.slice(0, 7).map((d) => (
            <div
              className="p-3 text-xs text-muted-foreground border-b border-border"
              key={format(d, "E")}
            >
              {format(d, "EEEE")}
            </div>
          ))}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            return (
              <div
                key={key}
                className={`p-3 min-h-36 border-r border-b border-border ${key === dateKey() ? "bg-blue-500/5" : ""}`}
              >
                <div
                  className={`text-xs mb-3 ${key === dateKey() ? "text-blue-500 font-bold" : "text-muted-foreground"}`}
                >
                  {format(d, "d")}
                </div>
                <div className="space-y-2">
                  {events
                    .filter((e) => e.date === key)
                    .map((e) => (
                      <Link
                        href={e.href}
                        key={`${e.type}-${e.id}`}
                        className="block rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 p-2 text-[11px] leading-4"
                      >
                        <span className="block font-semibold">{e.title}</span>
                        <span className="block opacity-75">
                          {e.client} · {e.type}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex justify-between text-sm text-muted-foreground">
        <span>{events.length} events in this view</span>
        <Link href="/reminders" className="text-blue-500">
          Manage follow-ups →
        </Link>
      </div>
    </>
  );
}
