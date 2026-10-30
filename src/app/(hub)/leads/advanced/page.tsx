import Link from "next/link";
export default function Page() {
  return (
    <section className="panel p-5 space-y-4">
      <h2 className="font-semibold">Advanced Tools</h2>
      <p className="text-sm text-muted-foreground">
        Optional tools. You can review and qualify any lead without automatic
        website discovery or an audit.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          [
            "Find Websites Automatically",
            "/leads/websites",
            "Discover, verify and audit websites using free public sources. Coverage is limited.",
          ],
          [
            "Import CSV",
            "/leads/import",
            "Preview and import company data without overwriting existing leads.",
          ],
          [
            "Add lead manually",
            "/leads/new",
            "Record a company you already know.",
          ],
          [
            "Scoring and request settings",
            "/leads/settings",
            "Manage industry mappings, scoring rules and bounded request limits.",
          ],
        ].map(([label, url, description]) => (
          <Link
            className="rounded-lg border border-border p-4 hover:bg-muted"
            href={url}
            key={url}
          >
            <h3 className="font-medium">{label}</h3>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
