import Link from "next/link";
import type { ReactNode } from "react";

import { navItems } from "@/lib/mock";
import type { ApiUser } from "@/lib/api";
import { AccountDialog } from "@/components/account-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  children: ReactNode;
  aside?: ReactNode;
  user?: Pick<ApiUser, "name" | "role" | "email" | "organization_id" | "unit_id" | "two_factor_enabled">;
};

export function AppShell({ title, subtitle, breadcrumbs = [], children, aside, user }: Props) {
  const hasAside = Boolean(aside);
  const visibleNavItems = navItems.filter((item) => {
    if (!user?.role || !("roles" in item)) {
      return true;
    }

    return item.roles.includes(user.role as "pilot" | "supervisor" | "admin");
  });
  const navGroups = [
    { label: "Overview", items: visibleNavItems.filter((item) => ["/dashboard", "/flights", "/aircraft"].includes(item.href)) },
    { label: "Workflow", items: visibleNavItems.filter((item) => ["/reviews", "/audit"].includes(item.href)) },
    { label: "System", items: visibleNavItems.filter((item) => item.href === "/admin") },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FX</div>
          <div>
            <div className="brand-title">FlyLogX</div>
            <div className="brand-subtitle">Flight Logbook System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              <div className="sidebar-group-links">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="sidebar-link">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-group-label">Angemeldeter Nutzer</div>
          {user ? (
            <div className="sidebar-user">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar" aria-label="Schnellzugriff">
          <div className="topbar-actions">
            <ThemeToggle />
            {user ? (
              <>
                <AccountDialog user={user} />
                <LogoutButton />
              </>
            ) : (
              <Link href="/login" className="topbar-button">
                Login
              </Link>
            )}
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="breadcrumbs">
              {breadcrumbs.length > 0 ? breadcrumbs.join(" / ") : "FlyLogX"}
            </div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </section>

        <main className={`content-grid ${hasAside ? "" : "content-grid--full"}`}>
          <div className="content-flow">{children}</div>
          {aside ? <aside className="right-rail">{aside}</aside> : null}
        </main>
      </div>
    </div>
  );
}
