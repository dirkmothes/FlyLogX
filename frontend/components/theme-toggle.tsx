"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("flylogx-theme");
    const preferred = stored === "dark" || stored === "light" ? stored : "light";
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("flylogx-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button type="button" onClick={toggleTheme} className="topbar-button topbar-button-secondary">
      {theme === "light" ? "Darkmode" : "Lightmode"}
    </button>
  );
}
