import { GoogleSearch } from "@/components/leads/google-search";
import { leadSystemText } from "@/lib/lead-legacy-text";
import { leadStage } from "@/lib/lead-research";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { workspace } from "@/server/auth";
import { currentAudit, isSuppressed } from "@/server/leads/service";
import {
  contactLabels,
  qualificationLabels,
  websiteLabels,
  templateLabels,
} from "@/lib/leads";
import { ActionForm, Field, Handoff } from "@/components/leads/forms";
import type { AuditData } from "@/server/leads/audit";
import {
  DiscoveryStart,
  ConfirmCandidate,
} from "@/components/leads/website-discovery";
import {
  discoveryLabels,
  type WebsiteCandidate,
  type SourceCheck,
} from "@/lib/website-discovery";
function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Record<string, string>;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select className="field w-full" name={name} defaultValue={value}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await workspace();
  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      source: true,
      review: true,
      discovery: true,
      audits: { orderBy: { createdAt: "desc" }, take: 5 },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      drafts: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!lead) notFound();
  const audit = await currentAudit(db, lead);
  const latest = lead.audits[0];
  const findings: AuditData | null = latest?.findings
    ? JSON.parse(latest.findings)
    : null;
  const draft = lead.drafts[0];
  const candidates: WebsiteCandidate[] = lead.discovery
    ? JSON.parse(lead.discovery.candidates)
    : [];
  const sources: SourceCheck[] = lead.discovery
    ? JSON.parse(lead.discovery.sources)
    : [];
  const suppressed = await isSuppressed(db, organization.id, lead);
  const fresh = !!audit;
  const reasons = lead.scores[0]
    ? (JSON.parse(lead.scores[0].reasons) as { text: string; points: number }[])
    : [];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold">{lead.companyName}</h2>
          <p className="text-sm text-muted-foreground">
            Org. no. {lead.orgNumber} · {leadSystemText(lead.source.name)} ·
            Added {lead.discoveredAt.toLocaleDateString("en-GB")}
          </p>
          <p className="text-sm mt-2">
            <strong>{leadStage(lead.qualification, lead.contactStatus)}</strong>{" "}
            · {contactLabels[lead.contactStatus as keyof typeof contactLabels]}{" "}
            ·{" "}
            {
              qualificationLabels[
                lead.qualification as keyof typeof qualificationLabels
              ]
            }
          </p>
        </div>
        <div className="flex gap-4 text-sm items-start">
          <GoogleSearch
            companyName={lead.companyName}
            municipality={lead.municipality}
          />
          {lead.clientId && (
            <Link
              className="text-primary underline"
              href={`/clients/${lead.clientId}`}
            >
              Open client →
            </Link>
          )}
        </div>
      </header>
      <nav
        aria-label="Lead sections"
        className="flex flex-wrap gap-4 text-sm text-primary"
      >
        <a href="#review">Review and qualify</a>
        <a href="#outreach">Prepare outreach</a>
        <a href="#conversion">Convert to client</a>
      </nav>
      {suppressed && (
        <p role="status" className="panel p-4 text-red-600">
          Do-not-contact restriction recorded. Drafts, approval, copying and
          conversion are blocked.
        </p>
      )}
      <div className="space-y-6" id="review">
        <section className="panel p-5 space-y-4">
          <h3 className="font-semibold">Company information</h3>
          <p className="text-sm text-muted-foreground">
            Review the matching company on Google, then record only information
            you have checked. Google may show a Business Profile; verify that it
            belongs to this company.
          </p>
          <ActionForm command="edit" id={id} label="Save review">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Company name"
                name="companyName"
                value={lead.companyName}
                required
              />
              <Field label="Industry" name="industry" value={lead.industry} />
              <Field
                label="Organization number"
                name="orgNumber"
                value={lead.orgNumber}
                readOnly
              />
              <Field
                label="Industry code"
                name="industryCode"
                value={lead.industryCode}
              />
              <Field
                label="Municipality"
                name="municipality"
                value={lead.municipality}
              />
              <Field
                label="Municipality code"
                name="municipalityCode"
                value={lead.municipalityCode}
              />
              <Field label="Website" name="website" value={lead.website} />
              <Field
                label="Phone number"
                name="phone"
                value={lead.review?.phone ?? ""}
              />
              <Field label="Tags" name="tags" value={lead.tags} />
              <Select
                label="Qualification"
                name="qualification"
                value={lead.qualification}
                options={qualificationLabels}
              />
            </div>
            <label className="block text-sm">
              <input
                name="noWebsite"
                type="checkbox"
                defaultChecked={lead.websiteStatus === "NO_WEBSITE"}
              />{" "}
              I manually confirmed this company has no website
            </label>
            <p className="text-xs text-muted-foreground">
              An empty URL means unknown, not no website. Organization numbers
              cannot be changed after import.
            </p>
            <h4 className="text-sm font-semibold pt-2">
              Contact details and verification
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="General business email"
                name="email"
                type="email"
                value={lead.email}
              />
              <Field
                label="Source (URL or documented manual verification)"
                name="emailSource"
                value={lead.emailSource}
              />
              <Select
                label="Email status"
                name="emailStatus"
                value={lead.emailStatus}
                options={{
                  UNVERIFIED: "Not verified",
                  PUBLISHED: "Published by the stated source",
                  VERIFIED: "Manually confirmed",
                }}
              />
              <Select
                label="Recipient type"
                name="emailKind"
                value={lead.emailKind}
                options={{
                  UNKNOWN: "Reviewing",
                  GENERIC: "General business address",
                  PERSONAL: "Identifiable individual",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A published address does not verify deliverability or permission
              to market. Do not collect private personal addresses from
              unrelated sources.
            </p>
            <h4 className="text-sm font-semibold">Research notes</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ["websiteQuality", "Website quality"],
                  ["googleObservations", "Google review observations"],
                  ["opportunities", "Potential improvement opportunities"],
                  ["relevantServices", "Relevant services"],
                ] as const
              ).map(([name, label]) => (
                <label key={name} className="block text-sm">
                  {label}
                  <textarea
                    name={name}
                    defaultValue={lead.review?.[name] ?? ""}
                    rows={3}
                    maxLength={3000}
                    className="field w-full"
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              Other notes
              <textarea
                name="notes"
                defaultValue={lead.notes}
                rows={5}
                className="field w-full"
                maxLength={10000}
              />
            </label>
          </ActionForm>
        </section>
      </div>
      <section className="panel p-5 space-y-5" id="outreach">
        <h3 className="font-semibold">Prepare outreach and track progress</h3>
        {!suppressed && !lead.clientId && (
          <>
            <ActionForm command="draft" id={id} label="Create new draft">
              <Select
                label="Template"
                name="template"
                value="WEBSITE"
                options={templateLabels}
              />
            </ActionForm>
            {draft && (
              <div className="grid xl:grid-cols-2 gap-6">
                <ActionForm
                  command="saveDraft"
                  id={id}
                  label="Save edited draft"
                >
                  <div key={draft.id} className="space-y-4">
                    <input
                      type="hidden"
                      name="template"
                      value={draft.template}
                    />
                    <Field
                      label="Subject"
                      name="subject"
                      value={draft.subject}
                      required
                    />
                    <label className="block text-sm">
                      Message
                      <textarea
                        className="field w-full"
                        rows={18}
                        name="body"
                        defaultValue={draft.body}
                        required
                        maxLength={12000}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Check every claim before use. Editing revokes previous
                      approval.
                    </p>
                  </div>
                </ActionForm>
                <div className="space-y-4">
                  <h4 className="font-medium">Saved draft preview</h4>
                  <p className="text-sm font-semibold">{draft.subject}</p>
                  <p className="text-sm whitespace-pre-wrap leading-6">
                    {draft.body}
                  </p>
                  <Handoff id={id} />
                </div>
              </div>
            )}
            <ActionForm
              command="outreach"
              id={id}
              label="Save contact status and activity"
              confirm="Save contact status and review? Opt-out blocks further contact."
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Contact status"
                  name="status"
                  value={lead.contactStatus}
                  options={Object.fromEntries(
                    Object.entries(contactLabels).filter(
                      ([k]) => k !== "CONVERTED",
                    ),
                  )}
                />
                <Field
                  label="Next follow-up"
                  name="followUp"
                  type="date"
                  value={lead.followUpAt?.toISOString().slice(0, 10) ?? ""}
                />
              </div>
              <label className="block text-sm">
                Activity note / review evidence
                <textarea
                  className="field w-full"
                  name="note"
                  rows={3}
                  required
                  maxLength={5000}
                  placeholder="Record a reply, contact, opt-out, or the basis for approval"
                />
              </label>
              <fieldset className="border border-border rounded-lg p-4 space-y-3">
                <legend className="text-sm font-semibold px-2">
                  Required before approval for contact
                </legend>
                <p className="text-sm text-muted-foreground">
                  A public email address does not automatically permit
                  marketing. Review the Norwegian Marketing Control Act § 15,
                  the recipient and provider terms. Hub does not make legal
                  determinations.
                </p>
                <label className="block text-sm">
                  <input type="checkbox" name="recipientReviewed" /> I checked
                  the recipient, address source and final draft.
                </label>
                <label className="block text-sm">
                  <input type="checkbox" name="legalReviewed" /> I reviewed and
                  documented relevant consent or another specific lawful basis.
                </label>
                <label className="block text-sm">
                  <input type="checkbox" name="providerReviewed" /> I checked
                  the email provider terms and opt-out process.
                </label>
                <Field
                  label="Consent or specific exception (required for personal recipients)"
                  name="consent"
                />
                <a
                  className="block text-sm underline text-primary"
                  href="https://lovdata.no/lov/2009-01-09-2/§15"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the Marketing Control Act § 15 ↗
                </a>
              </fieldset>
            </ActionForm>
          </>
        )}
        {lead.clientId && (
          <p className="text-sm">
            This lead has been converted. Continue in the client profile.
          </p>
        )}
      </section>
      <section className="panel p-5 space-y-4">
        <h3 id="conversion" className="font-semibold">
          Convert to client
        </h3>
        {lead.clientId ? (
          <Link
            className="text-primary underline"
            href={`/clients/${lead.clientId}`}
          >
            Open linked client
          </Link>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Qualification is required. Existing clients with the same
              organization number are linked without changes. Enter verified
              contact details; nothing is generated.
            </p>
            <ActionForm
              command="convert"
              id={id}
              label="Convert / link to client"
              confirm="Create client link? Existing client data will not change."
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Contact person" name="contactPerson" required />
                <Field
                  label="Client email"
                  name="email"
                  type="email"
                  value={lead.email}
                  required
                />
              </div>
            </ActionForm>
          </>
        )}
      </section>
      <details className="panel p-5 space-y-5">
        <summary className="font-semibold">
          Advanced Tools · website discovery, audit and scoring
        </summary>
        <section className="panel p-5 space-y-4">
          <h3 className="font-semibold">
            Automatic website discovery ·{" "}
            {
              discoveryLabels[
                (lead.discovery?.status ??
                  "PENDING") as keyof typeof discoveryLabels
              ]
            }
          </h3>
          <DiscoveryStart id={id} />
          <p className="text-sm text-muted-foreground">
            Company identity is checked separately from technical availability.
            An HTTP 200 response does not establish ownership.
          </p>
          {lead.discovery && (
            <>
              <p className="text-sm">
                {leadSystemText(lead.discovery.explanation)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last searched:{" "}
                {lead.discovery.checkedAt.toLocaleString("en-GB", {
                  timeZone: "Europe/Oslo",
                })}
                {lead.discovery.confirmedAt ? " · Manually confirmed" : ""}
              </p>
              {sources.map((s, i) => (
                <p className="text-xs" key={i}>
                  {leadSystemText(s.source)} ·{" "}
                  {s.status === "OK"
                    ? "Checked"
                    : s.status === "FAILED"
                      ? "Utilgjengelig"
                      : "Skipped"}
                  : {leadSystemText(s.message)}
                </p>
              ))}
              {candidates.map((c, i) => (
                <details
                  key={i}
                  className="border border-border rounded-lg p-3"
                >
                  <summary className="text-sm cursor-pointer break-all">
                    {c.url} ·{" "}
                    {c.status === "VERIFIED"
                      ? "Strong match"
                      : c.status === "FAILED"
                        ? "Could not check"
                        : "Reviewing"}
                  </summary>
                  <p className="text-xs mt-3 break-all">
                    Source: {leadSystemText(c.source)} · {c.sourceUrl}
                  </p>
                  <ul className="list-disc pl-5 text-sm mt-2 space-y-2">
                    {c.evidence.map((e, j) => (
                      <li key={j}>{leadSystemText(e)}</li>
                    ))}
                  </ul>
                </details>
              ))}
              {!!candidates.length && (
                <ConfirmCandidate id={id} candidates={candidates} />
              )}
            </>
          )}
        </section>
        <section className="panel p-5 space-y-4">
          <h3 className="font-semibold">Website audit and scoring</h3>
          <p className="text-sm">
            {websiteLabels[lead.websiteStatus as keyof typeof websiteLabels]}
            {lead.websiteVerifiedAt &&
              ` · ${lead.websiteVerifiedAt.toLocaleString("en-GB")}`}
          </p>
          <p className="text-xs text-muted-foreground break-all">
            Source: {leadSystemText(lead.websiteSource) || "No website URL found"}
          </p>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-3xl font-semibold">
              {fresh && lead.score !== null
                ? `${lead.score}/100`
                : "Insufficient data"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Service opportunity score, not a company quality rating. Unknown
              information earns no points.
            </p>
            {fresh &&
              lead.score !== null &&
              reasons.map((r, i) => (
                <p key={i} className="text-sm mt-2">
                  +{r.points} · {leadSystemText(r.text)}
                </p>
              ))}
          </div>
          <ActionForm
            command="audit"
            id={id}
            label="Verify website and run audit"
          />
          <p className="text-xs text-muted-foreground">
            A basic check of public HTML, not a full mobile, SEO or
            accessibility audit. Sites may block automated visits. Wait at least
            one minute between checks.
          </p>
          {latest && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Last attempt: {latest.createdAt.toLocaleString("en-GB")} · HTTP{" "}
                {latest.httpStatus ?? "unknown"} ·{" "}
                {!audit ? "outdated / could not verify" : "current"}
              </p>
              {latest.error && (
                <p className="text-sm text-red-600">
                  {leadSystemText(latest.error)}
                </p>
              )}
              {findings && (
                <>
                  <p className="text-sm">
                    Page title: {findings.title || "Not found"}
                  </p>
                  {findings.findings.map((f, i) => (
                    <div key={i} className="border-t border-border pt-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {f.kind === "VERIFIED"
                          ? "OBSERVED IN HTML"
                          : f.kind === "HEURISTIC"
                            ? "HEURISTIC RECOMMENDATION"
                            : "NOT MEASURED"}
                      </span>
                      <p className="text-sm mt-1">{leadSystemText(f.text)}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      </details>
      <section className="panel p-5">
        <h3 className="font-semibold mb-3">History · latest 50 events</h3>
        {lead.activities.map((a) => (
          <div key={a.id} className="border-t border-border py-3 text-sm">
            <p className="whitespace-pre-wrap">
              {[
                "IMPORT",
                "EDIT",
                "AUDIT",
                "DRAFT",
                "CONVERTED",
                "WEBSITE_DISCOVERY",
              ].includes(a.kind)
                ? leadSystemText(a.body)
                : a.body}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {a.createdAt.toLocaleString("en-GB", { timeZone: "Europe/Oslo" })}{" "}
              · {contactLabels[a.kind as keyof typeof contactLabels] ?? a.kind}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
