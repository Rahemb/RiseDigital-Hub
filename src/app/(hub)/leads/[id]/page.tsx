import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { workspace } from "@/server/auth";
import { isSuppressed } from "@/server/leads/service";
import { matchingClients, savedStatuses, savedStatus } from "@/lib/saved-leads";
import { GoogleSearch } from "@/components/leads/google-search";
import { ClientLeadAction } from "@/components/leads/client-action";
import { ActionForm, Field } from "@/components/leads/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await workspace();
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, organizationId: organization.id },
    include: { review: true, savedState: true },
  });
  if (!lead) notFound();
  const matches = matchingClients(
    lead,
    await db.client.findMany({
      where: { organizationId: organization.id },
      select: { id: true, companyName: true, organizationNumber: true },
    }),
  );
  const clientId =
    lead.clientId ?? (matches.length === 1 ? matches[0].id : null);
  const suppressed =
    lead.contactStatus === "DO_NOT_CONTACT" ||
    (await isSuppressed(db, organization.id, lead));
  return (
    <section className="panel p-5 sm:p-6 space-y-5 max-w-4xl">
      <Link
        href="/leads/list"
        className="text-sm text-muted-foreground underline"
      >
        Back to Saved Leads
      </Link>
      <header>
        <h2 className="text-xl font-semibold">{lead.companyName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {[lead.industry, lead.municipality, `Org. no. ${lead.orgNumber}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>
      <div className="flex flex-wrap items-start gap-3">
        <GoogleSearch
          companyName={lead.companyName}
          municipality={lead.municipality}
        />
        <ClientLeadAction id={id} clientId={clientId} blocked={suppressed} />
        {lead.savedState?.removedAt && (
          <ActionForm command="restoreSaved" id={id} label="Save for Later" />
        )}
      </div>
      {suppressed && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          Do-not-contact restriction remains active. Editing notes does not
          remove it or authorize contact.
        </p>
      )}
      <ActionForm command="saveSimple" id={id} label="Save">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Website" name="website" value={lead.website} />
          <Field label="Email" name="email" type="email" value={lead.email} />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={lead.review?.phone ?? ""}
          />
          {lead.clientId || suppressed ? (
            <div className="text-sm">
              <p>Status</p>
              <p className="mt-2">
                {suppressed ? "Do not contact" : "In Clients"}
              </p>
              <input
                type="hidden"
                name="status"
                value={savedStatus(lead.contactStatus)}
              />
            </div>
          ) : (
            <label className="text-sm">
              Status
              <select
                name="status"
                defaultValue={savedStatus(lead.contactStatus)}
              >
                {Object.entries(savedStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Field
            label="Follow-up date (optional)"
            name="followUp"
            type="date"
            value={lead.followUpAt?.toISOString().slice(0, 10) ?? ""}
          />
        </div>
        <label className="block text-sm">
          Notes
          <textarea
            name="notes"
            defaultValue={lead.notes}
            maxLength={10000}
            rows={5}
          />
        </label>
      </ActionForm>
      {!lead.savedState?.removedAt && (
        <div className="border-t border-border pt-4">
          <ActionForm
            command="removeSaved"
            id={id}
            label="Remove from Saved Leads"
            confirm="Remove from the saved list? Notes, contact history and client links will be kept."
          />
        </div>
      )}
    </section>
  );
}
