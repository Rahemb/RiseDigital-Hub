"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { noteAction, removeClientAction } from "@/app/actions";
import { Button } from "./ui/button";
export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    noteAction.bind(null, id),
    {},
  );
  return (
    <form action={action} className="panel p-5 mb-5">
      <label className="field">
        Add an internal note
        <textarea
          name="body"
          rows={3}
          required
          maxLength={10000}
          placeholder="Meeting notes, context, or the next step…"
        />
      </label>
      <div className="flex items-center justify-between mt-4">
        <span
          role="status"
          className={state.error ? "error" : "text-sm text-muted-foreground"}
        >
          {state.error ??
            (state.success
              ? "Note saved"
              : "Visible only inside your workspace")}
        </span>
        <Button disabled={pending}>{pending ? "Saving…" : "Add note"}</Button>
      </div>
    </form>
  );
}
export function DeleteClient({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <div className="mt-8 border-t border-border pt-5">
      {confirm ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Delete this client and its notes permanently?
          </p>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const result = await removeClientAction(id);
              if (result.error) {
                setError(result.error);
                setPending(false);
              } else {
                router.push("/clients");
                router.refresh();
              }
            }}
          >
            Confirm deletion
          </Button>
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          className="text-sm text-red-600"
          onClick={() => setConfirm(true)}
        >
          Delete client
        </button>
      )}
      {error && (
        <p className="error mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
