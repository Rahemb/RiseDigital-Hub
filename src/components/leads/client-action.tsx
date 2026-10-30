"use client";
import { useActionState } from "react";
import Link from "next/link";
import { leadCommand } from "@/app/lead-actions";
import { Button } from "@/components/ui/button";
export function ClientLeadAction({
  id,
  clientId,
  blocked = false,
}: {
  id: string;
  clientId?: string | null;
  blocked?: boolean;
}) {
  const [state, action, pending] = useActionState(
    leadCommand.bind(null, "addClient", id),
    {},
  );
  const linkedId = state.clientId ?? clientId;
  if (linkedId)
    return (
      <div>
        {state.clientId && (
          <p
            role="status"
            className="text-xs text-emerald-700 dark:text-emerald-300 mb-1"
          >
            Added or linked to Clients
          </p>
        )}
        <Link
          className="text-blue-600 underline font-medium text-sm"
          href={`/clients/${linkedId}`}
        >
          Open in Clients
        </Link>
      </div>
    );
  if (blocked)
    return (
      <span className="text-xs text-muted-foreground">Do not contact</span>
    );
  return (
    <form action={action}>
      <Button disabled={pending}>
        {pending ? "Adding…" : "Add to Clients as Lead"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-red-600 mt-1">
          {state.error}
        </p>
      )}
    </form>
  );
}
