import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "FlyLogX",
  description: "Digitale Flugzeitennachweis- und Prüfverwaltung für Luftfahrzeuge und Drohnen.",
  icons: {
    icon: "/fly-icon.png",
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
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
