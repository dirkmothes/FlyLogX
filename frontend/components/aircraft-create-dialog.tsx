"use client";

import { useEffect, useState } from "react";

import type { ApiUnit } from "@/lib/api";
import { AircraftCreateForm } from "@/components/aircraft-create-form";

type Props = {
  organizationId: string;
  units: ApiUnit[];
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AircraftCreateDialog({ organizationId, units }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <section className="admin-command">
        <div>
          <span className="admin-kicker">Aircraft registry</span>
          <h2>Create new aircraft</h2>
        </div>
        <div className="admin-command-actions">
          <button
            type="button"
            className="admin-command-button"
            onClick={() => setOpen(true)}
            aria-label="Create new aircraft"
            title="Create new aircraft"
          >
            <PlusIcon />
            <span className="sr-only">Create new aircraft</span>
          </button>
        </div>
      </section>

      {open ? (
        <div
          className="admin-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section className="admin-dialog aircraft-create-dialog" role="dialog" aria-modal="true" aria-labelledby="aircraft-create-dialog-title">
            <div className="admin-dialog-header">
              <div>
                <span className="admin-mini-badge">New aircraft</span>
                <h3 id="aircraft-create-dialog-title">Create new aircraft</h3>
              </div>
              <button type="button" className="admin-close-button" onClick={() => setOpen(false)} aria-label="Close dialog">
                ×
              </button>
            </div>

            <div className="admin-dialog-form">
              <AircraftCreateForm organizationId={organizationId} units={units} onSuccess={() => setOpen(false)} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
