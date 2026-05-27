"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pilotFilter, setPilotFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
  const canManageFlight = (flight: ApiFlight) => viewerRole === "admin" || flight.pilot_id === currentUserId;
  const canEditFlight = (flight: ApiFlight) => canManageFlight(flight) && flight.status === "draft";
  const canWithdrawFlight = (flight: ApiFlight) => canManageFlight(flight) && flight.status === "submitted";
  const canDeleteFlight = (flight: ApiFlight) => canManageFlight(flight) && (flight.status === "draft" || flight.status === "approved");

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || row.rawStatus === statusFilter;
        const matchesPilot = viewerRole === "supervisor" || viewerRole === "admin" ? pilotFilter === "all" || row.pilotId === pilotFilter : true;
        return matchesCategory && matchesStatus && matchesPilot;
      }),
    [categoryFilter, pilotFilter, rows, statusFilter, viewerRole],
  );

  const pilotOptions = useMemo(
    () =>
      Array.from(
        new Map(
          rows.map((row) => [row.pilotId, { id: row.pilotId, label: row.pilot }]),
        ).values(),
      ).sort((left, right) => left.label.localeCompare(right.label)),
    [rows],
  );

  useEffect(() => {
    function closeMenu(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          setMenuOpenId(null);
        }
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target?.closest(".flight-action-menu") && !target?.closest(".flight-action-popover")) {
        setMenuOpenId(null);
      }
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeMenu);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, []);

  useEffect(() => {
    const activeMenuId = menuOpenId as string;
    if (!activeMenuId) {
      setMenuPosition(null);
      return;
    }

    function updateMenuPosition() {
      const button = menuButtonRefs.current[activeMenuId];
      if (!button) {
        setMenuPosition(null);
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuWidth = 148;
      const menuHeight = 118;
      const openBelow = rect.bottom + 8 + menuHeight <= window.innerHeight || rect.top < menuHeight + 24;
      setMenuPosition({
        top: openBelow ? rect.bottom + 8 : Math.max(12, rect.top - 8 - menuHeight),
        left: Math.max(12, Math.min(window.innerWidth - (menuWidth + 12), rect.right - (menuWidth - 20))),
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuOpenId]);

  useEffect(() => {
    if (menuOpenId && !filteredRows.some((row) => row.flightId === menuOpenId)) {
      setMenuOpenId(null);
      setMenuPosition(null);
    }
  }, [filteredRows, menuOpenId]);

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

  async function withdrawFlight(flightId: string) {
    setBusyId(flightId);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/flights/${flightId}/withdraw`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not withdraw the entry.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not withdraw the entry.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { header: "Date", render: (row: FlightTableRow) => row.date },
    { header: "Pilot", render: (row: FlightTableRow) => row.pilot },
    { header: "Aircraft", render: (row: FlightTableRow) => row.aircraft },
    { header: "Mission type", render: (row: FlightTableRow) => row.type },
    { header: "Category", render: (row: FlightTableRow) => row.category },
    { header: "Duration", render: (row: FlightTableRow) => row.duration },
    { header: "Period", render: (row: FlightTableRow) => row.period },
    {
      header: "State",
      className: "table-status-cell",
      render: (row: FlightTableRow) => {
        const flight = flights.find((item) => item.id === row.flightId) ?? null;
        const editable = flight ? canEditFlight(flight) : false;
        const withdrawable = flight ? canWithdrawFlight(flight) : false;
        const deletable = flight ? canDeleteFlight(flight) : false;
        const hasActions = Boolean(editable || withdrawable || deletable);

        return (
          <div className="flight-status-actions">
            <StatusPill tone={flightStatusTone(row.rawStatus)}>{row.status}</StatusPill>
            {hasActions && flight ? (
              <div className="flight-action-menu">
                <button
                  ref={(node) => {
                    menuButtonRefs.current[flight.id] = node;
                  }}
                  type="button"
                  className="flight-action-menu-trigger"
                  aria-label={`Open actions for flight ${row.id}`}
                  aria-expanded={menuOpenId === flight.id}
                  onClick={() => {
                    setMenuOpenId((current) => (current === flight.id ? null : flight.id));
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm0 6.1a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" fill="currentColor" />
                  </svg>
                </button>
                {menuOpenId === flight.id && menuPosition ? (
                  <div
                    className="flight-action-popover"
                    role="menu"
                    aria-label={`Actions for flight ${row.id}`}
                    style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                  >
                    {editable ? (
                      <>
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
                      </>
                    ) : null}
                    {withdrawable ? (
                      <button
                        type="button"
                        className="flight-action-menu-item flight-action-menu-item-submit"
                        role="menuitem"
                        disabled={busyId === flight.id}
                        onClick={() => {
                          setMenuOpenId(null);
                          withdrawFlight(flight.id);
                        }}
                      >
                        {busyId === flight.id ? "Withdrawing..." : "Withdraw"}
                      </button>
                    ) : null}
                    {deletable ? (
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
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <FlightDraftDialog organizationId={organizationId} unitId={unitId} pilotId={currentUserId} aircraft={aircraft} />

      {message ? <div className="form-note">{message}</div> : null}

      <DataTable
        title="Digital flight records"
        actions={
          <div className="flight-table-filters">
            {viewerRole === "supervisor" || viewerRole === "admin" ? (
              <select className="input flight-filter-select" value={pilotFilter} onChange={(event) => setPilotFilter(event.target.value)}>
                <option value="all">All pilots</option>
                {pilotOptions.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.label}
                  </option>
                ))}
              </select>
            ) : null}
            <select className="input flight-filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              <option value="U Flights">U Flights</option>
              <option value="S Flights">S Flights</option>
              <option value="E-H Flights">E-H Flights</option>
              <option value="T Flights">T Flights</option>
              <option value="A Flights">A Flights</option>
            </select>
            <select className="input flight-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All states</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              className="button button-secondary flight-filter-reset"
              onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setPilotFilter("all");
              }}
              disabled={categoryFilter === "all" && statusFilter === "all" && pilotFilter === "all"}
            >
              Reset
            </button>
          </div>
        }
        rows={filteredRows}
        columns={columns}
        emptyMessage={rows.length ? "No flights match the selected filters." : "No data available."}
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
