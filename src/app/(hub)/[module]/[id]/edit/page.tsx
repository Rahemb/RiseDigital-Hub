import { notFound } from "next/navigation";
import { workspace } from "@/server/auth";
import { choices, recordData, formValues } from "@/server/module-queries";
import { kindSchema } from "@/lib/business";
import { config } from "@/lib/module-config";
import { BusinessForm } from "@/components/business-forms";
export default async function EditRecord({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  const parsed = kindSchema.safeParse(module);
  if (!parsed.success) notFound();
  const { organization } = await workspace();
  const record = await recordData(organization.id, parsed.data, id);
  if (!record) notFound();
  const initial = formValues(record);
  if ("completedAt" in record) initial.completed = String(!!record.completedAt);
  return (
    <>
      <h1 className="page-heading mb-7">Edit {config[parsed.data].singular}</h1>
      <BusinessForm
        kind={parsed.data}
        id={id}
        initial={initial}
        options={await choices(organization.id)}
      />
    </>
  );
}
