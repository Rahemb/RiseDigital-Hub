import { publicUrl, fetchPublic, type WebResult } from "./public-web";
import type {
  WebsiteCandidate,
  DiscoveryResult,
} from "../../lib/website-discovery";
import { findCandidates, type SourceReader } from "./discovery-sources";
const directoryHosts = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "proff.no",
  "1881.no",
  "gulesider.no",
  "virksomhet.brreg.no",
  "wikidata.org",
  "wikipedia.org",
  "google.com",
  "google.no",
  "bing.com",
];
export function visibleText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
function words(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function companyEvidence(
  html: string,
  officialName: string,
  org: string,
) {
  const text = visibleText(html);
  const number = new RegExp(
    `(?<!\\d)(?:NO\\s*)?${org.slice(0, 3)}[\\s.]*${org.slice(3, 6)}[\\s.]*${org.slice(6)}(?!\\d)`,
    "i",
  );
  const name = words(officialName)
    .replace(/\b(as|asa|enk|ans|da)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const nameMatch =
    name.length >= 5 && ` ${words(text)} `.includes(` ${name} `);
  const orgMatch = number.test(text);
  return {
    orgMatch,
    nameMatch,
    evidence: [
      ...(orgMatch
        ? ["The exact organization number appears in visible HTML text."]
        : []),
      ...(nameMatch
        ? ["The registered company name appears in visible HTML text."]
        : []),
    ],
  };
}
export function contactLinks(html: string, base: string) {
  const url = new URL(base);
  const found: string[] = [];
  for (const match of html.matchAll(
    /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    if (
      !/kontakt|contact|om oss|about|personvern/i.test(
        match[3] + " " + (match[1] ?? match[2]),
      )
    )
      continue;
    try {
      const target = publicUrl(
        new URL((match[1] ?? match[2]).replaceAll("&amp;", "&"), base).href,
      );
      if (
        target.origin !== url.origin ||
        target.search ||
        /\.(pdf|zip|jpe?g|png)$/i.test(target.pathname) ||
        target.href === url.href ||
        found.includes(target.href)
      )
        continue;
      found.push(target.href);
      if (found.length === 2) break;
    } catch {}
  }
  return found;
}
export type WebsiteReader = (url: string) => Promise<WebResult>;
export async function verifyCandidate(
  candidate: WebsiteCandidate,
  officialName: string,
  org: string,
  read: WebsiteReader = fetchPublic,
  registryAvailable = true,
): Promise<WebsiteCandidate> {
  if (candidate.status === "FAILED") return candidate;
  const checkedAt = new Date().toISOString();
  try {
    const url = publicUrl(candidate.url);
    if (
      directoryHosts.some(
        (h) => url.hostname === h || url.hostname.endsWith("." + h),
      )
    )
      return {
        ...candidate,
        status: "POSSIBLE",
        checkedAt,
        evidence: [
          ...candidate.evidence,
          "A directory or social profile is not a verified company-owned website.",
        ],
      };
    const page = await read(url.href);
    if (
      page.status < 200 ||
      page.status >= 300 ||
      !/text\/html|application\/xhtml\+xml/i.test(page.type)
    )
      throw new Error(`No available HTML page (HTTP ${page.status})`);
    const final = publicUrl(page.url);
    if (
      directoryHosts.some(
        (h) => final.hostname === h || final.hostname.endsWith("." + h),
      )
    )
      return {
        ...candidate,
        status: "POSSIBLE",
        checkedAt,
        evidence: [
          ...candidate.evidence,
          "A redirect to a directory or social profile needs manual review.",
        ],
      };
    const sameHost =
      final.hostname.replace(/^www\./, "") ===
      url.hostname.replace(/^www\./, "");
    let evidence = companyEvidence(page.body, officialName, org);
    const explanations = [
      ...candidate.evidence,
      `Public HTML returned HTTP ${page.status}: ${final.href}`,
      ...evidence.evidence,
    ];
    if (!evidence.orgMatch) {
      for (const link of contactLinks(page.body, final.href)) {
        try {
          const contact = await read(link);
          if (
            new URL(contact.url).origin !== final.origin ||
            contact.status < 200 ||
            contact.status >= 300 ||
            !/html/i.test(contact.type)
          )
            continue;
          const found = companyEvidence(contact.body, officialName, org);
          if (found.orgMatch || found.nameMatch)
            explanations.push(
              ...found.evidence.map((e) => `${e} Source: ${contact.url}`),
            );
          evidence = {
            orgMatch: evidence.orgMatch || found.orgMatch,
            nameMatch: evidence.nameMatch || found.nameMatch,
            evidence: [],
          };
          if (evidence.orgMatch) break;
        } catch {
          explanations.push(`Contact page could not be checked: ${link}`);
        }
      }
    }
    // A directory assertion plus name alone is not sufficient; require an identifier on-site.
    const verified =
      registryAvailable &&
      evidence.orgMatch &&
      (candidate.exactOrganization || evidence.nameMatch) &&
      sameHost;
    explanations.push(
      verified
        ? "Strong association: exact organization number on the website, supported by the registry source or registered name."
        : "Association is not sufficiently certain. HTTP responses, name similarity and domain similarity alone never trigger automatic verification.",
    );
    if (!sameHost)
      explanations.push(
        "A redirect to another hostname requires manual confirmation.",
      );
    if (!registryAvailable)
      explanations.push("Official company information could not be refreshed.");
    return {
      ...candidate,
      status: verified ? "VERIFIED" : "POSSIBLE",
      checkedAt,
      resolvedUrl: final.href,
      evidence: explanations,
    };
  } catch (e) {
    return {
      ...candidate,
      status: "FAILED",
      checkedAt,
      evidence: [...candidate.evidence, (e as Error).message],
    };
  }
}
export async function discoverWebsite(
  lead: { orgNumber: string; website: string },
  dependencies: { source?: SourceReader; website?: WebsiteReader } = {},
): Promise<DiscoveryResult> {
  const source = await findCandidates(lead, dependencies.source);
  const deadline = Date.now() + 60000;
  const website =
    dependencies.website ??
    ((url: string) => fetchPublic(url, true, 1000000, deadline));
  const candidates: WebsiteCandidate[] = [];
  if (!source.inactive) {
    for (const candidate of source.candidates.slice(0, 3)) {
      candidates.push(
        await verifyCandidate(
          candidate,
          source.officialName,
          lead.orgNumber,
          website,
          source.registryAvailable,
        ),
      );
      if (candidates.at(-1)?.status === "VERIFIED") break;
    }
  }
  const verified = candidates.find((c) => c.status === "VERIFIED"),
    possible = candidates.some((c) => c.status === "POSSIBLE");
  const failed =
    candidates.some((c) => c.status === "FAILED") ||
    source.sources.some((s) => s.status === "FAILED");
  const status = verified
    ? "VERIFIED"
    : possible
      ? "POSSIBLE"
      : failed
        ? "FAILED"
        : "NONE";
  return {
    status,
    candidates,
    sources: source.sources,
    officialName: source.officialName,
    selectedUrl: verified?.url ?? "",
    explanation: verified
      ? "The website is associated with the company through documented identifiers."
      : possible
        ? "A candidate was found, but company association needs manual confirmation."
        : failed
          ? "At least one source or website could not be checked. Unknown does not mean no website."
          : source.inactive
            ? "The company is marked as deleted or closing; automatic verification has stopped."
            : "No reliable website found in the checked sources. This does not mean the company has no website.",
  };
}
