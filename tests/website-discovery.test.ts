import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import {
  companyEvidence,
  contactLinks,
  verifyCandidate,
  discoverWebsite,
} from "../src/server/leads/discovery-matching";
import {
  findCandidates,
  addCandidate,
  sourceJson,
} from "../src/server/leads/discovery-sources";
import {
  startDiscoveryBatch,
  processDiscoveryItem,
  controlDiscoveryBatch,
  getDiscoveryBatch,
  confirmWebsiteCandidate,
} from "../src/server/leads/discovery-jobs";
import { importLeads, editLead, auditLead } from "../src/server/leads/service";
import { leadInput } from "../src/lib/leads";
import type {
  WebsiteCandidate,
  DiscoveryResult,
} from "../src/lib/website-discovery";
const org = "974760673";
test("source response bounds and Retry-After stop repeated requests", async () => {
  await assert.rejects(
    sourceJson(
      "https://query.wikidata.org/sparql",
      async () => new Response("x".repeat(1000001)),
    ),
    /size limit/,
  );
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response("", { status: 429, headers: { "Retry-After": "120" } });
  };
  await assert.rejects(
    sourceJson(
      "https://data.brreg.no/enhetsregisteret/api/enheter/974760673",
      fetcher,
    ),
    /limited/,
  );
  await assert.rejects(
    sourceJson(
      "https://data.brreg.no/enhetsregisteret/api/enheter/974760673",
      fetcher,
    ),
    /pause/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    sourceJson("http://127.0.0.1/private", fetcher),
    /Unknown/,
  );
});
const candidate: WebsiteCandidate = {
  url: "https://company.example.org/",
  source: "Enhetsregisteret",
  sourceUrl: "https://data.brreg.no/enhetsregisteret/api/enheter/" + org,
  exactOrganization: true,
  status: "UNTESTED",
  evidence: [],
};
test("identity verification requires on-site identifiers, not HTTP 200, similar domains or names", async () => {
  const read =
    (body: string, url = candidate.url) =>
    async () => ({ url, status: 200, type: "text/html", body });
  assert.equal(
    (
      await verifyCandidate(
        candidate,
        "Example Company AS",
        org,
        read("<h1>Example Company</h1>"),
      )
    ).status,
    "POSSIBLE",
  );
  assert.equal(
    (
      await verifyCandidate(
        candidate,
        "Example Company AS",
        org,
        read(
          "<h1>Example Company</h1><footer>Org.nr. 974 760 673 MVA</footer>",
        ),
      )
    ).status,
    "VERIFIED",
  );
  assert.equal(
    (
      await verifyCandidate(
        candidate,
        "Example Company AS",
        org,
        read(
          "<script>974760673</script><!-- 974760673 --><h1>Example Company</h1>",
        ),
      )
    ).status,
    "POSSIBLE",
  );
  assert.equal(
    (
      await verifyCandidate(
        candidate,
        "Example Company AS",
        org,
        read("974760673", "https://different.example.org/"),
      )
    ).status,
    "POSSIBLE",
  );
  assert.equal(
    (
      await verifyCandidate(
        candidate,
        "Example Company AS",
        org,
        read("974760673"),
        false,
      )
    ).status,
    "POSSIBLE",
  );
  assert.equal(
    (
      await verifyCandidate(
        { ...candidate, exactOrganization: false },
        "Example Company AS",
        org,
        read("974760673"),
      )
    ).status,
    "POSSIBLE",
  );
  assert.equal(
    (
      await verifyCandidate(
        { ...candidate, exactOrganization: false },
        "Example Company AS",
        org,
        read("Example Company AS · 974760673"),
      )
    ).status,
    "VERIFIED",
  );
  assert.equal(companyEvidence("19747606730", "Example", org).orgMatch, false);
  assert.equal(
    (
      await verifyCandidate(
        { ...candidate, url: "http://127.0.0.1" },
        "Example",
        org,
        async () => {
          throw new Error("Must not request");
        },
      )
    ).status,
    "FAILED",
  );
  assert.equal(
    (
      await verifyCandidate(
        { ...candidate, url: "https://facebook.com/company" },
        "Example",
        org,
        async () => {
          throw new Error("Must not request");
        },
      )
    ).status,
    "POSSIBLE",
  );
});
test("only observed same-origin contact links are followed, bounded at two, with source evidence", async () => {
  const html =
    '<a href="/kontakt">Kontakt</a><a href="https://other.example.org/contact">Contact</a><a href="http://127.0.0.1/about">About</a><a href="/about.pdf">About</a><a href="/about">Om oss</a><a href="/privacy">Personvern</a>';
  assert.deepEqual(contactLinks(html, candidate.url), [
    "https://company.example.org/kontakt",
    "https://company.example.org/about",
  ]);
  const calls: string[] = [];
  const result = await verifyCandidate(
    candidate,
    "Example",
    org,
    async (url) => {
      calls.push(url);
      return {
        url,
        status: 200,
        type: "text/html",
        body: url.endsWith("/kontakt") ? "Org.nr. 974.760.673" : html,
      };
    },
  );
  assert.equal(result.status, "VERIFIED");
  assert.equal(calls.length, 2);
  assert.ok(result.evidence.some((e) => e.includes("/kontakt")));
});
test("source parsing preserves exact organization linkage, deduplicates and handles empty/errors", async () => {
  const read = async (url: string) =>
    url.includes("/enheter/")
      ? { organisasjonsnummer: org, navn: "Example Company AS" }
      : url.includes("/underenheter?")
        ? {
            _embedded: {
              underenheter: [
                {
                  organisasjonsnummer: "913003934",
                  overordnetEnhet: org,
                  hjemmeside: "company.example.org",
                },
                {
                  organisasjonsnummer: "913003934",
                  overordnetEnhet: "993101583",
                  hjemmeside: "wrong.example.org",
                },
              ],
            },
            page: { totalPages: 1 },
          }
        : {
            results: {
              bindings: [
                {
                  item: { value: "http://www.wikidata.org/entity/Q123" },
                  website: { value: "https://company.example.org/" },
                },
              ],
            },
          };
  const result = await findCandidates({ orgNumber: org, website: "" }, read);
  assert.equal(result.candidates.length, 1);
  assert.match(result.candidates[0].source, /Wikidata/);
  assert.equal(result.registryAvailable, true);
  assert.equal(result.officialName, "Example Company AS");
  const verified = await discoverWebsite(
    { orgNumber: org, website: "" },
    {
      source: read,
      website: async (url) => ({
        url,
        status: 200,
        type: "text/html",
        body: "Example Company · Organisasjonsnummer 974760673",
      }),
    },
  );
  assert.equal(verified.status, "VERIFIED");
  const empty = await discoverWebsite(
    { orgNumber: org, website: "" },
    {
      source: async (url) =>
        url.includes("/enheter/")
          ? { organisasjonsnummer: org, navn: "Example Company AS" }
          : url.includes("/underenheter?")
            ? { page: { totalPages: 0 } }
            : { results: { bindings: [] } },
    },
  );
  assert.equal(empty.status, "NONE");
  assert.equal(empty.selectedUrl, "");
  const failed = await discoverWebsite(
    { orgNumber: org, website: "" },
    {
      source: async () => {
        throw new Error("Unavailable");
      },
    },
  );
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.sources.length, 3);
  const list: WebsiteCandidate[] = [];
  addCandidate(list, "https://company.example.org", "Registry", "source");
  addCandidate(list, "https://www.company.example.org/", "Wikidata", "source");
  assert.equal(list.length, 1);
  addCandidate(list, "http://169.254.169.254", "Registry", "source");
  assert.equal(list[1].status, "FAILED");
  const malformed: WebsiteCandidate[] = [];
  addCandidate(malformed, "http://[invalid", "Registry", "source");
  addCandidate(malformed, "https://valid.example.org", "Registry", "source");
  assert.equal(malformed[1].status, "UNTESTED");
  addCandidate(
    malformed,
    "https://valid.example.org/" + "x".repeat(1001),
    "Registry",
    "source",
  );
  assert.equal(malformed[2].status, "FAILED");
});
function companyNumber(n: number) {
  for (let i = 90000000 + n; i < 99999999; i++) {
    const s = String(i),
      sum = [3, 2, 7, 6, 5, 4, 3, 2].reduce(
        (a, w, j) => a + w * Number(s[j]),
        0,
      ),
      check = (11 - (sum % 11)) % 11;
    if (check < 10) return s + check;
  }
  throw new Error("No number");
}
function result(status: DiscoveryResult["status"]): DiscoveryResult {
  return {
    status,
    selectedUrl: status === "VERIFIED" ? candidate.url : "",
    officialName: "Test AS",
    explanation: "Testresultat med dokumenterte opplysninger",
    sources: [],
    candidates:
      status === "NONE" || status === "FAILED"
        ? []
        : [
            {
              ...candidate,
              status: status === "VERIFIED" ? "VERIFIED" : "POSSIBLE",
            },
          ],
  };
}
test("20-company queue: deduplication, single-worker lock, pause/resume, outcomes, retry, tenant isolation, persistence and manual fallback", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "rise-discovery-"));
  const filename = path.join(dir, "test.db");
  const sql = new DatabaseSync(filename);
  for (const m of (await readdir("prisma/migrations"))
    .filter((x) => x !== "migration_lock.toml")
    .sort())
    sql.exec(
      await readFile(
        path.join("prisma/migrations", m, "migration.sql"),
        "utf8",
      ),
    );
  sql.close();
  let db = new PrismaClient({
    datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
  });
  try {
    const orgA = await db.organization.create({
        data: { name: "Discovery test" },
      }),
      orgB = await db.organization.create({
        data: { name: "Other workspace" },
      });
    const inputs = Array.from({ length: 20 }, (_, i) =>
      leadInput.parse({
        companyName: `Company ${i}`,
        orgNumber: companyNumber(i * 10),
      }),
    );
    const ids = (await importLeads(db, orgA.id, "MANUAL", inputs)).ids;
    assert.equal(ids.length, 20);
    let batch = await startDiscoveryBatch(db, orgA.id, {
      ids: [...ids, ids[0]],
      analyze: false,
    });
    assert.equal(batch?.total, 20);
    await assert.rejects(startDiscoveryBatch(db, orgA.id, { ids }));
    await assert.rejects(startDiscoveryBatch(db, orgB.id, { ids }));
    assert.equal(await getDiscoveryBatch(db, orgB.id), null);
    await controlDiscoveryBatch(db, orgA.id, "pause");
    assert.equal((await processDiscoveryItem(db, orgA.id))?.completed, 0);
    await controlDiscoveryBatch(db, orgA.id, "resume");
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const running = processDiscoveryItem(db, orgA.id, {
      discover: async () => {
        calls++;
        await gate;
        return result("VERIFIED");
      },
    });
    while (calls === 0) await new Promise((r) => setTimeout(r, 5));
    assert.equal(
      (
        await processDiscoveryItem(db, orgA.id, {
          discover: async () => {
            throw new Error("Duplicate worker");
          },
        })
      )?.completed,
      0,
    );
    release();
    await running;
    assert.equal(calls, 1);
    let ordinal = 1;
    for (let i = 1; i < 20; i++)
      await processDiscoveryItem(db, orgA.id, {
        discover: async () => {
          const state = (["VERIFIED", "POSSIBLE", "NONE", "FAILED"] as const)[
            ordinal++ % 4
          ];
          return result(state);
        },
      });
    batch = await getDiscoveryBatch(db, orgA.id);
    assert.equal(batch?.status, "COMPLETE");
    assert.equal(batch?.completed, 20);
    assert.equal(batch?.verified, 5);
    assert.equal(batch?.possible, 5);
    assert.equal(batch?.none, 5);
    assert.equal(batch?.failed, 5);
    assert.equal(
      await db.lead.count({
        where: { organizationId: orgA.id, website: candidate.url },
      }),
      5,
    );
    assert.equal(await db.websiteDiscovery.count(), 20);
    await db.$disconnect();
    db = new PrismaClient({
      datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
    });
    assert.equal((await getDiscoveryBatch(db, orgA.id))?.completed, 20);
    await db.websiteDiscovery.updateMany({ data: { checkedAt: new Date(0) } });
    await controlDiscoveryBatch(db, orgA.id, "retry");
    for (let i = 0; i < 5; i++)
      await processDiscoveryItem(db, orgA.id, {
        discover: async () => result("NONE"),
      });
    assert.equal((await getDiscoveryBatch(db, orgA.id))?.failed, 0);
    const possible = await db.websiteDiscovery.findFirstOrThrow({
      where: { status: "POSSIBLE" },
    });
    await assert.rejects(
      confirmWebsiteCandidate(
        db,
        orgB.id,
        possible.leadId,
        0,
        "Manuelt kontrollert offentlig identitet",
      ),
    );
    await assert.rejects(
      confirmWebsiteCandidate(db, orgA.id, possible.leadId, 0, "short"),
    );
    await confirmWebsiteCandidate(
      db,
      orgA.id,
      possible.leadId,
      0,
      "Manuelt kontrollert organisasjonsnummer på kontaktsiden",
    );
    assert.equal(
      (
        await db.websiteDiscovery.findUniqueOrThrow({
          where: { leadId: possible.leadId },
        })
      ).status,
      "VERIFIED",
    );
    const existing = ids[0];
    await db.lead.update({
      where: { id: existing },
      data: { website: "https://preserved.example.org/" },
    });
    await db.websiteDiscovery.updateMany({
      where: { leadId: existing },
      data: { checkedAt: new Date(0) },
    });
    await startDiscoveryBatch(db, orgA.id, { ids: [existing] });
    await processDiscoveryItem(db, orgA.id, {
      discover: async () => result("VERIFIED"),
    });
    assert.equal(
      (await db.lead.findUniqueOrThrow({ where: { id: existing } })).website,
      "https://preserved.example.org/",
    );
    assert.equal(
      (
        await db.websiteDiscovery.findUniqueOrThrow({
          where: { leadId: existing },
        })
      ).status,
      "POSSIBLE",
    );
    const plain = ids[19];
    await db.lead.update({
      where: { id: plain },
      data: { website: "", websiteStatus: "NO_WEBSITE" },
    });
    const all = await startDiscoveryBatch(db, orgA.id, { allWithout: true });
    assert.ok(all?.items.every((i) => i.leadId !== plain));
    await controlDiscoveryBatch(db, orgA.id, "cancel");
    assert.equal((await getDiscoveryBatch(db, orgA.id))?.status, "CANCELLED");
    const verifyId = ids[18];
    await db.lead.update({
      where: { id: verifyId },
      data: { website: "", websiteStatus: "UNKNOWN" },
    });
    await db.websiteDiscovery.updateMany({
      where: { leadId: verifyId },
      data: { checkedAt: new Date(0) },
    });
    await startDiscoveryBatch(db, orgA.id, { ids: [verifyId], analyze: true });
    await processDiscoveryItem(db, orgA.id, {
      discover: async () => result("VERIFIED"),
      audit: async (database, organizationId, id) =>
        auditLead(database, organizationId, id, async (url) => ({
          url,
          status: 200,
          type: "text/html",
          body: "<html><h1>Company</h1></html>",
        })),
    });
    assert.ok(
      (await db.lead.findUniqueOrThrow({ where: { id: verifyId } })).score !==
        null,
    );
    assert.equal(
      await db.websiteAudit.count({ where: { leadId: verifyId } }),
      1,
    );
    await editLead(db, orgA.id, verifyId, {
      companyName: "Changed",
      industry: "",
      industryCode: "",
      municipality: "",
      municipalityCode: "",
      website: "https://changed.example.org",
      email: "",
      emailSource: "",
      emailStatus: "UNVERIFIED",
      emailKind: "UNKNOWN",
      qualification: "NEW",
      notes: "",
      tags: "",
    });
    assert.equal(
      (
        await db.websiteDiscovery.findUniqueOrThrow({
          where: { leadId: verifyId },
        })
      ).status,
      "PENDING",
    );
    const abandoned = await startDiscoveryBatch(db, orgA.id, { ids: [plain] });
    await db.discoveryItem.updateMany({
      where: { batchId: abandoned!.id },
      data: { state: "RUNNING" },
    });
    await db.discoveryBatch.update({
      where: { id: abandoned!.id },
      data: { leaseUntil: new Date(0) },
    });
    await controlDiscoveryBatch(db, orgA.id, "cancel");
    assert.equal((await getDiscoveryBatch(db, orgA.id))?.completed, 1);
    await startDiscoveryBatch(db, orgA.id, { ids: [plain] });
    await controlDiscoveryBatch(db, orgA.id, "cancel");
  } finally {
    await db.$disconnect();
    await rm(dir, { recursive: true, force: true });
  }
});
