import { notFound } from "next/navigation";
import { workspace } from "@/server/auth";
import { kindSchema } from "@/lib/business";
import { ModuleList, type Filters } from "@/components/module-list";
export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Filters>;
}) {
  const parsed = kindSchema.safeParse((await params).module);
  if (!parsed.success) notFound();
  const { organization, user } = await workspace();
  return (
    <ModuleList
      organizationId={organization.id}
      userId={user.id}
      kind={parsed.data}
      filters={await searchParams}
    />
  );
}
