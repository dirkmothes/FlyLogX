"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type Props = {
  format?: "csv" | "json" | "pdf";
};

export function ExportActions({ format = "csv" }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/exports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Export fehlgeschlagen");
      }

      if (format === "csv" || format === "pdf") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `flylogx-export-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        setMessage(data.message || "Export erstellt.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-stack">
        <button className="button button-primary" type="button" onClick={handleExport} disabled={loading}>
          {loading ? "Exportiere..." : `Export ${format.toUpperCase()}`}
        </button>
      {message ? <div className="form-note">{message}</div> : null}
    </div>
  );
}
