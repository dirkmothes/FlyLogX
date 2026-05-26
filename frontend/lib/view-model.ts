import type { ApiAircraft, ApiAuditEvent, ApiFlight, DashboardSummary } from "@/lib/api";
import { formatDate, formatDateTime, formatDuration } from "@/lib/api";

export type FlightRow = {
  id: string;
  date: string;
  pilot: string;
  unit: string;
  aircraft: string;
  category: ApiFlight["category"];
  duration: string;
  type: string;
  status: string;
  location: string;
  day: string;
  night: string;
  reviewer?: string;
};

export type AircraftRow = {
  id: string;
  name: string;
  identifier: string;
  manufacturer: string;
  model: string;
  status: string;
  lastMaintenance: string;
  nextMaintenance: string;
  hours: string;
};

export type AuditRow = {
  time: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};

export type DashboardCard = { label: string; value: string; delta: string; tone: "blue" | "green" | "yellow" | "red" };

export function flightCategoryLabel(category: ApiFlight["category"] | string): ApiFlight["category"] {
  switch (category) {
    case "U Flights":
      return "U Flights";
    case "S Flights":
      return "S Flights";
    case "E-H Flights":
      return "E-H Flights";
    case "T Flights":
      return "T Flights";
    case "A Flights":
      return "A Flights";
    default:
      return "U Flights";
  }
}

export function flightStatusLabel(status: ApiFlight["status"]) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "reviewed":
      return "Reviewed";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function flightStatusTone(status: ApiFlight["status"] | string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "approved" || status === "Approved") return "success";
  if (status === "rejected" || status === "Rejected") return "danger";
  if (status === "submitted" || status === "Submitted") return "warning";
  if (status === "reviewed" || status === "Reviewed") return "info";
  return "neutral";
}

export function aircraftStatusTone(status: ApiAircraft["status"] | string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "active" || status === "Active") return "success";
  if (status === "maintenance" || status === "Maintenance") return "warning";
  return "danger";
}

export function aircraftStatusLabel(status: ApiAircraft["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "maintenance":
      return "Maintenance";
    case "retired":
      return "Retired";
    default:
      return status;
  }
}

export function mapDashboard(summary: DashboardSummary): DashboardCard[] {
  return [
    { label: "Total Flight Time", value: `${summary.total_hours.toFixed(1)} h`, delta: `+${summary.approved_entries} approvals`, tone: "blue" },
    { label: "Total Flights", value: `${summary.total_flights}`, delta: `+${summary.recent_flights.length} recent`, tone: "green" },
    { label: "Open Entries", value: `${summary.open_entries}`, delta: `${summary.pending_reviews} pending review`, tone: "yellow" },
    { label: "Rejected", value: `${summary.rejected_entries}`, delta: "documented in history", tone: "red" },
  ];
}

export function mapFlightRows(flights: ApiFlight[]): FlightRow[] {
  return flights.map((flight) => ({
    id: flight.flight_number || flight.id,
    date: formatDate(flight.date),
    pilot: flight.pilot_name || flight.pilot_id,
    unit: flight.unit_code || flight.unit_name || flight.unit_id,
    aircraft: flight.aircraft_name ? `${flight.aircraft_identifier} · ${flight.aircraft_name}` : flight.aircraft_identifier,
    category: flightCategoryLabel(flight.category),
    duration: formatDuration(flight.duration_minutes),
    type: flight.flight_type,
    status: flightStatusLabel(flight.status),
    location: flight.location,
    day: flight.day_flight ? formatDuration(flight.duration_minutes) : "0 min",
    night: flight.night_flight ? formatDuration(flight.duration_minutes) : "0 min",
    reviewer: flight.flight_supervisor_name ?? undefined,
  }));
}

export function mapAircraftRows(aircraft: ApiAircraft[]): AircraftRow[] {
  return aircraft.map((item) => ({
    id: item.id,
    name: item.name,
    identifier: item.identifier,
    manufacturer: item.manufacturer,
    model: item.model,
    status: aircraftStatusLabel(item.status),
    lastMaintenance: item.last_maintenance ? formatDate(item.last_maintenance) : "n/a",
    nextMaintenance: item.next_maintenance ? formatDate(item.next_maintenance) : "n/a",
    hours: `${item.operating_hours.toFixed(1)} h`,
  }));
}

export function mapAuditRows(audit: ApiAuditEvent[]): AuditRow[] {
  return audit.map((item) => ({
    time: formatDateTime(item.timestamp),
    actor: item.actor_name,
    action: item.action,
    entity: `${item.entity_type} · ${item.entity_id}`,
    detail: item.comment || "Audit entry without a comment",
  }));
}
