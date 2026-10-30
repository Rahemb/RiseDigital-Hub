"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { config, type Option } from "@/lib/module-config";
import { dateKey, label, type Kind } from "@/lib/business";
import {
  saveRecordAction,
  commentAction,
  transactionAction,
  generateAction,
  statusAction,
  type MutationResult,
} from "@/app/business-actions";
import { Button } from "./ui/button";
export function Feedback({ state }: { state: MutationResult }) {
  return state.error ? (
    <p role="alert" className="error my-3">
      {state.error}
    </p>
  ) : state.success ? (
    <p role="status" className="text-sm text-emerald-600 my-3">
      {state.success}
    </p>
  ) : null;
}
export function BusinessForm({
  kind,
  id,
  initial = {},
  options,
}: {
  kind: Kind;
  id?: string;
  initial?: Record<string, string>;
  options: Record<string, Option[]>;
}) {
  const router = useRouter();
  const defaults = { ...config[kind].defaults, ...initial };
  if (!id) {
    for (const key of ["startDate", "dueDate"]) {
      if (key in defaults && !(key in initial)) defaults[key] = dateKey();
    }
  }
  const [clientId, setClientId] = useState(defaults.clientId ?? "");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<MutationResult>({});
  return (
    <form
      className="panel p-6 sm:p-8 max-w-4xl"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        const form = new FormData(e.currentTarget);
        setPending(true);
        setState({});
        try {
          const result = await saveRecordAction(kind, id, form);
          setState(result);
          if (result.id) {
            router.push(`/${kind}/${result.id}?saved=1`);
            router.refresh();
          }
        } catch {
          setState({ error: "Connection interrupted. Please try again." });
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        {config[kind].fields.map((f) => {
          let opts = f.source ? (options[f.source] ?? []) : (f.options ?? []);
          if (["projects", "agreements"].includes(f.source ?? ""))
            opts = opts.filter((o) => o.clientId === clientId);
          return (
            <label
              key={f.name}
              className={`field ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
            >
              {f.label}
              {f.type === "select" ? (
                <select
                  key={`${f.name}-${f.source === "projects" || f.source === "agreements" ? clientId : ""}`}
                  name={f.name}
                  defaultValue={defaults[f.name] ?? ""}
                  required={f.required}
                  onChange={
                    f.name === "clientId"
                      ? (e) => setClientId(e.target.value)
                      : undefined
                  }
                >
                  {f.source && (
                    <option value="">{f.required ? "Choose…" : "None"}</option>
                  )}
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  rows={4}
                  defaultValue={defaults[f.name] ?? ""}
                  maxLength={10000}
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  required={f.required}
                  defaultValue={defaults[f.name] ?? ""}
                  min={f.type === "number" ? 1 : undefined}
                  max={f.type === "number" ? 1200 : undefined}
                  maxLength={f.type === "text" || !f.type ? 180 : undefined}
                />
              )}
              {f.hint && (
                <span className="text-xs text-muted-foreground font-normal">
                  {f.hint}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <Feedback state={state} />
      <div className="flex justify-end gap-3 mt-7">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(id ? `/${kind}/${id}` : `/${kind}`)}
        >
          Cancel
        </Button>
        <Button disabled={pending}>
          {pending ? "Saving…" : `Save ${config[kind].singular}`}
        </Button>
      </div>
    </form>
  );
}
export function CommentForm({ kind, id }: { kind: string; id: string }) {
  const [state, action, pending] = useActionState(
    commentAction.bind(null, kind, id),
    {},
  );
  return (
    <form action={action} className="panel p-5">
      <label className="field">
        {kind === "projects" ? "Add project note" : "Add internal comment"}
        <textarea name="body" required maxLength={10000} rows={3} />
      </label>
      <Feedback state={state} />
      <Button disabled={pending} className="mt-3">
        {pending ? "Saving…" : "Add comment"}
      </Button>
    </form>
  );
}
export function TransactionForm({
  id,
  outstanding,
}: {
  id: string;
  outstanding: number;
}) {
  const [state, action, pending] = useActionState(
    transactionAction.bind(null, id),
    {},
  );
  return (
    <form action={action} className="panel p-6">
      <h2 className="font-semibold mb-5">Register a received payment</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="field">
          Amount received (NOK)
          <input
            name="amountOre"
            required
            inputMode="decimal"
            placeholder={(outstanding / 100).toFixed(2)}
          />
        </label>
        <label className="field">
          Payment date
          <input
            type="date"
            name="paidAt"
            required
            defaultValue={dateKey()}
            max={dateKey()}
          />
        </label>
        <label className="field">
          Method
          <select name="method">
            {["BANK_TRANSFER", "VIPPS", "CASH", "OTHER"].map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Reference
          <input name="reference" maxLength={160} />
        </label>
        <label className="field sm:col-span-2">
          Notes
          <textarea name="notes" rows={2} maxLength={10000} />
        </label>
      </div>
      <Feedback state={state} />
      <Button disabled={pending || outstanding <= 0} className="mt-5">
        {pending ? "Recording…" : "Record payment"}
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Record money already received. This never charges your client.
      </p>
    </form>
  );
}
export function GenerateForm() {
  const [state, action, pending] = useActionState(generateAction, {});
  return (
    <details className="panel p-5 mb-6">
      <summary className="cursor-pointer font-medium">
        Generate expected agreement payments
      </summary>
      <form action={action} className="mt-4">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="field">
            Generate through
            <input
              type="date"
              name="through"
              defaultValue={dateKey()}
              required
            />
          </label>
          <Button disabled={pending}>
            {pending ? "Generating…" : "Generate expected payments"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Includes active one-time and recurring agreements. Existing periods
          are never duplicated. No payment is charged.
        </p>
        <Feedback state={state} />
      </form>
    </details>
  );
}
export function StatusControl({
  kind,
  id,
  status,
  statuses,
}: {
  kind: string;
  id: string;
  status: string;
  statuses: readonly string[];
}) {
  const [state, setState] = useState<MutationResult>({});
  const [pending, setPending] = useState(false);
  return (
    <div>
      <select
        aria-label="Change status"
        className="text-xs"
        value={status}
        disabled={pending}
        onChange={async (e) => {
          setPending(true);
          try {
            setState(await statusAction(kind, id, e.target.value));
          } catch {
            setState({ error: "Unable to update status" });
          } finally {
            setPending(false);
          }
        }}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {label(s)}
          </option>
        ))}
      </select>
      <Feedback state={state} />
    </div>
  );
}
