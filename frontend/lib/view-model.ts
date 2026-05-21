import type { ApiAircraft, ApiAuditEvent, ApiFlight, DashboardSummary } from "@/lib/api";
import { formatDate, formatDateTime, formatDuration } from "@/lib/api";

export type FlightRow = {
  id: string;
  date: string;
  time: string;
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
  maintenance: string;
  hours: string;
  release: string;
};

export type AuditRow = {
  time: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};

export type DashboardCard = { label: string; value: string; delta: string; tone: "blue" | "green" | "yellow" | "red" };

export function flightStatusLabel(status: ApiFlight["status"]) {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "submitted":
      return "Eingereicht";
    case "reviewed":
      return "Geprüft";
    case "approved":
      return "Freigegeben";
    case "rejected":
      return "Abgelehnt";
    default:
      return status;
  }
}

export function flightStatusTone(status: ApiFlight["status"] | string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "approved" || status === "Freigegeben") return "success";
  if (status === "rejected" || status === "Abgelehnt") return "danger";
  if (status === "submitted" || status === "Eingereicht") return "warning";
  if (status === "reviewed" || status === "Geprüft") return "info";
  return "neutral";
}

export function aircraftStatusTone(status: ApiAircraft["status"] | string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "active" || status === "aktiv") return "success";
  if (status === "maintenance" || status === "in Wartung") return "warning";
  return "danger";
}

export function aircraftStatusLabel(status: ApiAircraft["status"]) {
  switch (status) {
    case "active":
      return "aktiv";
    case "maintenance":
      return "in Wartung";
    case "retired":
      return "außer Dienst";
    default:
      return status;
  }
}

export function aircraftReleaseLabel(release: boolean) {
  return release ? "freigegeben" : "gesperrt";
}

export function mapDashboard(summary: DashboardSummary): DashboardCard[] {
  return [
    { label: "Gesamtflugzeit", value: `${summary.total_hours.toFixed(1)} h`, delta: `+${summary.approved_entries} Freigaben`, tone: "blue" },
    { label: "Flüge gesamt", value: `${summary.total_flights}`, delta: `+${summary.recent_flights.length} recent`, tone: "green" },
    { label: "Offene Einträge", value: `${summary.open_entries}`, delta: `${summary.pending_reviews} zur Prüfung`, tone: "yellow" },
    { label: "Abgelehnt", value: `${summary.rejected_entries}`, delta: "revisionssicher protokolliert", tone: "red" },
  ];
}

export function mapFlightRows(flights: ApiFlight[]): FlightRow[] {
  return flights.map((flight) => ({
    id: flight.flight_number || flight.id,
    date: formatDate(flight.date),
    time: `${flight.start_time.slice(0, 5)} - ${flight.landing_time.slice(0, 5)}`,
    pilot: flight.pilot_name || flight.pilot_id,
    unit: flight.unit_code || flight.unit_name || flight.unit_id,
    aircraft: flight.aircraft_name ? `${flight.aircraft_identifier} · ${flight.aircraft_name}` : flight.aircraft_identifier,
    category: flight.category,
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
    maintenance: item.maintenance_status,
    hours: `${item.operating_hours.toFixed(1)} h`,
    release: aircraftReleaseLabel(item.release_status),
  }));
}

export function mapAuditRows(audit: ApiAuditEvent[]): AuditRow[] {
  return audit.map((item) => ({
    time: formatDateTime(item.timestamp),
    actor: item.actor_name,
    action: item.action,
    entity: `${item.entity_type} · ${item.entity_id}`,
    detail: item.comment || "Audit-Eintrag ohne Kommentar",
  }));
}
