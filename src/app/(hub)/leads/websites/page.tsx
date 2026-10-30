import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { getDiscoveryBatch } from "@/server/leads/discovery-jobs";
import { DiscoveryQueue } from "@/components/leads/website-discovery";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { organization } = await workspace();
  const params = await searchParams;
  const requested = [
    ...new Set(
      (Array.isArray(params.ids)
        ? params.ids
        : (params.ids ?? "").split(",")
      ).filter((id) => id.length <= 100),
    ),
  ].slice(0, 500);
  const [initial, latest, selected] = await Promise.all([
    getDiscoveryBatch(db, organization.id),
    db.lead.findMany({
      where: { organizationId: organization.id },
      select: { id: true, companyName: true, orgNumber: true },
      orderBy: { discoveredAt: "desc" },
      take: 500,
    }),
    db.lead.findMany({
      where: { organizationId: organization.id, id: { in: requested } },
      select: { id: true, companyName: true, orgNumber: true },
    }),
  ]);
  const choices = [
    ...selected,
    ...latest.filter((l) => !selected.some((s) => s.id === l.id)),
  ].slice(0, 500);
  return (
    <DiscoveryQueue
      initial={initial}
      choices={choices}
      initialIds={selected.map((l) => l.id)}
    />
  );
}
