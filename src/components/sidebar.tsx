"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Layers,
  CreditCard,
  CalendarDays,
  LifeBuoy,
  Files,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
const links = [
  ["Dashboard", "/", LayoutDashboard],
  ["Clients", "/clients", Users],
  ["Projects", "/projects", FolderKanban],
  ["Tasks", "/tasks", CheckSquare],
  ["Services", "/services", Layers],
  ["Payments", "/payments", CreditCard],
  ["Calendar", "/calendar", CalendarDays],
  ["Support", "/support", LifeBuoy],
  ["Documents", "/documents", Files],
  ["Reports", "/reports", ChartNoAxesCombined],
  ["Lead Finder", "/leads", Search],
  ["Settings", "/settings", Settings],
] as const;
export function Sidebar({ name, demo }: { name: string; demo: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <ArrowUpRight size={25} />
          </span>
          <span>
            Rise Digital<span className="brand-sub">AGENCY WORKSPACE</span>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="status-dot" />
          {demo ? "Demo workspace" : "Rise Digital Hub"}
          <span className="ml-auto text-[10px]">LOCAL</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([label, url, Icon]) => (
            <Link
              key={url}
              href={url}
              onClick={() => setOpen(false)}
              aria-current={
                (url === "/" ? pathname === "/" : pathname.startsWith(url))
                  ? "page"
                  : undefined
              }
              className={`nav-link ${(url === "/" ? pathname === "/" : pathname.startsWith(url)) ? "active" : ""} ${url === "/settings" ? "mt-5" : ""}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="rounded-xl border border-border p-4 mb-4">
            <div className="text-sm font-semibold">
              A little more organized.
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-5">
              Your clients, work, and next steps. One calm place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-muted-foreground">
                Workspace owner
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
