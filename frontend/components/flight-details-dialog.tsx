"use client";

import { useEffect, useState } from "react";

import type { ApiFlight } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/api";
import { flightStatusLabel, flightStatusTone } from "@/lib/view-model";
import { StatusPill } from "@/components/status-pill";

type Props = {
  flight: ApiFlight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FlightDetailsTab = "overview" | "scope" | "workflow" | "references";

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function formatDateValue(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return formatDate(value);
}

function formatDateTimeValue(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return formatDateTime(value);
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="admin-record-field flight-details-field">
      <span>{label}</span>
      <strong className="flight-details-value">{formatValue(value)}</strong>
    </div>
  );
}

export function FlightDetailsDialog({ flight, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<FlightDetailsTab>("overview");

  useEffect(() => {
    if (!open) {
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

  useEffect(() => {
    setActiveTab("overview");
  }, [flight?.id]);

  if (!flight) {
    return null;
  }

  const referenceItems = [
    { label: "Organization", value: `${flight.organization_name ?? "Unknown"} · ${flight.organization_id}` },
    { label: "Unit", value: `${flight.unit_name ?? "Unknown"} · ${flight.unit_code ?? flight.unit_id}` },
    { label: "Pilot", value: `${flight.pilot_name ?? "Unknown"} · ${flight.pilot_id}` },
    { label: "Aircraft", value: `${flight.aircraft_identifier}${flight.aircraft_name ? ` · ${flight.aircraft_name}` : ""} · ${flight.aircraft_id}` },
    { label: "Supervisor", value: flight.flight_supervisor_name ? `${flight.flight_supervisor_name} · ${flight.flight_supervisor_id ?? "n/a"}` : "—" },
    { label: "Created by", value: `${flight.created_by_name ?? "Unknown"} · ${flight.created_by}` },
    { label: "Updated by", value: `${flight.updated_by_name ?? "Unknown"} · ${flight.updated_by}` },
    { label: "Reviewed by", value: flight.reviewed_by ? `${flight.reviewed_by_name ?? "Unknown"} · ${flight.reviewed_by}` : "—" },
    { label: "Approved by", value: flight.approved_by ? `${flight.approved_by_name ?? "Unknown"} · ${flight.approved_by}` : "—" },
    { label: "Rejected by", value: flight.rejected_by ? `${flight.rejected_by_name ?? "Unknown"} · ${flight.rejected_by}` : "—" },
  ];

  const tabItems: Array<{ id: FlightDetailsTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "scope", label: "Scope" },
    { id: "workflow", label: "Workflow" },
    { id: "references", label: "References" },
  ];

  return (
    <div
      className="admin-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <section className="admin-dialog flight-details-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-details-dialog-title">
        <div className="admin-dialog-header">
          <div>
            <span className="admin-mini-badge">Flight details</span>
            <h3 id="flight-details-dialog-title">{flight.flight_number || flight.id}</h3>
            <p>{flight.flight_type}</p>
          </div>
          <button type="button" className="admin-close-button" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="admin-dialog-form flight-details-body">
          <div className="flight-details-tabs" role="tablist" aria-label="Flight details sections">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                id={`flight-details-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`flight-details-panel-${tab.id}`}
                className={`flight-details-tab ${activeTab === tab.id ? "flight-details-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <section id="flight-details-panel-overview" className="flight-details-section" role="tabpanel" aria-labelledby="flight-details-tab-overview">
              <div className="flight-details-section-header">
                <h4>Overview</h4>
                <StatusPill tone={flightStatusTone(flight.status)}>{flightStatusLabel(flight.status)}</StatusPill>
              </div>
              <div className="admin-record-meta flight-details-grid flight-details-grid-two">
                <DetailField label="Date" value={formatDateValue(flight.date)} />
                <DetailField label="Category" value={flight.category} />
                <DetailField label="Period" value={flight.night_flight ? "Night" : "Day"} />
                <DetailField label="Duration" value={`${flight.duration_minutes} min`} />
                <DetailField label="Flight count" value={flight.flight_count} />
                <DetailField label="Location" value={flight.location} />
                <DetailField label="Coordinates" value={flight.coordinates} />
                <DetailField label="Deleted" value={flight.is_deleted ? "Yes" : "No"} />
              </div>
            </section>
          ) : null}

          {activeTab === "scope" ? (
            <section id="flight-details-panel-scope" className="flight-details-section" role="tabpanel" aria-labelledby="flight-details-tab-scope">
              <h4>Scope snapshot</h4>
              <div className="admin-record-meta flight-details-grid flight-details-grid-two">
                <DetailField label="Organization snapshot" value={`${flight.organization_name ?? "Unknown"} · ${flight.organization_id}`} />
                <DetailField label="Unit snapshot" value={`${flight.unit_name ?? "Unknown"} · ${flight.unit_code ?? flight.unit_id}`} />
                <DetailField label="Aircraft snapshot" value={`${flight.aircraft_identifier}${flight.aircraft_name ? ` · ${flight.aircraft_name}` : ""}`} />
                <DetailField label="Pilot" value={`${flight.pilot_name ?? "Unknown"} · ${flight.pilot_id}`} />
                <DetailField label="Supervisor name" value={flight.flight_supervisor_name} />
                <DetailField label="Supervisor signature" value={flight.flight_supervisor_signature} />
              </div>
            </section>
          ) : null}

          {activeTab === "workflow" ? (
            <section id="flight-details-panel-workflow" className="flight-details-section" role="tabpanel" aria-labelledby="flight-details-tab-workflow">
              <div className="flight-details-section-header">
                <h4>Workflow</h4>
              </div>
              <div className="flight-details-workflow-grid">
                <section className="flight-details-subsection">
                  <h5>Workflow</h5>
                  <div className="admin-record-meta flight-details-grid flight-details-grid-two">
                    <DetailField label="Created at" value={formatDateTimeValue(flight.created_at)} />
                    <DetailField label="Updated at" value={formatDateTimeValue(flight.updated_at)} />
                    <DetailField label="Submitted at" value={formatDateTimeValue(flight.submitted_at)} />
                    <DetailField label="Reviewed at" value={formatDateTimeValue(flight.reviewed_at)} />
                    <DetailField label="Approved at" value={formatDateTimeValue(flight.approved_at)} />
                    <DetailField label="Rejection reason" value={flight.rejection_reason} />
                    <DetailField label="Change request" value={flight.change_request} />
                  </div>
                </section>

                <section className="flight-details-subsection">
                  <h5>Carryover and totals</h5>
                  <div className="admin-record-meta flight-details-grid flight-details-grid-two">
                    <DetailField label="Previous flights" value={flight.previous_flights} />
                    <DetailField label="Previous hours" value={flight.previous_hours.toFixed(2)} />
                    <DetailField label="Monthly carryover" value={flight.monthly_carryover.toFixed(2)} />
                    <DetailField label="Yearly carryover" value={flight.yearly_carryover.toFixed(2)} />
                    <DetailField label="Total flights" value={flight.total_flights} />
                    <DetailField label="Total hours" value={flight.total_hours.toFixed(2)} />
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {activeTab === "references" ? (
            <section id="flight-details-panel-references" className="flight-details-section" role="tabpanel" aria-labelledby="flight-details-tab-references">
              <h4>References and dependencies</h4>
              <div className="flight-details-list">
                {referenceItems.map((item) => (
                  <div key={item.label} className="flight-details-ref">
                    <span>{item.label}</span>
                    <strong>{formatValue(item.value)}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
