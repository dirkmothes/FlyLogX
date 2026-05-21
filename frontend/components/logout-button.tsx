"use client";

import { useRouter } from "next/navigation";

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
    <button type="button" onClick={handleLogout} className="topbar-button">
      Abmelden
    </button>
  );
}
