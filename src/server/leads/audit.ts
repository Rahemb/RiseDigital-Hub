import { leadSystemText } from "../../lib/lead-legacy-text";
import type { LeadConfig } from "../../lib/leads";
export type Finding = {
  key: string;
  kind: "VERIFIED" | "HEURISTIC" | "UNKNOWN";
  text: string;
  points: number;
};
export type AuditData = {
  url: string;
  httpStatus: number;
  title: string;
  metaDescription: string;
  headings: number;
  images: number;
  missingAlt: number;
  findings: Finding[];
};
function attrs(tag: string) {
  const result: Record<string, string> = {};
  for (const m of tag.matchAll(
    /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
  ))
    result[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return result;
}
function clean(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
export function analyzeHtml(
  html: string,
  url: string,
  httpStatus: number,
  rules: LeadConfig["rules"],
): AuditData {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const title = clean(
    body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
  );
  const meta = [...body.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const description =
    meta.find((m) => m.name?.toLowerCase() === "description")?.content ?? "";
  const viewport = meta.some(
    (m) => m.name?.toLowerCase() === "viewport" && !!m.content?.trim(),
  );
  const headings = [...body.matchAll(/<h1\b[^>]*>/gi)].length;
  const images = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const missingAlt = images.filter((i) => !Object.hasOwn(i, "alt")).length;
  const findings: Finding[] = [];
  const add = (key: string, text: string, points: number) =>
    findings.push({ key, text, points, kind: "VERIFIED" });
  if (!url.startsWith("https:"))
    add(
      "https",
      "The fetched page was served over HTTP, not HTTPS.",
      rules.https,
    );
  if (!title)
    add("title", "No page title was found in the fetched HTML.", rules.title);
  if (!description.trim())
    add(
      "description",
      "No meta description was found in the fetched HTML.",
      rules.description,
    );
  if (!viewport)
    add(
      "viewport",
      "No viewport meta tag was found in the fetched HTML.",
      rules.viewport,
    );
  if (headings !== 1)
    add(
      "heading",
      `Found ${headings} H1 elements in the fetched HTML.`,
      rules.heading,
    );
  if (missingAlt)
    add(
      "alt",
      `${missingAlt} of ${images.length} images lack an alt attribute in the HTML.`,
      rules.alt,
    );
  if (!attrs(body.match(/<html\b[^>]*>/i)?.[0] ?? "").lang)
    add(
      "language",
      "No language attribute was found on the HTML element.",
      rules.language,
    );
  if (httpStatus >= 400) add("http", `Server returned HTTP ${httpStatus}.`, 0);
  findings.push({
    key: "mobile",
    kind: "HEURISTIC",
    text: viewport
      ? "A viewport tag is a positive mobile signal; actual mobile usability was not tested."
      : "Review mobile layout manually. A missing viewport alone does not prove poor usability.",
    points: 0,
  });
  findings.push({
    key: "structured",
    kind: "HEURISTIC",
    text: /application\/ld\+json|itemscope/i.test(html)
      ? "Possible structured data found; validity was not checked."
      : "No clear structured data found in the response; review requirements manually.",
    points: 0,
  });
  findings.push({
    key: "limits",
    kind: "UNKNOWN",
    text: "Rankings, conversions, performance, contrast, keyboard access and JavaScript-rendered content were not measured.",
    points: 0,
  });
  return {
    url,
    httpStatus,
    title,
    metaDescription: clean(description),
    headings,
    images: images.length,
    missingAlt,
    findings,
  };
}
export function scoreLead(
  input: {
    registryVerified: boolean;
    industryCode: string;
    websiteStatus: string;
  },
  audit: AuditData | null,
  config: LeadConfig,
) {
  if (
    !audit ||
    input.websiteStatus !== "VERIFIED" ||
    audit.httpStatus < 200 ||
    audit.httpStatus >= 300
  )
    return {
      value: null,
      assessment: "INSUFFICIENT",
      reasons: [
        {
          text: "Insufficient data. An unknown website is not evidence of poor quality.",
          points: 0,
        },
      ],
    };
  const reasons = audit.findings
    .filter(
      (f) =>
        f.kind === "VERIFIED" &&
        (config.rules[f.key as keyof LeadConfig["rules"]] ?? 0) > 0,
    )
    .map((f) => ({
      text: f.text,
      points: config.rules[f.key as keyof LeadConfig["rules"]] ?? 0,
    }));
  if (input.registryVerified)
    reasons.push({
      text: "Company information verified by Enhetsregisteret.",
      points: config.rules.company,
    });
  if (
    Object.values(config.mappings)
      .flat()
      .some((prefix) => input.industryCode.startsWith(prefix))
  )
    reasons.push({
      text: "Industry matches the selected service categories.",
      points: config.rules.industry,
    });
  return {
    value: Math.min(
      100,
      reasons.reduce((a, r) => a + r.points, 0),
    ),
    assessment: "ASSESSED",
    reasons,
  };
}
export function draftEmail(
  name: string,
  template: string,
  audit: AuditData | null,
) {
  const observations =
    audit?.findings
      .filter(
        (f) =>
          f.kind === "VERIFIED" &&
          ["title", "description", "viewport", "alt"].includes(f.key),
      )
      .slice(0, 2) ?? [];
  const intro = observations.length
    ? `A basic check of the publicly available HTML showed: ${observations.map((o) => leadSystemText(o.text)).join(" ")} These are technical observations, not a complete website assessment.`
    : "I came across " +
      name +
      " and wondered whether you have plans for your website or digital tools.";
  const offer =
    template === "SEO"
      ? "We can help with content and technical search engine optimization."
      : template === "TOOLS"
        ? "We can help with digital tools and practical workflow automation."
        : "We can help with website development and improvements to existing websites.";
  return {
    subject: `An idea for ${name}`.slice(0, 180),
    body: `Hello ${name},\n\nI run Rise Digital, helping businesses with websites and digital solutions.\n\n${intro}\n\n${offer}\n\nWould you be interested in a brief, no-obligation conversation?\n\nPlease let us know if you would prefer not to hear from us again.\n\nKind regards,\nRise Digital\nkontakt@risedigital.no`,
  };
}
