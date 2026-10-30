import { workspace } from "@/server/auth";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle, ThemeSync } from "@/components/providers";
import { logout } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await workspace();
  return (
    <>
      <ThemeSync theme={user.theme} />
      <Sidebar name={user.name} demo={organization.isDemo} />
      <div className="app-main">
        <header className="topbar">
          <div className="text-xs text-muted-foreground">
            Workspace <span className="mx-3 text-border">/</span>
            <span className="text-foreground">Rise Digital Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="status-dot" />
              Local workspace
            </span>
            <ThemeToggle />
            <form action={logout}>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {organization.isDemo && (
          <div className="bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs px-10 py-3">
            DEMO WORKSPACE — Sample data is separate from your actual business
            records. Switch in Settings.
          </div>
        )}
        <main className="page">{children}</main>
      </div>
    </>
  );
}
