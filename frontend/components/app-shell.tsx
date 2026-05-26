"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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
  user?: Pick<ApiUser, "username" | "first_name" | "last_name" | "name" | "role" | "email" | "organization_id" | "unit_id">;
};

export function AppShell({ title, subtitle, breadcrumbs = [], children, aside, user }: Props) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className={`app-shell ${mobileNavOpen ? "app-shell-nav-open" : ""}`}>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`sidebar-backdrop ${mobileNavOpen ? "sidebar-backdrop-open" : ""}`}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />

      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-block brand-block--logo">
          <img className="brand-logo" src="/fly-icon.png" alt="FlyLogX Logo" />
          <div className="brand-subtitle">Flight Logbook System</div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              <div className="sidebar-group-links">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${pathname === item.href ? "sidebar-link-active" : ""}`}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-group-label">Account</div>
          {user ? (
            <div className="sidebar-user">
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
              <span>{user.role}</span>
            </div>
          ) : null}

          <div className="sidebar-quick-actions" aria-label="Quick actions">
            <ThemeToggle />
            {user ? (
              <>
                <AccountDialog user={user} />
                <LogoutButton />
              </>
            ) : (
              <Link href="/login" className="topbar-button sidebar-login-button">
                Login
              </Link>
            )}
          </div>
        </div>
      </aside>

      <div className="main-column">
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
