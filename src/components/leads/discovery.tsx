"use client";
import { useState } from "react";
import Link from "next/link";
import { discoverCompanies, researchCompany } from "@/app/lead-actions";
import { areas, industries } from "@/lib/leads";
import { GoogleSearch } from "./google-search";
import { Button } from "@/components/ui/button";
type Results = NonNullable<
  Awaited<ReturnType<typeof discoverCompanies>>["data"]
>;
export function Discovery() {
  const [query, setQuery] = useState({
    area: "LOCAL",
    industry: "ALL",
    name: "",
    municipality: "",
    limit: 25,
    active: true,
    exclude: false,
  });
  const [submitted, setSubmitted] = useState(query);
  const [result, setResult] = useState<Results>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [outcomes, setOutcomes] = useState<
    Record<string, { id?: string; clientId?: string }>
  >({});
  async function search(page = 0, paging = false) {
    setPending(true);
    setMessage("");
    try {
      const q = paging ? submitted : query;
      setSubmitted(q);
      const r = await discoverCompanies({ ...q, page });
      if (r.error) setMessage(r.error);
      setResult(r.data);
    } catch {
      setMessage("Search failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }
  async function choose(orgNumber: string, mode: "save" | "client") {
    if (!result) return;
    setPending(true);
    setMessage("");
    try {
      const r = await researchCompany(result.token, orgNumber, mode);
      setMessage(r.error ?? r.message ?? "");
      if (!r.error)
        setOutcomes((previous) => ({
          ...previous,
          [orgNumber]: { ...previous[orgNumber], ...r },
        }));
    } catch {
      setMessage("Could not save this company. Try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-4">
      <section className="panel p-5 space-y-4">
        <h2 className="font-semibold">Discover businesses</h2>
        <p className="text-sm text-muted-foreground">
          Company information from Brønnøysundregistrene. Research a company on
          Google, then add it to Clients or save it for later.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <label className="text-sm">
            Region
            <select
              value={query.area}
              onChange={(e) => setQuery({ ...query, area: e.target.value })}
            >
              {Object.entries(areas).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Industry
            <select
              value={query.industry}
              onChange={(e) => setQuery({ ...query, industry: e.target.value })}
            >
              {Object.entries(industries).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Company name
            <input
              value={query.name}
              maxLength={180}
              onChange={(e) => setQuery({ ...query, name: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="text-sm">
            Municipality code
            <input
              value={query.municipality}
              onChange={(e) =>
                setQuery({ ...query, municipality: e.target.value })
              }
              pattern="[0-9]{4}"
              placeholder="Optional override, e.g. 0301"
              title="Overrides the selected region"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Working…" : "Search Companies"}
          </Button>
        </form>
      </section>
      {message && (
        <p role="status" className="panel p-3 text-sm">
          {message}
        </p>
      )}
      {result && (
        <section className="panel p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.page.totalElements.toLocaleString("en-GB")} registry results
            · Page {result.page.number + 1} of{" "}
            {Math.max(1, result.page.totalPages)}
          </p>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  {["Company", "Industry", "Municipality", "Actions"].map(
                    (label) => (
                      <th key={label}>{label}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {result.companies.map((c) => {
                  const outcome = outcomes[c.orgNumber];
                  const clientId = outcome?.clientId ?? c.clientId;
                  return (
                    <tr key={c.orgNumber}>
                      <td className="font-medium">
                        {c.companyName}
                        <p className="text-xs text-muted-foreground font-normal">
                          {c.orgNumber}
                        </p>
                      </td>
                      <td>{c.industry || "—"}</td>
                      <td>{c.municipality || "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-2 items-center">
                          <GoogleSearch
                            companyName={c.companyName}
                            municipality={c.municipality}
                            compact
                          />
                          {clientId ? (
                            <Link
                              href={`/clients/${clientId}`}
                              className="text-blue-600 underline"
                            >
                              Open in Clients
                            </Link>
                          ) : (
                            <Button
                              disabled={pending}
                              onClick={() => choose(c.orgNumber, "client")}
                            >
                              Add to Clients as Lead
                            </Button>
                          )}
                          {outcome?.id ? (
                            <Link
                              href={`/leads/${outcome.id}`}
                              className="text-blue-600 underline"
                            >
                              Open saved lead
                            </Link>
                          ) : (
                            !clientId && (
                              <Button
                                variant="outline"
                                disabled={pending}
                                onClick={() => choose(c.orgNumber, "save")}
                              >
                                Save for Later
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!result.companies.length && (
            <p className="text-muted-foreground">
              No matching companies on this page. Try another page or change the
              filters.
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={pending || result.page.number === 0}
              onClick={() => search(result.page.number - 1, true)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                pending || result.page.number + 1 >= result.page.totalPages
              }
              onClick={() => search(result.page.number + 1, true)}
            >
              Next
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
