import { z } from "zod";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  searchSchema,
  areaCodes,
  leadInput,
  type LeadConfig,
  type SearchInput,
} from "../../lib/leads";
export const registryBase =
  "https://data.brreg.no/enhetsregisteret/api/enheter";
const unit = z.object({
  organisasjonsnummer: z.string(),
  navn: z.string(),
  hjemmeside: z.string().optional(),
  epostadresse: z.string().optional(),
  naeringskode1: z
    .object({ kode: z.string(), beskrivelse: z.string() })
    .optional(),
  forretningsadresse: z
    .object({
      kommune: z.string().optional(),
      kommunenummer: z.string().optional(),
    })
    .optional(),
  konkurs: z.boolean().optional(),
  underAvvikling: z.boolean().optional(),
  underTvangsavviklingEllerTvangsopplosning: z.boolean().optional(),
  slettedato: z.string().optional(),
});
const envelope = z.object({
  _embedded: z.object({ enheter: z.array(z.unknown()) }).optional(),
  page: z.object({
    number: z.number().int(),
    size: z.number().int(),
    totalPages: z.number().int(),
    totalElements: z.number().int(),
  }),
});
export type RegistryCompany = z.infer<typeof leadInput> & {
  active: boolean | null;
  sourceUrl: string;
};
export function registryUrl(input: SearchInput, config: LeadConfig) {
  const q = searchSchema.parse(input);
  const url = new URL(registryBase);
  url.searchParams.set("size", String(Math.min(q.limit, config.maxResults)));
  url.searchParams.set("page", String(q.page));
  url.searchParams.set("sort", "organisasjonsnummer,ASC");
  const codes = q.municipality ? [q.municipality] : areaCodes[q.area];
  if (codes.length)
    url.searchParams.set("forretningsadresse.kommunenummer", codes.join(","));
  if (q.name) url.searchParams.set("navn", q.name);
  if (q.industry !== "ALL")
    url.searchParams.set("naeringskode", config.mappings[q.industry].join(","));
  if (q.active) {
    url.searchParams.set("konkurs", "false");
    url.searchParams.set("underAvvikling", "false");
    url.searchParams.set("underTvangsavviklingEllerTvangsopplosning", "false");
  }
  return url;
}
export function parseRegistry(data: unknown, activeOnly: boolean) {
  const parsed = envelope.parse(data);
  let skipped = 0;
  const companies: RegistryCompany[] = [];
  for (const raw of parsed._embedded?.enheter ?? []) {
    const result = unit.safeParse(raw);
    if (!result.success) {
      skipped++;
      continue;
    }
    const u = result.data;
    const inactive = !!(
      u.slettedato ||
      u.konkurs ||
      u.underAvvikling ||
      u.underTvangsavviklingEllerTvangsopplosning
    );
    if (u.slettedato || (activeOnly && inactive)) {
      skipped++;
      continue;
    }
    const active = inactive
      ? false
      : [
            u.konkurs,
            u.underAvvikling,
            u.underTvangsavviklingEllerTvangsopplosning,
          ].every((v) => v === false)
        ? true
        : null;
    const normalized = leadInput.safeParse({
      companyName: u.navn,
      orgNumber: u.organisasjonsnummer,
      industry: u.naeringskode1?.beskrivelse ?? "",
      industryCode: u.naeringskode1?.kode ?? "",
      municipality: u.forretningsadresse?.kommune ?? "",
      municipalityCode: u.forretningsadresse?.kommunenummer ?? "",
      website: u.hjemmeside ?? "",
      email: z.email().safeParse(u.epostadresse).success ? u.epostadresse : "",
    });
    if (!normalized.success) {
      const fallback = leadInput.safeParse({
        companyName: u.navn,
        orgNumber: u.organisasjonsnummer,
        industry: u.naeringskode1?.beskrivelse ?? "",
        industryCode: u.naeringskode1?.kode ?? "",
        municipality: u.forretningsadresse?.kommune ?? "",
        municipalityCode: u.forretningsadresse?.kommunenummer ?? "",
        email: z.email().safeParse(u.epostadresse).success
          ? u.epostadresse
          : "",
      });
      if (!fallback.success) {
        skipped++;
        continue;
      }
      companies.push({
        ...fallback.data,
        active,
        sourceUrl: `${registryBase}/${u.organisasjonsnummer}`,
      });
    } else
      companies.push({
        ...normalized.data,
        active,
        sourceUrl: `${registryBase}/${u.organisasjonsnummer}`,
      });
  }
  return { companies, page: parsed.page, skipped };
}
export async function registrySearch(
  input: SearchInput,
  config: LeadConfig,
  fetcher: typeof fetch = fetch,
) {
  const url = registryUrl(input, config);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(12000),
        redirect: "error",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "RiseDigitalHub/1.0 (local business directory; kontakt@risedigital.no)",
        },
        cache: "no-store",
      });
      if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
        const wait = Math.min(
          10000,
          Math.max(
            1000,
            Number(response.headers.get("retry-after")) * 1000 ||
              1000 * 2 ** attempt,
          ),
        );
        await response.body?.cancel();
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!response.ok)
        throw new Error(`Brønnøysund returned HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty response from Brønnøysund");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2000000) {
          await reader.cancel();
          throw new Error("Registry response was too large");
        }
        chunks.push(value);
      }
      return parseRegistry(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
        input.active,
      );
    } catch (e) {
      if (attempt === 2)
        throw new Error(
          e instanceof Error && e.message.startsWith("Brønnøysund")
            ? e.message
            : "Could not fetch registry data. Check your connection and try again.",
        );
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error("Registry unavailable");
}
const globalKeys = globalThis as unknown as { leadSigningKey?: Buffer };
const secret = (globalKeys.leadSigningKey ??= randomBytes(32));
export function signCompanies(
  organizationId: string,
  companies: RegistryCompany[],
) {
  const payload = Buffer.from(
    JSON.stringify({
      organizationId,
      companies,
      expires: Date.now() + 15 * 60000,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}
export function verifyCompanies(
  token: string,
  organizationId: string,
): RegistryCompany[] {
  if (token.length > 500000 || !/^[-A-Za-z0-9_]+\.[a-f0-9]{64}$/.test(token))
    throw new Error("Invalid preview. Search again.");
  const [payload, signature] = token.split(".");
  const hash = createHmac("sha256", secret)
    .update(payload ?? "")
    .digest();
  const supplied = Buffer.from(signature ?? "", "hex");
  if (hash.length !== supplied.length || !timingSafeEqual(hash, supplied))
    throw new Error("Invalid preview. Search again.");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (decoded.organizationId !== organizationId || decoded.expires < Date.now())
    throw new Error("Preview expired. Search again.");
  return z
    .array(
      leadInput.extend({
        active: z.boolean().nullable(),
        sourceUrl: z.string().url(),
      }),
    )
    .max(100)
    .parse(decoded.companies);
}
