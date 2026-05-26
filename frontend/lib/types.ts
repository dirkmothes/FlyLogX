export type Role = "pilot" | "supervisor" | "admin";

export type FlightStatus = "Draft" | "Submitted" | "Reviewed" | "Approved" | "Rejected";

export type FlightCategory = "U Flights" | "S Flights" | "E-H Flights" | "T Flights" | "A Flights";

export type AircraftStatus = "Active" | "Maintenance" | "Retired";

export type FlightRow = {
  id: string;
  date: string;
  pilot: string;
  unit: string;
  aircraft: string;
  category: FlightCategory;
  duration: string;
  type: string;
  status: FlightStatus;
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
  status: AircraftStatus;
  maintenance: string;
  hours: string;
};

export type AuditRow = {
  time: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};
