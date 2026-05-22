export type RoleName = "pilot" | "supervisor" | "admin";

export type FlightStatus = "draft" | "submitted" | "reviewed" | "approved" | "rejected";
export type FlightCategory = "U Flights" | "S Flights" | "E-H Flights" | "T Flights" | "A Flights";
export type AircraftStatus = "active" | "maintenance" | "retired";

export type ApiUser = {
  id: string;
  organization_id: string;
  unit_id: string | null;
  role: RoleName;
  name: string;
  email: string;
  active: boolean;
  is_deleted: boolean;
  supervised_organization_ids: string[];
};

export type ApiOrganization = {
  id: string;
  name: string;
  parent_id: string | null;
  is_deleted: boolean;
};

export type ApiUnit = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  is_deleted: boolean;
};

export type ApiAircraft = {
  id: string;
  organization_id: string;
  owner_unit_id: string | null;
  name: string;
  identifier: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  category: string;
  aircraft_type: string;
  uas_class: string;
  weight_kg: number;
  use_case: string;
  registration_number: string | null;
  internal_identifier: string;
  battery_type: string | null;
  battery_count: number;
  energy_source: string | null;
  payload: string | null;
  max_duration_minutes: number | null;
  operating_hours: number;
  maintenance_status: string;
  last_maintenance: string | null;
  next_maintenance: string | null;
  release_status: boolean;
  availability: string;
  status: AircraftStatus;
  notes: string | null;
  is_deleted: boolean;
};

export type ApiFlight = {
  id: string;
  organization_id: string;
  unit_id: string;
  unit_name: string | null;
  unit_code: string | null;
  pilot_id: string;
  pilot_name: string | null;
  aircraft_id: string;
  aircraft_identifier: string;
  aircraft_name: string | null;
  flight_number: string | null;
  category: FlightCategory;
  flight_type: string;
  status: FlightStatus;
  date: string;
  start_time: string;
  landing_time: string;
  flight_count: number;
  duration_minutes: number;
  day_flight: boolean;
  night_flight: boolean;
  location: string;
  coordinates: string | null;
  special_notes: string | null;
  remarks: string | null;
  flight_supervisor_name: string | null;
  flight_supervisor_id: string | null;
  flight_supervisor_signature: string | null;
  previous_flights: number;
  previous_hours: number;
  monthly_carryover: number;
  yearly_carryover: number;
  total_flights: number;
  total_hours: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  change_request: string | null;
  is_deleted: boolean;
};

export type ApiAuditEvent = {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  comment: string | null;
};

export type DashboardSummary = {
  title: string;
  total_hours: number;
  total_flights: number;
  open_entries: number;
  rejected_entries: number;
  approved_entries: number;
  by_category: Record<string, number>;
  by_aircraft: Record<string, number>;
  by_month: Record<string, number>;
  recent_flights: ApiFlight[];
  incomplete_entries: number;
  pending_reviews: number;
  unit_comparison: Array<{ label: string; value: number }>;
};

export type AuthMeResponse = ApiUser;

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export const API_BASE_URL =
  (typeof window === "undefined" ? process.env.API_INTERNAL_URL : process.env.NEXT_PUBLIC_API_BASE_URL) ??
  (typeof window === "undefined" ? "http://backend:8000" : "/");

function buildUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await safeReadError(response);
    throw new Error(detail || `API request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function safeReadError(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string; message?: string };
    return payload.detail || payload.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export function getAuthHeader(token: string | undefined | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
