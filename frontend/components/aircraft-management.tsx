"use client";

import { useMemo, useState } from "react";

import { AircraftCreateDialog } from "@/components/aircraft-create-dialog";
import { AircraftDeleteDialog } from "@/components/aircraft-delete-dialog";
import { DataTable } from "@/components/data-table";
import { RowActionMenu } from "@/components/row-action-menu";
import { StatusPill } from "@/components/status-pill";
import type { ApiAircraft, ApiOrganization, ApiUnit, RoleName } from "@/lib/api";
import { aircraftStatusTone, mapAircraftRows } from "@/lib/view-model";

type Props = {
  viewerRole: RoleName;
  organizationId: string | null;
  organizations: ApiOrganization[];
  units: ApiUnit[];
  aircraft: ApiAircraft[];
};

export function AircraftManagement({ viewerRole, organizationId, organizations, units, aircraft }: Props) {
  const canCreateAircraft = viewerRole === "admin" || viewerRole === "supervisor";
  const canManageAircraft = viewerRole === "admin" || viewerRole === "supervisor";
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
            header: "",
            className: "table-actions-cell aircraft-actions-cell",
            render: (row: (typeof rows)[number]) => (
              <RowActionMenu
                label={`Actions for aircraft ${row.identifier}`}
                className="aircraft-row-action-menu"
                actions={[
                  {
                    label: "Edit",
                    tone: "edit",
                    onSelect: () => setEditTargetId(row.id),
                  },
                  {
                    label: "Delete",
                    tone: "danger",
                    onSelect: () => setDeleteTargetId(row.id),
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {canCreateAircraft ? (
        <AircraftCreateDialog
          viewerRole={viewerRole}
          organizationId={organizationId}
          organizations={organizations}
          units={units}
        />
      ) : null}

      <DataTable
        title="Aircraft master data"
        rows={rows}
        columns={columns}
      />

      <AircraftCreateDialog
        viewerRole={viewerRole}
        organizationId={organizationId}
        organizations={organizations}
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
