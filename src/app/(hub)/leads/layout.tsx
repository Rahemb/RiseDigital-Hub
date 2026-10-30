import Link from "next/link";
export default function LeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lead-finder space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Finder</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover a business, research it on Google, then add it to Clients or
          save it for later.
        </p>
      </div>
      <nav
        aria-label="Lead Finder"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {[
          ["Discover", "/leads/discover"],
          ["Saved Leads", "/leads/list"],
        ].map(([label, url]) => (
          <Link
            key={url}
            href={url}
            className="rounded-md px-3 py-2 text-sm hover:bg-muted border border-border"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
