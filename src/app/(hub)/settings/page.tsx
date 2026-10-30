import { workspace } from "@/server/auth";
import { db } from "@/server/db";
import { ProfileForm, AgencyForm } from "@/components/settings-forms";
import { Button } from "@/components/ui/button";
import { switchWorkspace } from "@/app/actions";
export default async function Settings() {
  const { organization, user } = await workspace();
  const demo = await db.organization.findUnique({ where: { id: "rise-demo" } });
  return (
    <>
      <h1 className="page-heading mb-2">Settings</h1>
      <p className="text-muted-foreground mb-7">
        Your account, your agency, and the way you work.
      </p>
      <div className="max-w-4xl space-y-6">
        <ProfileForm name={user.name} email={user.email} theme={user.theme} />
        <AgencyForm agency={organization} />
        <section className="panel p-6">
          <h2 className="font-semibold mb-3">Workspace data</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your real and demo workspaces are separate. Account settings always
            apply to your owner account.
          </p>
          {demo ? (
            <form action={switchWorkspace}>
              <Button variant="outline">
                Switch to {organization.isDemo ? "real" : "demo"} workspace
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Optional sample data can be installed with npm run db:seed.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-5">
            Backup: stop the application, then run npm run backup --
            --app-stopped. See README for safe restore instructions.
          </p>
        </section>
      </div>
    </>
  );
}
