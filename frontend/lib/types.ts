export type Role = "pilot" | "supervisor" | "admin";

export type FlightStatus = "Entwurf" | "Eingereicht" | "Geprüft" | "Freigegeben" | "Abgelehnt";

export type FlightCategory = "Ü-Flüge" | "S-Flüge" | "E-H-Flüge" | "T-Flüge" | "A-Flüge";

export type AircraftStatus = "aktiv" | "in Wartung" | "außer Dienst";

export type FlightRow = {
  id: string;
  date: string;
  time: string;
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
  release: string;
};

export type AuditRow = {
  time: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};
