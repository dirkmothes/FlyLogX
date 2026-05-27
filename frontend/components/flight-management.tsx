"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FlightDeleteDialog } from "@/components/flight-delete-dialog";
import { FlightDraftDialog } from "@/components/flight-draft-dialog";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { API_BASE_URL, type ApiAircraft, type ApiFlight, type RoleName } from "@/lib/api";
import { flightStatusTone, mapFlightRows, type FlightRow } from "@/lib/view-model";

type Props = {
  viewerRole: RoleName;
  currentUserId: string;
  organizationId: string;
  unitId: string;
  aircraft: ApiAircraft[];
  flights: ApiFlight[];
};

type FlightTableRow = FlightRow & {
  flightId: string;
  rawStatus: ApiFlight["status"];
  pilotId: string;
};

export function FlightManagement({ viewerRole, currentUserId, organizationId, unitId, aircraft, flights }: Props) {
  const router = useRouter();
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo<FlightTableRow[]>(
    () =>
      mapFlightRows(flights).map((row, index) => ({
        ...row,
        flightId: flights[index]?.id ?? row.id,
        rawStatus: flights[index]?.status ?? "draft",
        pilotId: flights[index]?.pilot_id ?? "",
      })),
    [flights],
  );

  const editTarget = flights.find((flight) => flight.id === editTargetId) ?? null;
  const deleteTarget = flights.find((flight) => flight.id === deleteTargetId) ?? null;
  const canManageDraft = (flight: ApiFlight) => viewerRole === "admin" || flight.pilot_id === currentUserId;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".flight-action-menu")) {
        setMenuOpenId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpenId(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function submitFlight(flightId: string) {
    setBusyId(flightId);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/flights/${flightId}/submit`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not submit the draft.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit the draft.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { header: "Date", render: (row: FlightTableRow) => row.date },
    { header: "Pilot", render: (row: FlightTableRow) => row.pilot },
    { header: "Aircraft", render: (row: FlightTableRow) => row.aircraft },
    { header: "Category", render: (row: FlightTableRow) => row.category },
    { header: "Duration", render: (row: FlightTableRow) => row.duration },
    { header: "Mission type", render: (row: FlightTableRow) => row.type },
    { header: "Day", render: (row: FlightTableRow) => row.day },
    { header: "Night", render: (row: FlightTableRow) => row.night },
    { header: "Status", render: (row: FlightTableRow) => <StatusPill tone={flightStatusTone(row.rawStatus)}>{row.status}</StatusPill> },
    ...(rows.some((row) => row.rawStatus === "draft" && (viewerRole === "admin" || row.pilotId === currentUserId))
      ? [
          {
            header: "Actions",
            className: "table-actions",
            render: (row: FlightTableRow) => {
              const flight = flights.find((item) => item.id === row.flightId) ?? null;
              const editable = flight ? canManageDraft(flight) && flight.status === "draft" : false;
              if (!editable || !flight) {
                return null;
              }

              return (
                <div className="flight-action-menu">
                  <button
                    type="button"
                    className="admin-command-button flight-action-menu-trigger"
                    aria-label={`Open actions for draft ${row.id}`}
                    aria-expanded={menuOpenId === flight.id}
                    onClick={() => setMenuOpenId((current) => (current === flight.id ? null : flight.id))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" fill="currentColor" />
                    </svg>
                    <span className="sr-only">Actions</span>
                  </button>
                  {menuOpenId === flight.id ? (
                    <div className="flight-action-menu-panel" role="menu" aria-label={`Actions for draft ${row.id}`}>
                      <button
                        type="button"
                        className="flight-action-menu-item flight-action-menu-item-edit"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpenId(null);
                          setEditTargetId(flight.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flight-action-menu-item flight-action-menu-item-submit"
                        role="menuitem"
                        disabled={busyId === flight.id}
                        onClick={() => {
                          setMenuOpenId(null);
                          submitFlight(flight.id);
                        }}
                      >
                        {busyId === flight.id ? "Submitting..." : "Submit"}
                      </button>
                      <button
                        type="button"
                        className="flight-action-menu-item flight-action-menu-item-danger"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpenId(null);
                          setDeleteTargetId(flight.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <FlightDraftDialog organizationId={organizationId} unitId={unitId} pilotId={currentUserId} aircraft={aircraft} />

      {message ? <div className="form-note">{message}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Status overview</h2>
          </div>
        </div>
        <div className="panel-body grid-4">
          <div className="mini-card">
            <h3>Drafts</h3>
            <p>{rows.filter((row) => row.status === "Draft").length} open entries</p>
          </div>
          <div className="mini-card">
            <h3>Submitted</h3>
            <p>{rows.filter((row) => row.status === "Submitted").length} entries waiting for review</p>
          </div>
          <div className="mini-card">
            <h3>Approved</h3>
            <p>{rows.filter((row) => row.status === "Approved").length} confirmed entries</p>
          </div>
          <div className="mini-card">
            <h3>Rejected</h3>
            <p>{rows.filter((row) => row.status === "Rejected").length} entries with remarks</p>
          </div>
        </div>
      </section>

      <DataTable
        title="Digital flight records"
        rows={rows}
        columns={columns}
      />

      <FlightDraftDialog
        organizationId={editTarget?.organization_id ?? organizationId}
        unitId={editTarget?.unit_id ?? unitId}
        pilotId={editTarget?.pilot_id ?? currentUserId}
        aircraft={aircraft}
        mode="edit"
        flight={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTargetId(null);
          }
        }}
        hideTrigger
      />

      <FlightDeleteDialog
        flight={deleteTarget}
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
