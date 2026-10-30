import Link from "next/link";
import { db } from "@/server/db";
import { choices } from "@/server/module-queries";
import { dateLabel } from "@/lib/utils";
import { UploadForm, DocumentControls } from "./document-controls";
import { Button } from "./ui/button";
export async function DocumentList({
  organizationId,
  clientId,
  projectId,
  ticketId,
  q = "",
  trash = false,
}: {
  organizationId: string;
  clientId?: string;
  projectId?: string;
  ticketId?: string;
  q?: string;
  trash?: boolean;
}) {
  const [docs, opts, tickets] = await Promise.all([
    db.document.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(ticketId ? { ticketId } : {}),
        deletedAt: trash ? { not: null } : null,
        ...(q ? { originalName: { contains: q.slice(0, 200) } } : {}),
      },
      include: { client: true, project: true, ticket: true },
      orderBy: { createdAt: "desc" },
    }),
    choices(organizationId),
    db.supportTicket.findMany({
      where: { organizationId },
      select: { id: true, title: true, clientId: true, projectId: true },
    }),
  ]);
  return (
    <section>
      <h2 className="text-xl font-semibold mb-5">
        {trash ? "Document trash" : "Documents"}
      </h2>
      <UploadForm
        options={{
          ...opts,
          tickets: tickets.map((t) => ({
            value: t.id,
            label: t.title,
            clientId: t.clientId,
            projectId: t.projectId,
          })),
        }}
        clientId={clientId}
        projectId={projectId}
        ticketId={ticketId}
      />
      <form action="/documents" className="flex gap-3 mb-5">
        {clientId && <input type="hidden" name="clientId" value={clientId} />}
        {projectId && (
          <input type="hidden" name="projectId" value={projectId} />
        )}
        {ticketId && <input type="hidden" name="ticketId" value={ticketId} />}
        <input
          aria-label="Search documents"
          name="q"
          placeholder="Search filenames…"
          defaultValue={q}
        />
        <select
          name="trash"
          defaultValue={String(trash)}
          aria-label="Document visibility"
          className="w-auto"
        >
          <option value="false">Current files</option>
          <option value="true">Trash</option>
        </select>
        <Button variant="outline">Apply</Button>
      </form>
      <div className="panel overflow-x-auto">
        {docs.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Client / attachment</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    {!trash ? (
                      <a
                        href={`/api/documents/${d.id}`}
                        className="text-blue-500 font-medium"
                      >
                        {d.originalName}
                      </a>
                    ) : (
                      d.originalName
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {(d.sizeBytes / 1024).toFixed(1)} KB · {d.mimeType}
                    </p>
                  </td>
                  <td>
                    <Link href={`/clients/${d.clientId}`}>
                      {d.client.companyName}
                    </Link>
                    {d.project && (
                      <Link
                        className="block text-muted-foreground mt-1"
                        href={`/projects/${d.projectId}`}
                      >
                        {d.project.name}
                      </Link>
                    )}
                    {d.ticket && (
                      <Link
                        className="block text-muted-foreground mt-1"
                        href={`/support/${d.ticketId}`}
                      >
                        {d.ticket.title}
                      </Link>
                    )}
                  </td>
                  <td>{dateLabel(d.createdAt)}</td>
                  <td>
                    <DocumentControls
                      id={d.id}
                      name={d.originalName}
                      trashed={trash}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No matching documents.</div>
        )}
      </div>
    </section>
  );
}
