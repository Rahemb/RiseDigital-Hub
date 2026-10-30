import { z } from "zod";
import { orgNumber } from "../../lib/leads";
import { publicUrl } from "./public-web";
import type {
  WebsiteCandidate,
  SourceCheck,
} from "../../lib/website-discovery";
const sourceState = globalThis as unknown as {
  discoverySources?: Map<string, { next: number; blocked: number }>;
};
const slots = (sourceState.discoverySources ??= new Map());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function sourceJson(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const parsed = new URL(url);
  if (
    !["data.brreg.no", "query.wikidata.org"].includes(parsed.hostname) ||
    parsed.protocol !== "https:"
  )
    throw new Error("Unknown source");
  const slot = slots.get(parsed.hostname) ?? { next: 0, blocked: 0 };
  slots.set(parsed.hostname, slot);
  if (slot.blocked > Date.now())
    throw new Error("The source requested a pause. Try again later.");
  const wait = Math.max(0, slot.next - Date.now());
  slot.next = Math.max(slot.next, Date.now()) + 1600;
  await sleep(wait);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(parsed, {
        redirect: "error",
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        headers: {
          Accept: "application/json, application/sparql-results+json",
          "User-Agent":
            "RiseDigitalHub/1.0 (company website discovery; kontakt@risedigital.no)",
        },
      });
      if (response.status === 429) {
        const header = response.headers.get("retry-after") ?? "";
        const seconds = Number(header);
        const delay =
          Number.isFinite(seconds) && seconds > 0
            ? seconds * 1000
            : Math.max(60000, Date.parse(header) - Date.now() || 0);
        slot.blocked = Date.now() + Math.max(60000, delay);
        await response.body?.cancel();
        throw new Error(
          "The source has limited requests. Wait before retrying.",
        );
      }
      if ([502, 503, 504].includes(response.status) && attempt === 0) {
        await response.body?.cancel();
        await sleep(2000);
        continue;
      }
      if (!response.ok)
        throw new Error(`The source returned HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty response");
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1000000) {
          await reader.cancel();
          throw new Error("The source response exceeds the size limit");
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (e) {
      if (
        attempt === 0 &&
        (e instanceof TypeError || e instanceof DOMException)
      ) {
        await sleep(2000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Source unavailable");
}
export const registryEntity = z.object({
  organisasjonsnummer: z.string(),
  navn: z.string(),
  hjemmeside: z.string().nullish(),
  slettedato: z.string().nullish(),
  konkurs: z.boolean().optional(),
  underAvvikling: z.boolean().optional(),
  underTvangsavviklingEllerTvangsopplosning: z.boolean().optional(),
});
export type SourceReader = (url: string) => Promise<unknown>;
export function addCandidate(
  list: WebsiteCandidate[],
  raw: string | undefined | null,
  source: string,
  sourceUrl: string,
  exactOrganization = true,
) {
  if (!raw) return;
  try {
    if (raw.length > 1000) throw new Error("URL is too long");
    const url = publicUrl(raw);
    if (url.search || url.hash) url.hash = "";
    const key =
      url.hostname.replace(/^www\./, "") +
      url.pathname.replace(/\/$/, "") +
      url.search;
    const existing = list.find((c) => {
      if (!URL.canParse(c.url)) return false;
      const u = new URL(c.url);
      return (
        u.hostname.replace(/^www\./, "") +
          u.pathname.replace(/\/$/, "") +
          u.search ===
        key
      );
    });
    if (existing) {
      if (!existing.source.includes(source)) {
        existing.source += " + " + source;
        existing.evidence.push(`Also listed in ${source}: ${sourceUrl}`);
        existing.exactOrganization ||= exactOrganization;
      }
      return;
    }
    list.push({
      url: url.href,
      source,
      sourceUrl,
      exactOrganization,
      status: "UNTESTED",
      evidence: [
        exactOrganization
          ? "The source associates this URL with the organization number."
          : "Existing website URL; company association needs verification.",
      ],
    });
  } catch {
    list.push({
      url: raw.slice(0, 1000),
      source,
      sourceUrl,
      exactOrganization,
      status: "FAILED",
      evidence: ["Invalid or internal URL rejected before network access."],
    });
  }
}
export async function findCandidates(
  lead: { orgNumber: string; website: string },
  read: SourceReader = sourceJson,
) {
  const org = orgNumber.parse(lead.orgNumber);
  const candidates: WebsiteCandidate[] = [];
  const sources: SourceCheck[] = [];
  let officialName = "";
  let registryAvailable = false;
  let inactive = false;
  if (lead.website)
    addCandidate(
      candidates,
      lead.website,
      "Existing website URL",
      "Manually entered or previously imported",
      false,
    );
  const entityUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${org}`;
  try {
    const entity = registryEntity.parse(await read(entityUrl));
    if (entity.organisasjonsnummer !== org)
      throw new Error("The organization number in the response does not match");
    registryAvailable = true;
    officialName = entity.navn;
    inactive = !!(
      entity.slettedato ||
      entity.konkurs ||
      entity.underAvvikling ||
      entity.underTvangsavviklingEllerTvangsopplosning
    );
    if (!inactive)
      addCandidate(
        candidates,
        entity.hjemmeside,
        "Enhetsregisteret",
        entityUrl,
      );
    sources.push({
      source: "Enhetsregisteret",
      status: "OK",
      url: entityUrl,
      message: inactive
        ? "Deletion or closure registered. Automatic association stopped."
        : entity.hjemmeside
          ? "Website field found."
          : "Website field not provided.",
    });
  } catch (e) {
    sources.push({
      source: "Enhetsregisteret",
      status: "FAILED",
      url: entityUrl,
      message: (e as Error).message,
    });
  }
  if (inactive)
    return { candidates, sources, officialName, registryAvailable, inactive };
  const subUrl = `https://data.brreg.no/enhetsregisteret/api/underenheter?overordnetEnhet=${org}&size=20&page=0`;
  try {
    const envelope = z
      .object({
        _embedded: z
          .object({
            underenheter: z.array(
              z.object({
                organisasjonsnummer: z.string(),
                overordnetEnhet: z.string(),
                hjemmeside: z.string().nullish(),
                slettedato: z.string().nullish(),
                nedleggelsesdato: z.string().nullish(),
              }),
            ),
          })
          .optional(),
        page: z.object({ totalPages: z.number() }),
      })
      .parse(await read(subUrl));
    for (const unit of envelope._embedded?.underenheter ?? [])
      if (
        unit.overordnetEnhet === org &&
        !unit.slettedato &&
        !unit.nedleggelsesdato
      )
        addCandidate(
          candidates,
          unit.hjemmeside,
          "Enhetsregisteret – subunit",
          `https://data.brreg.no/enhetsregisteret/api/underenheter/${unit.organisasjonsnummer}`,
        );
    sources.push({
      source: "Underenheter",
      status: "OK",
      url: subUrl,
      message: `Checked the first page of up to 20 subunits.${envelope.page.totalPages > 1 ? " More pages exist; this search is intentionally bounded." : ""}`,
    });
  } catch (e) {
    sources.push({
      source: "Underenheter",
      status: "FAILED",
      url: subUrl,
      message: (e as Error).message,
    });
  }
  const wd = new URL("https://query.wikidata.org/sparql");
  wd.searchParams.set("format", "json");
  wd.searchParams.set(
    "query",
    `SELECT ?item ?website WHERE { ?item wdt:P2333 "${org}"; p:P856 ?statement. ?statement ps:P856 ?website; wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank) FILTER NOT EXISTS { ?statement pq:P582 ?end } } LIMIT 5`,
  );
  try {
    const data = z
      .object({
        results: z.object({
          bindings: z.array(
            z.object({
              item: z.object({ value: z.string() }),
              website: z.object({ value: z.string() }),
            }),
          ),
        }),
      })
      .parse(await read(wd.href));
    for (const row of data.results.bindings) {
      if (!/^https?:\/\/www\.wikidata\.org\/entity\/Q\d+$/.test(row.item.value))
        continue;
      addCandidate(
        candidates,
        row.website.value,
        "Wikidata (CC0)",
        row.item.value.replace("http:", "https:"),
      );
    }
    sources.push({
      source: "Wikidata",
      status: "OK",
      url: wd.href,
      message: `${data.results.bindings.length} entries with the exact organization number. Community maintained; website association requires separate verification.`,
    });
  } catch (e) {
    sources.push({
      source: "Wikidata",
      status: "FAILED",
      url: wd.href,
      message: (e as Error).message,
    });
  }
  return {
    candidates: candidates.slice(0, 5),
    sources,
    officialName,
    registryAvailable,
    inactive,
  };
}
