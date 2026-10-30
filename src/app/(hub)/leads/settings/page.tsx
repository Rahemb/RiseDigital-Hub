import { ActionForm } from "@/components/leads/forms";
import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { getConfig } from "@/server/leads/service";
export default async function Page() {
  const { organization } = await workspace();
  const config = await getConfig(db, organization.id);
  return (
    <section className="panel p-6 space-y-4 max-w-4xl">
      <h2 className="font-semibold">Rules and request limits</h2>
      <p className="text-sm text-muted-foreground">
        Settings apply to this workspace. Changes reset current scores,
        preserving historical assessments. Run a new audit to apply updated
        rules.
      </p>
      <ul className="text-sm space-y-2 list-disc pl-5">
        <li>
          maxResults: 1–100 results per page. requestDelayMs: at least 1000 ms
          between external jobs.
        </li>
        <li>
          auditDays: 1–90 days before observations expire. Outdated findings are
          not used in new drafts.
        </li>
        <li>
          rules: 0–30 points per factor, capped at 100. Unknown websites receive
          no score.
        </li>
        <li>
          mappings: editable industry code prefixes (SN2025). OTHER is an
          editable starter group, not all remaining industries. All industries
          has no code restriction.
        </li>
      </ul>
      <ActionForm command="settings" label="Save settings">
        <label className="text-sm block">
          Configuration (JSON)
          <textarea
            name="config"
            defaultValue={JSON.stringify(config, null, 2)}
            rows={25}
            className="field w-full font-mono text-xs"
            required
          />
        </label>
      </ActionForm>
      <p className="text-xs text-muted-foreground">
        One audit at a time. HTTP(S), public IPv4, up to 1 MB HTML and three
        redirects. Automated requests conservatively respect robots.txt.
      </p>
      <a
        className="text-sm text-primary underline"
        href="https://data.brreg.no/enhetsregisteret/api/dokumentasjon/no/index.html"
        target="_blank"
        rel="noreferrer"
      >
        Official Brønnøysundregistrene documentation
      </a>
    </section>
  );
}
