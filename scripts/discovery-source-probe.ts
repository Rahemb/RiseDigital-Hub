export {};
const headers = {
  "User-Agent":
    "RiseDigitalHub/1.0 (local company website discovery; kontakt@risedigital.no)",
  Accept: "application/json",
};
for (const org of ["993101583", "974760673"]) {
  for (const resource of [
    `enheter/${org}`,
    `underenheter?overordnetEnhet=${org}&size=5`,
  ]) {
    const response = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/${resource}`,
      { headers, signal: AbortSignal.timeout(15000) },
    );
    const data = await response.json();
    console.log(
      JSON.stringify({
        source: resource,
        status: response.status,
        org: data.organisasjonsnummer,
        name: data.navn,
        website: data.hjemmeside,
        subunits: data._embedded?.underenheter?.map(
          (r: Record<string, unknown>) => ({
            org: r.organisasjonsnummer,
            parent: r.overordnetEnhet,
            website: r.hjemmeside,
          }),
        ),
        page: data.page,
      }),
    );
    await new Promise((r) => setTimeout(r, 1500));
  }
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("format", "json");
  url.searchParams.set(
    "query",
    `SELECT ?item ?website WHERE { ?item wdt:P2333 "${org}"; wdt:P856 ?website. } LIMIT 5`,
  );
  try {
    const response = await fetch(url, {
      headers: { ...headers, Accept: "application/sparql-results+json" },
      signal: AbortSignal.timeout(15000),
    });
    console.log(
      JSON.stringify({
        source: "Wikidata",
        org,
        status: response.status,
        body: (await response.text()).slice(0, 1800),
      }),
    );
  } catch (e) {
    console.log("Wikidata unavailable:", (e as Error).message);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
