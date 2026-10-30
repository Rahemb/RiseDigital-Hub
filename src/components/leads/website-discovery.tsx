"use client";
import { leadSystemText } from "@/lib/lead-legacy-text";
import { selectVisibleLeads } from "@/lib/lead-research";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  startWebsiteDiscovery,
  stepWebsiteDiscovery,
  controlWebsiteDiscovery,
  confirmDiscoveredWebsite,
  websiteDiscoveryProgress,
} from "@/app/website-actions";
import {
  discoveryLabels,
  type WebsiteCandidate,
} from "@/lib/website-discovery";
type Batch = NonNullable<
  Awaited<ReturnType<typeof websiteDiscoveryProgress>>["batch"]
>;
export function DiscoveryStart({ id }: { id: string }) {
  const router = useRouter();
  const [analyze, setAnalyze] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="space-y-3">
      <label className="text-sm block">
        <input
          type="checkbox"
          checked={analyze}
          onChange={(e) => setAnalyze(e.target.checked)}
        />{" "}
        Find websites and audit verified matches
      </label>
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const result = await startWebsiteDiscovery({ ids: [id], analyze });
            if (result.error) setError(result.error);
            else router.push("/leads/websites");
          } catch {
            setError("Could not start website discovery");
          } finally {
            setPending(false);
          }
        }}
      >
        Find Websites Automatically
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}{" "}
          <Link className="underline" href="/leads/websites">
            Open queue
          </Link>
        </p>
      )}
    </div>
  );
}
export function ConfirmCandidate({
  id,
  candidates,
}: {
  id: string;
  candidates: WebsiteCandidate[];
}) {
  const [state, action, pending] = useActionState(
    confirmDiscoveredWebsite.bind(null, id),
    {},
  );
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          !confirm(
            "Confirm this website belongs to the company? Any existing website URL will be replaced.",
          )
        )
          e.preventDefault();
      }}
    >
      <label className="block text-sm">
        Candidate
        <select name="index" className="w-full" required>
          {candidates.map((c, i) => (
            <option key={i} value={i}>
              {c.url}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        How did you verify the company association?
        <textarea
          name="explanation"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          className="w-full"
        />
      </label>
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Saving …" : "Confirm candidate manually"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-emerald-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function DiscoveryQueue({
  initial,
  choices,
  initialIds = [],
}: {
  initial: Batch | null;
  choices: { id: string; companyName: string; orgNumber: string }[];
  initialIds?: string[];
}) {
  const [batch, setBatch] = useState(initial);
  const [selected, setSelected] = useState(initialIds);
  const [analyze, setAnalyze] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const alive = useRef(false);
  const flight = useRef(false);
  const router = useRouter();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!enabled || batch?.status !== "RUNNING") return;
    let disposed = false;
    const timer = setInterval(async () => {
      if (flight.current) return;
      flight.current = true;
      setWorking(true);
      try {
        const result = await stepWebsiteDiscovery();
        if (!disposed && alive.current) {
          if (result.error) {
            setError(result.error);
            setEnabled(false);
          } else {
            setBatch(result.batch ?? null);
            if (result.batch?.status === "COMPLETE") router.refresh();
          }
        }
      } catch {
        if (!disposed && alive.current) {
          setError(
            "Connection lost. Progress was saved. Refresh status and resume after the current check finishes.",
          );
          setEnabled(false);
        }
      } finally {
        flight.current = false;
        if (alive.current) setWorking(false);
      }
    }, 1800);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [batch, enabled, router]);
  async function start(allWithout = false) {
    setError("");
    setWorking(true);
    try {
      const result = await startWebsiteDiscovery({
        ids: selected,
        allWithout,
        analyze,
      });
      if (result.error) setError(result.error);
      else {
        setBatch(result.batch ?? null);
        setEnabled(true);
      }
    } catch {
      setError("Could not start the queue");
    } finally {
      setWorking(false);
    }
  }
  async function control(command: "pause" | "resume" | "cancel" | "retry") {
    setError("");
    if (
      command === "cancel" &&
      !confirm("Stop remaining searches? The current check will finish.")
    )
      return;
    try {
      const result = await controlWebsiteDiscovery(command);
      if (result.error) setError(result.error);
      else {
        setBatch(result.batch ?? null);
        setEnabled(true);
      }
    } catch {
      setError("Could not update the queue");
    }
  }
  const filtered = choices.filter((l) =>
    (l.companyName + " " + l.orgNumber)
      .toLocaleLowerCase("en-GB")
      .includes(search.toLocaleLowerCase("en-GB")),
  );
  const queued = !!batch?.items.some((i) =>
    ["QUEUED", "RUNNING"].includes(i.state),
  );
  return (
    <div className="space-y-5">
      <section className="panel p-5 space-y-4">
        <h2 className="font-semibold">Find Websites Automatically</h2>
        <p className="text-sm text-muted-foreground">
          Checks Enhetsregisteret, subunits and Wikidata using the exact
          organization number. Domains are never guessed. Website association
          must be verified before automatic auditing. Coverage is limited.
        </p>
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={analyze}
            onChange={(e) => setAnalyze(e.target.checked)}
          />{" "}
          Find websites and audit — update scores for verified websites only
        </label>
        <label className="block text-sm">
          Search Companies
          <input
            className="block w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Company name or organization number"
          />
        </label>
        <div className="max-h-72 overflow-auto border border-border rounded-lg p-3 space-y-2">
          <label className="block text-sm font-medium">
            <input
              type="checkbox"
              checked={
                !!filtered.length &&
                filtered.every((l) => selected.includes(l.id))
              }
              onChange={(e) =>
                setSelected(
                  selectVisibleLeads(
                    selected,
                    filtered.map((l) => l.id),
                    e.target.checked,
                  ),
                )
              }
            />{" "}
            Select All Visible ({filtered.length})
          </label>
          {filtered.map((l) => (
            <label key={l.id} className="flex gap-3 text-sm py-1">
              <input
                type="checkbox"
                checked={selected.includes(l.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, l.id]
                      : selected.filter((id) => id !== l.id),
                  )
                }
              />
              <span>
                {l.companyName}
                <span className="block text-xs text-muted-foreground">
                  {l.orgNumber}
                </span>
              </span>
            </label>
          ))}
          {!filtered.length && (
            <p className="text-sm text-muted-foreground">
              No companies in this selection.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Shows up to 500 recent leads. Individual leads can also be selected
          from their profiles. Leads manually confirmed to have no website are
          excluded from missing-URL searches.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={working || queued || !selected.length}
            onClick={() => start()}
          >
            Find websites for selected leads ({selected.length})
          </Button>
          <Button
            variant="outline"
            disabled={working || queued}
            onClick={() => start(true)}
          >
            Find websites for leads without a URL
          </Button>
        </div>
      </section>
      {error && (
        <p role="alert" className="panel p-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {batch && (
        <section className="panel p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-semibold">
              Progress · {batch.completed} of {batch.total}
            </h2>
            <span className="text-sm">
              {batch.status === "COMPLETE"
                ? "Completed"
                : batch.status === "PAUSED"
                  ? "Paused"
                  : batch.status === "CANCELLED"
                    ? "Stopped"
                    : working
                      ? "Checking one company …"
                      : "Ready for next company"}
            </span>
          </div>
          <progress
            className="w-full"
            aria-label="Website discovery progress"
            max={Math.max(1, batch.total)}
            value={batch.completed}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Verified", batch.verified],
              ["Possible matches", batch.possible],
              ["No Match Found", batch.none],
              ["Failed", batch.failed],
            ].map(([label, value]) => (
              <div className="rounded-lg bg-muted p-3" key={label}>
                <p className="text-xs">{label}</p>
                <strong className="text-xl">{value}</strong>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            One check at a time. Keep this page open to process the queue.
            Closing it stops new jobs; the current check may finish. Progress is
            saved. Pause and stop apply after the current check. Wait one minute
            before retrying a company.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                control(batch.status === "RUNNING" ? "pause" : "resume")
              }
            >
              {batch.status === "RUNNING" ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" onClick={() => control("cancel")}>
              Stop Queue
            </Button>
            <Button
              variant="outline"
              disabled={!batch.failed || working}
              onClick={() => control("retry")}
            >
              Retry Failed
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await websiteDiscoveryProgress();
                  setBatch(r.batch);
                  setEnabled(true);
                  setError("");
                } catch {
                  setError("Could not load progress");
                }
              }}
            >
              Refresh Status
            </Button>
            <Link
              className="text-primary text-sm self-center underline"
              href="/leads?discovery=VERIFIED"
            >
              View Verified Companies
            </Link>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {batch.items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-2">
                      <Link
                        className="text-primary underline"
                        href={`/leads/${item.leadId}`}
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-2">
                      {item.state === "QUEUED"
                        ? "Queued"
                        : item.state === "RUNNING"
                          ? "Checking …"
                          : item.state === "SKIPPED"
                            ? "Skipped"
                            : (discoveryLabels[
                                item.outcome as keyof typeof discoveryLabels
                              ] ?? "Completed")}
                      {item.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {leadSystemText(item.error)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
