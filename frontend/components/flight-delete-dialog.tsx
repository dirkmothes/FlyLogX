"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiFlight } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  flight: ApiFlight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FlightDeleteDialog({ flight, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage(null);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!flight) {
    return null;
  }

  async function handleDelete() {
    const target = flight;
    if (!target) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/flights/${target.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not delete the entry.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the entry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="admin-dialog-backdrop admin-confirm-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <section className="admin-dialog admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-delete-dialog-title">
        <div className="admin-dialog-header admin-confirm-header">
          <div>
            <span className="admin-mini-badge admin-danger-chip">Delete entry</span>
            <h3 id="flight-delete-dialog-title">Delete permanently</h3>
          </div>
          <button type="button" className="admin-close-button" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="admin-confirm-copy">
          <p>
            {flight.flight_number || flight.id} · {flight.flight_type}
          </p>
          <p>This entry will be moved to the deleted state and removed from the working list.</p>
        </div>
        {message ? <div className="form-note admin-dialog-message">{message}</div> : null}
        <div className="admin-dialog-actions">
          <button type="button" className="button button-secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="button button-danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete entry"}
          </button>
        </div>
      </section>
    </div>
  );
}
