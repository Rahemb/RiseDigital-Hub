"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/module-config";
import { Button } from "./ui/button";
import { Feedback } from "./business-forms";
import { documentAction } from "@/app/document-actions";
import type { MutationResult } from "@/app/business-actions";
export function UploadForm({
  options,
  clientId = "",
  projectId = "",
  ticketId = "",
}: {
  options: { clients: Option[]; projects: Option[]; tickets: Option[] };
  clientId?: string;
  projectId?: string;
  ticketId?: string;
}) {
  const [client, setClient] = useState(clientId);
  const [project, setProject] = useState(projectId);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<MutationResult>({});
  const router = useRouter();
  return (
    <details className="panel p-5 mb-6">
      <summary className="font-semibold cursor-pointer">
        Upload a document
      </summary>
      <form
        className="mt-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setPending(true);
          setState({});
          try {
            const response = await fetch("/api/documents", {
              method: "POST",
              body: data,
            });
            const result = await response.json();
            if (!response.ok) setState({ error: result.error });
            else {
              setState({ success: "File uploaded" });
              form.reset();
              setClient(clientId);
              setProject(projectId);
              router.refresh();
            }
          } catch {
            setState({ error: "Upload interrupted. Please try again." });
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="field">
            Client
            <select
              name="clientId"
              required
              value={client}
              onChange={(e) => {
                setClient(e.target.value);
                setProject("");
              }}
            >
              <option value="">Choose client</option>
              {options.clients.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Project
            <select
              name="projectId"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">None</option>
              {options.projects
                .filter((p) => p.clientId === client)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Support ticket
            <select
              key={`${client}-${project}`}
              name="ticketId"
              defaultValue={ticketId}
            >
              <option value="">None</option>
              {options.tickets
                .filter(
                  (t) =>
                    t.clientId === client &&
                    (!project || t.projectId === project),
                )
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            File
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Up to 10 MB. PDF, PNG, JPEG, WebP, TXT or CSV. Stored privately on
          this computer.
        </p>
        <Feedback state={state} />
        <Button disabled={pending} className="mt-4">
          {pending ? "Uploading…" : "Upload file"}
        </Button>
      </form>
    </details>
  );
}
export function DocumentControls({
  id,
  name,
  trashed,
}: {
  id: string;
  name: string;
  trashed: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<MutationResult>({});
  async function run(action: string) {
    setPending(true);
    try {
      setState(await documentAction(id, action, value));
      setConfirm(false);
      setEditing(false);
    } catch {
      setState({ error: "Could not update the document" });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="text-xs">
      <div className="flex gap-3 flex-wrap">
        {trashed ? (
          <button
            disabled={pending}
            onClick={() => run("restore")}
            className="text-blue-500"
          >
            Restore
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditing(!editing)}
              className="text-blue-500"
            >
              Rename
            </button>
            <button
              onClick={() => setConfirm(!confirm)}
              className="text-red-500"
            >
              Move to trash
            </button>
          </>
        )}
        {editing && (
          <div className="flex gap-2">
            <input
              aria-label="Document name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button disabled={pending} onClick={() => run("rename")}>
              Save
            </button>
          </div>
        )}
        {confirm && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="mb-2">
              Move to trash? You can restore this file later.
            </p>
            <button
              disabled={pending}
              onClick={() => run("trash")}
              className="text-red-500 mr-3"
            >
              Confirm
            </button>
            <button onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>
      <Feedback state={state} />
    </div>
  );
}
