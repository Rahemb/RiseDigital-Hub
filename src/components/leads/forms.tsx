"use client";
import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { leadCommand, prepareHandoff } from "@/app/lead-actions";
import { Button } from "@/components/ui/button";
export function ActionForm({
  command,
  id = "",
  children,
  label = "Save",
  confirm,
}: {
  command: string;
  id?: string;
  children?: ReactNode;
  label?: string;
  confirm?: string;
}) {
  const [state, action, pending] = useActionState(
    leadCommand.bind(null, command, id),
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="space-y-4"
    >
      {children}
      <Button
        type="submit"
        disabled={pending}
        variant={
          command === "removeSaved"
            ? "ghost"
            : command === "restoreSaved"
              ? "outline"
              : "default"
        }
      >
        {pending
          ? command === "audit"
            ? "Checking website …"
            : "Working …"
          : label}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-emerald-600">
          {state.message}{" "}
          {state.clientId && (
            <Link className="underline" href={`/clients/${state.clientId}`}>
              Open in Clients
            </Link>
          )}
          {state.id && (
            <Link
              className="underline"
              href={
                command === "convert"
                  ? `/clients/${state.id}`
                  : `/leads/${state.id}`
              }
            >
              Open {command === "convert" ? "client" : "lead"}
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
export function Field({
  label,
  name,
  value = "",
  type = "text",
  required = false,
  readOnly = false,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block text-sm space-y-1">
      <span>{label}</span>
      <input
        className="field w-full"
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        readOnly={readOnly}
      />
    </label>
  );
}
export function Handoff({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [mail, setMail] = useState("");
  async function prepare(copy: boolean) {
    setPending(true);
    setMessage("");
    setMail("");
    try {
      const result = await prepareHandoff(id);
      if (result.error) setMessage(result.error);
      else if (result.data) {
        const d = result.data;
        if (copy) {
          await navigator.clipboard.writeText(
            `To: ${d.email}
Subject: ${d.subject}\n\n${d.body}`,
          );
          setMessage(
            "Copied. Paste into Roundcube and check the recipient before sending.",
          );
        } else
          setMail(
            `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`,
          );
      }
    } catch {
      setMessage(
        "Could not prepare the message. Check browser permissions and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => prepare(true)}
        >
          Copy email for Roundcube
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => prepare(false)}
        >
          Prepare for email client
        </Button>
      </div>
      {mail && (
        <a
          className="text-primary underline"
          href={mail}
          onClick={() => setTimeout(() => setMail(""), 1000)}
        >
          Open email client with draft
        </a>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Hub does not send email. Use Roundcube to send and receive messages,
        then log contact here.
      </p>
    </div>
  );
}
