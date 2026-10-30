import { LeadList } from "@/components/leads/list";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LeadList params={await searchParams} outreach />;
}
