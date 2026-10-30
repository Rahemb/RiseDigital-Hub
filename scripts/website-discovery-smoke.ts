import assert from "node:assert/strict";
import { discoverWebsite } from "../src/server/leads/discovery-matching";
import { registrySearch } from "../src/server/leads/brreg";
import { defaultConfig, searchSchema } from "../src/lib/leads";
const inputs = [
  { orgNumber: "993101583", companyName: "Wikimedia Norge" },
  { orgNumber: "974760673", companyName: "Registerenheten i Brønnøysund" },
];
if (process.argv.includes("--sample20")) {
  const sample = await registrySearch(
    searchSchema.parse({ area: "LOCAL", industry: "BEAUTY", limit: 20 }),
    defaultConfig,
  );
  inputs.push(
    ...sample.companies.map((c) => ({
      orgNumber: c.orgNumber,
      companyName: c.companyName,
    })),
  );
  assert.equal(sample.companies.length, 20);
}
const counts: Record<string, number> = {};
for (const lead of inputs) {
  const result = await discoverWebsite({ ...lead, website: "" });
  counts[result.status] = (counts[result.status] ?? 0) + 1;
  console.log(
    JSON.stringify({
      company: lead.companyName,
      org: lead.orgNumber,
      status: result.status,
      website: result.selectedUrl,
      candidates: result.candidates.map((c) => ({
        url: c.url,
        status: c.status,
        source: c.source,
        evidence: c.evidence,
      })),
      sources: result.sources.map((s) => ({
        source: s.source,
        status: s.status,
        message: s.message,
      })),
    }),
  );
}
console.log(
  JSON.stringify({
    summary: counts,
    records: inputs.length,
    databaseWrites: 0,
  }),
);
