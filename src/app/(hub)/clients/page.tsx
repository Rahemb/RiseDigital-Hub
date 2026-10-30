import Link from "next/link";
import { Plus, Search, ArrowUpRight, Users } from "lucide-react";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { clientStatuses } from "@/lib/validation";
import { dateLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { organization } = await workspace();
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200);
  const status = clientStatuses.find((s) => s === params.status);
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const where = {
    organizationId: organization.id,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q } },
            { contactPerson: { contains: q } },
            { email: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {}),
  };
  const [clients, count] = await Promise.all([
    db.client.findMany({
      where,
      orderBy:
        params.sort === "name" ? { companyName: "asc" } : { createdAt: "desc" },
      take: 25,
      skip: (page - 1) * 25,
    }),
    db.client.count({ where }),
  ]);
  const pageUrl = (p: number) =>
    `/clients?${new URLSearchParams({ q, status: status ?? "", sort: params.sort ?? "", page: String(p) })}`;
  return (
    <>
      <div className="flex justify-between items-center mb-7">
        <div>
          <p className="eyebrow mb-2">RELATIONSHIPS</p>
          <h1 className="page-heading">
            Clients{" "}
            <span className="text-muted-foreground text-xl ml-2">{count}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Good work starts with great relationships.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus size={16} />
            New client
          </Link>
        </Button>
      </div>
      <section className="panel overflow-hidden">
        <form className="p-5 flex flex-wrap gap-3 border-b border-border">
          <div className="relative flex-1 min-w-48">
            <Search
              size={16}
              className="absolute top-3 left-3 text-muted-foreground"
            />
            <input
              aria-label="Search clients"
              name="q"
              defaultValue={q}
              placeholder="Search company, contact, email or tags…"
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter by status"
            name="status"
            defaultValue={status ?? ""}
            className="w-auto"
          >
            <option value="">All statuses</option>
            {clientStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            name="sort"
            aria-label="Sort clients"
            defaultValue={params.sort ?? "recent"}
            className="w-auto"
          >
            <option value="recent">Newest first</option>
            <option value="name">Company A–Z</option>
          </select>
          <Button variant="outline">Apply</Button>
        </form>
        {clients.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="avatar">
                          {c.companyName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="font-semibold">
                          {c.companyName}
                          <div className="font-normal text-[11px] text-muted-foreground mt-1">
                            {c.tags || "No tags"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {c.contactPerson}
                      <div className="text-muted-foreground mt-1">
                        {c.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.status}`}>
                        {c.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap">
                      {dateLabel(c.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/clients/${c.id}`}
                        aria-label={`Open ${c.companyName}`}
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty py-20">
            <Users className="mx-auto mb-4" />
            <h2 className="font-semibold text-foreground">
              {q || status
                ? "No matching clients"
                : "Your client list starts here"}
            </h2>
            <p>
              {q || status
                ? "Try a different search or filter."
                : "Add a client to start organizing your agency."}
            </p>
          </div>
        )}
        <div className="flex justify-between p-5 text-xs text-muted-foreground">
          <span>
            {count} clients · Page {page}
          </span>
          <div className="flex gap-5">
            {page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}
            {count > page * 25 && <Link href={pageUrl(page + 1)}>Next</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
