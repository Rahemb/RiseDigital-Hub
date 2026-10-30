import { ClientForm } from "@/components/client-form";
import { workspace } from "@/server/auth";
export default async function NewClient() {
  await workspace();
  return (
    <>
      <h1 className="page-heading">New client</h1>
      <p className="text-muted-foreground mt-2 mb-7">
        Build a clear picture of your next relationship.
      </p>
      <ClientForm />
    </>
  );
}
