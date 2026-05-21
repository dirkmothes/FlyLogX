import Link from "next/link";
import type { ReactNode } from "react";

import { navItems } from "@/lib/mock";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  children: ReactNode;
  aside?: ReactNode;
  userName?: string;
  userRole?: string;
};

export function AppShell({ title, subtitle, breadcrumbs = [], children, aside, userName, userRole }: Props) {
  const visibleNavItems = navItems.filter((item) => {
    if (!userRole || !("roles" in item)) {
      return true;
    }

    return item.roles.includes(userRole as "pilot" | "supervisor" | "admin");
  });

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
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div>Revision-safe workflow</div>
          <div>Role-based access control</div>
          <div>Audit-first design</div>
          {userName ? (
            <div className="sidebar-user">
              <strong>{userName}</strong>
              <span>{userRole}</span>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">
              {breadcrumbs.length > 0 ? breadcrumbs.join(" / ") : "FlyLogX"}
            </div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            {userName ? <LogoutButton /> : <Link href="/login" className="topbar-button">Login</Link>}
          </div>
        </header>

        <main className="content-grid">
          <div className="content-flow">{children}</div>
          {aside ? <aside className="right-rail">{aside}</aside> : null}
        </main>
      </div>
    </div>
  );
}
