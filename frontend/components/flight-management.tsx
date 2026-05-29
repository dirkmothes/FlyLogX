"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FlightDeleteDialog } from "@/components/flight-delete-dialog";
import { FlightDetailsDialog } from "@/components/flight-details-dialog";
import { FlightDraftDialog } from "@/components/flight-draft-dialog";
import { ExportActions } from "@/components/export-actions";
import { DropdownSelect } from "@/components/dropdown-select";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { API_BASE_URL, type ApiAircraft, type ApiFlight, type RoleName } from "@/lib/api";
import { flightStatusTone, mapFlightRows, type FlightRow } from "@/lib/view-model";

type Props = {
  viewerRole: RoleName;
  currentUserId: string;
  organizationId: string | null;
  unitId: string | null;
  aircraft: ApiAircraft[];
  flights: ApiFlight[];
};

type FlightTableRow = FlightRow & {
  flightId: string;
  rawStatus: ApiFlight["status"];
  pilotId: string;
  searchableText: string;
};

export function FlightManagement({ viewerRole, currentUserId, organizationId, unitId, aircraft, flights }: Props) {
  const router = useRouter();
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [detailsTargetId, setDetailsTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flightSearch, setFlightSearch] = useState<string>("");
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
        searchableText: [
          flights[index]?.flight_number,
          flights[index]?.id,
          flights[index]?.organization_name,
          flights[index]?.organization_id,
          flights[index]?.unit_name,
          flights[index]?.unit_code,
          flights[index]?.unit_id,
          flights[index]?.pilot_name,
          flights[index]?.pilot_id,
          flights[index]?.aircraft_identifier,
          flights[index]?.aircraft_name,
          flights[index]?.aircraft_id,
          flights[index]?.flight_type,
          flights[index]?.category,
          flights[index]?.status,
          flights[index]?.date,
          flights[index]?.location,
          flights[index]?.coordinates,
          flights[index]?.special_notes,
          flights[index]?.remarks,
          flights[index]?.flight_supervisor_name,
          flights[index]?.flight_supervisor_id,
          flights[index]?.flight_supervisor_signature,
          flights[index]?.created_by_name,
          flights[index]?.created_by,
          flights[index]?.updated_by_name,
          flights[index]?.updated_by,
          flights[index]?.reviewed_by_name,
          flights[index]?.reviewed_by,
          flights[index]?.approved_by_name,
          flights[index]?.approved_by,
          flights[index]?.rejected_by_name,
          flights[index]?.rejected_by,
          flights[index]?.rejection_reason,
          flights[index]?.change_request,
        ]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" ")
          .toLowerCase(),
      })),
    [flights],
  );

  const editTarget = flights.find((flight) => flight.id === editTargetId) ?? null;
  const deleteTarget = flights.find((flight) => flight.id === deleteTargetId) ?? null;
  const activeAircraft = useMemo(() => aircraft.filter((item) => item.status === "active"), [aircraft]);
  const editableFlightAircraft = useMemo(() => {
    if (!editTarget) {
      return activeAircraft;
    }

    const targetAircraft = aircraft.find((item) => item.id === editTarget.aircraft_id);
    if (!targetAircraft || targetAircraft.status === "active") {
      return activeAircraft;
    }

    return [...activeAircraft, targetAircraft];
  }, [activeAircraft, aircraft, editTarget]);
  const canManageFlight = (flight: ApiFlight) => viewerRole === "admin" || flight.pilot_id === currentUserId;
  const canEditFlight = (flight: ApiFlight) => canManageFlight(flight) && (flight.status === "draft" || flight.status === "rejected");
  const canSubmitFlight = (flight: ApiFlight) => canManageFlight(flight) && flight.status === "draft";
  const canWithdrawFlight = (flight: ApiFlight) => canManageFlight(flight) && flight.status === "submitted";
  const canDeleteFlight = (flight: ApiFlight) => canManageFlight(flight) && (flight.status === "draft" || flight.status === "approved");

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || row.rawStatus === statusFilter;
        const searchTerm = flightSearch.trim().toLowerCase();
        const matchesSearch = searchTerm === "" || row.searchableText.includes(searchTerm);
        return matchesCategory && matchesStatus && matchesSearch;
      }),
    [categoryFilter, flightSearch, rows, statusFilter],
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

  useEffect(() => {
    if (detailsTargetId && !flights.some((flight) => flight.id === detailsTargetId)) {
      setDetailsTargetId(null);
    }
  }, [detailsTargetId, flights]);

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
    ...(viewerRole === "pilot" ? [] : [{ header: "Pilot", render: (row: FlightTableRow) => row.pilot }]),
    { header: "Aircraft", render: (row: FlightTableRow) => row.aircraft },
    { header: "Mission type", render: (row: FlightTableRow) => row.type },
    { header: "Category", render: (row: FlightTableRow) => row.category },
    { header: "Duration", render: (row: FlightTableRow) => row.duration },
    { header: "Period", render: (row: FlightTableRow) => row.period },
    {
      header: "State",
      className: "table-status-cell",
      render: (row: FlightTableRow) => <StatusPill tone={flightStatusTone(row.rawStatus)}>{row.status}</StatusPill>,
    },
    {
      header: "",
      className: "table-actions-cell flight-actions-cell",
      render: (row: FlightTableRow) => {
        const flight = flights.find((item) => item.id === row.flightId) ?? null;
        const editable = flight ? canEditFlight(flight) : false;
        const submittable = flight ? canSubmitFlight(flight) : false;
        const withdrawable = flight ? canWithdrawFlight(flight) : false;
        const deletable = flight ? canDeleteFlight(flight) : false;
        const hasActions = Boolean(flight);

        return hasActions && flight ? (
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
                <button
                  type="button"
                  className="flight-action-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpenId(null);
                    setDetailsTargetId(flight.id);
                  }}
                >
                  Details
                </button>
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
                    {submittable ? (
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
                    ) : null}
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
        ) : null;
      },
    },
  ];

  return (
    <>
      <FlightDraftDialog organizationId={organizationId} unitId={unitId} pilotId={currentUserId} aircraft={activeAircraft} />

      {message ? <div className="form-note">{message}</div> : null}

      <section className="admin-command flights-command">
        <div>
          <span className="admin-kicker">Records</span>
          <h2>Export flight records</h2>
        </div>
        <div className="admin-command-actions flights-command-actions">
          <ExportActions format="csv" />
          <ExportActions format="pdf" />
        </div>
      </section>

      <DataTable
        title="Digital flight records"
        actions={
          <div className="flight-table-filters">
            <label className="flight-search-field" aria-label="Search flights">
              <span className="flight-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M10.5 4.5a6 6 0 1 0 3.73 10.69l4.54 4.54 1.41-1.41-4.54-4.54A6 6 0 0 0 10.5 4.5Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                className="input flight-search-input"
                value={flightSearch}
                placeholder="Search flights"
                aria-label="Search flights"
                onChange={(event) => setFlightSearch(event.target.value)}
              />
            </label>
            <DropdownSelect
              className="flight-filter-select"
              value={categoryFilter}
              placeholder="All categories"
              options={[
                { value: "all", label: "All categories" },
                { value: "U Flights", label: "U Flights" },
                { value: "S Flights", label: "S Flights" },
                { value: "E-H Flights", label: "E-H Flights" },
                { value: "T Flights", label: "T Flights" },
                { value: "A Flights", label: "A Flights" },
              ]}
              onChange={setCategoryFilter}
            />
            <DropdownSelect
              className="flight-filter-select"
              value={statusFilter}
              placeholder="All states"
              options={[
                { value: "all", label: "All states" },
                { value: "draft", label: "Draft" },
                { value: "submitted", label: "Submitted" },
                { value: "reviewed", label: "Reviewed" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
              onChange={setStatusFilter}
            />
          </div>
        }
        rows={filteredRows}
        columns={columns}
        emptyMessage={rows.length ? "No flights match the selected filters." : "No data available."}
      />

      <FlightDetailsDialog
        flight={flights.find((item) => item.id === detailsTargetId) ?? null}
        open={detailsTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsTargetId(null);
          }
        }}
      />

      <FlightDraftDialog
        organizationId={editTarget?.organization_id ?? organizationId}
        unitId={editTarget?.unit_id ?? unitId}
        pilotId={editTarget?.pilot_id ?? currentUserId}
        aircraft={editableFlightAircraft}
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
