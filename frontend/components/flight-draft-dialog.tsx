"use client";

import { useEffect, useState } from "react";

import type { ApiAircraft, ApiFlight } from "@/lib/api";
import { FlightDraftForm } from "@/components/flight-draft-form";

type Props = {
  organizationId: string;
  unitId: string;
  pilotId: string;
  aircraft: ApiAircraft[];
  mode?: "create" | "edit";
  flight?: ApiFlight | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
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

export function FlightDraftDialog({
  organizationId,
  unitId,
  pilotId,
  aircraft,
  mode = "create",
  flight = null,
  open,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  if (isEdit && !flight) {
    return null;
  }

  return (
    <>
      {!hideTrigger && !isEdit ? (
        <section className="admin-command">
          <div>
            <span className="admin-kicker">Flight records</span>
            <h2>Create a new draft entry</h2>
          </div>
          <div className="admin-command-actions">
            <button
              type="button"
              className="admin-command-button"
              onClick={() => setOpen(true)}
              aria-label="Create new draft"
              title="Create new draft"
            >
              <PlusIcon />
              <span className="sr-only">Create new draft</span>
            </button>
          </div>
        </section>
      ) : null}

      {isOpen ? (
        <div
          className="admin-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section className="admin-dialog flight-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-draft-dialog-title">
            <div className="admin-dialog-header">
              <div>
                <span className="admin-mini-badge">{isEdit ? "Edit flight" : "New flight entry"}</span>
                <h3 id="flight-draft-dialog-title">{isEdit ? "Edit draft" : "Create new draft"}</h3>
              </div>
              <button type="button" className="admin-close-button" onClick={() => setOpen(false)} aria-label="Close dialog">
                ×
              </button>
            </div>

            <div className="admin-dialog-form">
              <FlightDraftForm
                organizationId={organizationId}
                unitId={unitId}
                pilotId={pilotId}
                aircraft={aircraft}
                mode={mode}
                flight={flight}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
