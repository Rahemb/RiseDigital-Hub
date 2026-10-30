import { notFound } from "next/navigation";
import { workspace } from "@/server/auth";
import { choices } from "@/server/module-queries";
import { kindSchema } from "@/lib/business";
import { config } from "@/lib/module-config";
import { BusinessForm } from "@/components/business-forms";
export default async function NewRecord({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    serviceId?: string;
    agreementId?: string;
  }>;
}) {
  const parsed = kindSchema.safeParse((await params).module);
  if (!parsed.success) notFound();
  const { organization } = await workspace();
  const query = await searchParams;
  return (
    <>
      <h1 className="page-heading mb-2">New {config[parsed.data].singular}</h1>
      <p className="text-muted-foreground mb-7">
        {config[parsed.data].description}
      </p>
      <BusinessForm
        kind={parsed.data}
        options={await choices(organization.id)}
        initial={{
          ...(query.clientId ? { clientId: query.clientId } : {}),
          ...(query.projectId ? { projectId: query.projectId } : {}),
          ...(query.serviceId ? { serviceId: query.serviceId } : {}),
          ...(query.agreementId ? { agreementId: query.agreementId } : {}),
        }}
      />
    </>
  );
}
