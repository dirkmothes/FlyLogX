import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "FlyLogX",
  description: "Digital flight logbook and review management for aircraft and drones.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeScript = `
    try {
      var theme = window.localStorage.getItem("flylogx-theme");
      document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
    } catch (_) {
      document.documentElement.dataset.theme = "light";
    }
  `;

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
