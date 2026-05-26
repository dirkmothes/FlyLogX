"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiAircraft } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  aircraft: ApiAircraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AircraftDeleteDialog({ aircraft, open, onOpenChange }: Props) {
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

  if (!aircraft) {
    return null;
  }

  async function handleDelete() {
    if (!aircraft) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/aircraft/${aircraft.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not delete the aircraft.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the aircraft.");
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
      <section className="admin-dialog admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="aircraft-delete-dialog-title">
        <div className="admin-dialog-header admin-confirm-header">
          <div>
            <span className="admin-mini-badge admin-danger-chip">Delete aircraft</span>
            <h3 id="aircraft-delete-dialog-title">Delete permanently</h3>
          </div>
          <button type="button" className="admin-close-button" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="admin-confirm-copy">
          <p>
            {aircraft.identifier} · {aircraft.name}
          </p>
          <p>This action moves the aircraft to the deleted state. It can only be restored by an administrator.</p>
        </div>
        {message ? <div className="form-note admin-dialog-message">{message}</div> : null}
        <div className="admin-dialog-actions">
          <button type="button" className="button button-secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="button button-danger" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}
