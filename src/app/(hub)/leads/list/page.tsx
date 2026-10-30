import { SavedList } from "@/components/leads/saved-list";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SavedList params={await searchParams} />;
}
