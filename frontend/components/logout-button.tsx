"use client";

import { useRouter } from "next/navigation";

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 17l5-5-5-5m5 5H4m12-7.5V5.2A1.7 1.7 0 0 0 14.3 3.5H6.2A2.7 2.7 0 0 0 3.5 6.2v11.6A2.7 2.7 0 0 0 6.2 20.5h8.1a1.7 1.7 0 0 0 1.7-1.7V17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Logout should still clear the local route state.
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="topbar-icon-button topbar-icon-button-danger"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogoutIcon />
      <span className="sr-only">Sign out</span>
    </button>
  );
}
