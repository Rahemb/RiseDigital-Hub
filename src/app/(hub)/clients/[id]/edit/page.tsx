import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { clientSchema } from "@/lib/validation";
export default async function EditClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await workspace();
  const { id } = await params;
  const client = await db.client.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!client) notFound();
  return (
    <>
      <h1 className="page-heading">Edit {client.companyName}</h1>
      <p className="text-muted-foreground mt-2 mb-7">
        Update contact details or archive this relationship using its status.
      </p>
      <ClientForm id={id} initial={clientSchema.parse(client)} />
    </>
  );
}
