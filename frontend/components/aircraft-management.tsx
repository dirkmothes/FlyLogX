"use client";

import { useState } from "react";

import { AircraftCreateDialog } from "@/components/aircraft-create-dialog";
import { AircraftDeleteDialog } from "@/components/aircraft-delete-dialog";
import { StatusPill } from "@/components/status-pill";
import type { ApiAircraft, ApiUnit, RoleName } from "@/lib/api";
import { aircraftStatusLabel, aircraftStatusTone } from "@/lib/view-model";

type Props = {
  viewerRole: RoleName;
  organizationId: string;
  units: ApiUnit[];
  aircraft: ApiAircraft[];
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4Zm10.5-13.5 3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M10 11v6m4-6v6M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7m-8 0 .5 13h9L17 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AircraftManagement({ viewerRole, organizationId, units, aircraft }: Props) {
  const canManageAircraft = viewerRole === "admin";
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const editTarget = aircraft.find((item) => item.id === editTargetId) ?? null;
  const deleteTarget = aircraft.find((item) => item.id === deleteTargetId) ?? null;

  return (
    <>
      {canManageAircraft ? <AircraftCreateDialog organizationId={organizationId} units={units} /> : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Aircraft master data</h2>
          </div>
        </div>
        <div className="panel-body">
          <div className="admin-card-list">
            {aircraft.map((item) => (
              <article className="admin-record-card admin-user-record-card admin-entity-record-card" key={item.id}>
                <div className="admin-record-top">
                  <div className="admin-primary-cell">
                    <div className="admin-entity-headline">
                      <strong>{item.name}</strong>
                      <span>{item.identifier}</span>
                      <span>
                        <StatusPill tone={aircraftStatusTone(item.status)}>{aircraftStatusLabel(item.status)}</StatusPill>
                      </span>
                    </div>
                    <span>
                      {item.manufacturer} · {item.model} · {item.operating_hours.toFixed(1)} h
                    </span>
                  </div>
                  {canManageAircraft ? (
                    <div className="admin-record-actions">
                      <button
                        type="button"
                        className="admin-action-button admin-action-button-edit"
                        title="Edit aircraft"
                        aria-label={`Edit aircraft ${item.identifier}`}
                        onClick={() => setEditTargetId(item.id)}
                      >
                        <EditIcon />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="admin-action-button admin-danger-button"
                        title="Delete aircraft"
                        aria-label={`Delete aircraft ${item.identifier}`}
                        onClick={() => setDeleteTargetId(item.id)}
                      >
                        <TrashIcon />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AircraftCreateDialog
        organizationId={organizationId}
        units={units}
        mode="edit"
        aircraft={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTargetId(null);
          }
        }}
        hideTrigger
      />

      <AircraftDeleteDialog
        aircraft={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
          }
        }}
      />
    </>
  );
}
