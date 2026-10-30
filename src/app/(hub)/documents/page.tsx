import { workspace } from "@/server/auth";
import { DocumentList } from "@/components/documents";
export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    ticketId?: string;
    q?: string;
    trash?: string;
  }>;
}) {
  const { organization } = await workspace();
  const params = await searchParams;
  return (
    <DocumentList
      organizationId={organization.id}
      clientId={params.clientId}
      projectId={params.projectId}
      ticketId={params.ticketId}
      q={params.q}
      trash={params.trash === "true"}
    />
  );
}
