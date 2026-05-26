"use client";

import { useMemo, useState } from "react";

import { AircraftCreateDialog } from "@/components/aircraft-create-dialog";
import { AircraftDeleteDialog } from "@/components/aircraft-delete-dialog";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import type { ApiAircraft, ApiUnit, RoleName } from "@/lib/api";
import { aircraftStatusTone, mapAircraftRows } from "@/lib/view-model";

type Props = {
  viewerRole: RoleName;
  organizationId: string;
  units: ApiUnit[];
  aircraft: ApiAircraft[];
};

export function AircraftManagement({ viewerRole, organizationId, units, aircraft }: Props) {
  const canManageAircraft = viewerRole === "admin";
  const rows = useMemo(() => mapAircraftRows(aircraft), [aircraft]);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const editTarget = aircraft.find((item) => item.id === editTargetId) ?? null;
  const deleteTarget = aircraft.find((item) => item.id === deleteTargetId) ?? null;
  const columns = [
    { header: "Name", render: (row: (typeof rows)[number]) => row.name },
    { header: "Identifier", render: (row: (typeof rows)[number]) => row.identifier },
    { header: "Manufacturer", render: (row: (typeof rows)[number]) => row.manufacturer },
    { header: "Model", render: (row: (typeof rows)[number]) => row.model },
    { header: "Operating hours", render: (row: (typeof rows)[number]) => row.hours },
    { header: "Status", render: (row: (typeof rows)[number]) => <StatusPill tone={aircraftStatusTone(row.status)}>{row.status}</StatusPill> },
    ...(canManageAircraft
      ? [
          {
            header: "Actions",
            className: "table-actions",
            render: (row: (typeof rows)[number]) => (
              <div className="admin-record-actions">
                <button
                  type="button"
                  className="admin-action-button admin-action-button-edit"
                  title="Edit aircraft"
                  aria-label={`Edit aircraft ${row.identifier}`}
                  onClick={() => setEditTargetId(row.id)}
                >
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="admin-action-button admin-danger-button"
                  title="Delete aircraft"
                  aria-label={`Delete aircraft ${row.identifier}`}
                  onClick={() => setDeleteTargetId(row.id)}
                >
                  <span>Delete</span>
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {canManageAircraft ? <AircraftCreateDialog organizationId={organizationId} units={units} /> : null}

      <DataTable
        title="Aircraft master data"
        rows={rows}
        columns={columns}
      />

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
