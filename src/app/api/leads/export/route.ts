import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { csvExport } from "@/server/leads/csv";
export async function GET() {
  const { organization } = await workspace();
  const count = await db.lead.count({
    where: { organizationId: organization.id },
  });
  if (count > 10000)
    return new Response("The export limit is 10,000 rows.", { status: 400 });
  const leads = await db.lead.findMany({
    where: { organizationId: organization.id },
    orderBy: { companyName: "asc" },
    take: 10000,
  });
  return new Response(csvExport(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rise-leads.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
