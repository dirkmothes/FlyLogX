"use client";

import { useEffect, useState } from "react";

import type { ApiAircraft, ApiOrganization, ApiUnit, RoleName } from "@/lib/api";
import { AircraftCreateForm } from "@/components/aircraft-create-form";

type Props = {
  viewerRole: RoleName;
  organizationId: string;
  organizations: ApiOrganization[];
  units: ApiUnit[];
  mode?: "create" | "edit";
  aircraft?: ApiAircraft | null;
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

export function AircraftCreateDialog({
  viewerRole,
  organizationId,
  organizations,
  units,
  mode = "create",
  aircraft = null,
  open,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

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
  }, [isOpen]);

  if (mode === "edit" && !aircraft) {
    return null;
  }

  return (
    <>
      {hideTrigger || mode === "edit" ? null : (
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
      )}

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
          <section className="admin-dialog aircraft-create-dialog" role="dialog" aria-modal="true" aria-labelledby="aircraft-create-dialog-title">
            <div className="admin-dialog-header">
              <div>
                <span className="admin-mini-badge">{mode === "edit" ? "Edit aircraft" : "New aircraft"}</span>
                <h3 id="aircraft-create-dialog-title">{mode === "edit" ? "Edit aircraft" : "Create new aircraft"}</h3>
              </div>
              <button type="button" className="admin-close-button" onClick={() => setOpen(false)} aria-label="Close dialog">
                ×
              </button>
            </div>

            <div className="admin-dialog-form">
              <AircraftCreateForm
                viewerRole={viewerRole}
                organizationId={organizationId}
                organizations={organizations}
                units={units}
                mode={mode}
                aircraft={aircraft}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
