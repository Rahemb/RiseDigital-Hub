import { z } from "zod";
export function googleSearchUrl(companyName: string, municipality = "") {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set(
    "q",
    [companyName.trim(), municipality.trim(), "Norway"]
      .filter(Boolean)
      .join(" "),
  );
  return url.href;
}
export const reviewSchema = z.object({
  // Match the CRM limit so a saved phone can be converted without truncation.
  phone: z.string().trim().max(40).optional(),
  websiteQuality: z.string().trim().max(3000).optional(),
  googleObservations: z.string().trim().max(3000).optional(),
  opportunities: z.string().trim().max(3000).optional(),
  relevantServices: z.string().trim().max(3000).optional(),
});
export function selectVisibleLeads(
  selected: string[],
  visible: string[],
  checked: boolean,
) {
  return checked
    ? [...new Set([...selected, ...visible])]
    : selected.filter((id) => !visible.includes(id));
}
export function leadStage(qualification: string, contactStatus: string) {
  if (contactStatus === "CONVERTED") return "Converted";
  if (contactStatus === "INTERESTED") return "Interested";
  if (["CONTACTED", "REPLIED", "FOLLOW_UP"].includes(contactStatus))
    return "Contacted";
  return (
    (
      {
        NEW: "New",
        REVIEW: "Reviewing",
        QUALIFIED: "Qualified",
        REJECTED: "Not a fit",
      } as Record<string, string>
    )[qualification] ?? "New"
  );
}
