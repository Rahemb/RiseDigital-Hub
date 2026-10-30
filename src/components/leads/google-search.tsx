import { Search } from "lucide-react";
import { googleSearchUrl } from "@/lib/lead-research";
export function GoogleSearch({
  companyName,
  municipality = "",
  compact = false,
}: {
  companyName: string;
  municipality?: string;
  compact?: boolean;
}) {
  return (
    <a
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm font-medium"}`}
      href={googleSearchUrl(companyName, municipality)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Search on Google for ${companyName} (opens in a new tab)`}
      title="Opens a free Google search in a new tab. Check that the result matches this company."
    >
      <Search size={compact ? 14 : 16} aria-hidden="true" />
      Search on Google
    </a>
  );
}
