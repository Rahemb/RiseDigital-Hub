import assert from "node:assert/strict";
import { registrySearch } from "../src/server/leads/brreg";
import { defaultConfig, searchSchema } from "../src/lib/leads";
import { fetchPublic } from "../src/server/leads/public-web";
for (const [area, code] of [
  ["OSLO", "0301"],
  ["LILLESTROM", "3205"],
  ["LORENSKOG", "3222"],
  ["NORWAY", ""],
]) {
  const result = await registrySearch(
    searchSchema.parse({ area, limit: 2 }),
    defaultConfig,
  );
  assert.ok(result.companies.length);
  if (code)
    assert.ok(result.companies.every((c) => c.municipalityCode === code));
  console.log(
    `PASS ${area}: ${result.companies.length} companies, HAL page ${result.page.number}`,
  );
  await new Promise((r) => setTimeout(r, 1500));
}
const first = await registrySearch(
  searchSchema.parse({ area: "LOCAL", industry: "BEAUTY", limit: 2 }),
  defaultConfig,
);
await new Promise((r) => setTimeout(r, 1500));
const second = await registrySearch(
  searchSchema.parse({ area: "LOCAL", industry: "BEAUTY", limit: 2, page: 1 }),
  defaultConfig,
);
assert.equal(second.page.number, 1);
assert.ok(first.companies.length && second.companies.length);
assert.ok(
  second.companies.every(
    (c) => !first.companies.some((a) => a.orgNumber === c.orgNumber),
  ),
);
assert.ok(
  first.companies.every(
    (c) =>
      ["0301", "3205", "3222"].includes(c.municipalityCode) &&
      c.industryCode.startsWith("96.2"),
  ),
);
console.log("PASS local industry filter and separate registry pages");
const web = await fetchPublic("https://risedigital.no");
assert.ok(web.status >= 200 && web.status < 300);
assert.match(web.type, /html/);
assert.ok(web.body.length);
console.log(
  `PASS pinned public website request, robots check and HTML response: HTTP ${web.status}, ${Buffer.byteLength(web.body)} bytes. No live database writes.`,
);
