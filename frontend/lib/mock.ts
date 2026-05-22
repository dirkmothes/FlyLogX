import type { AircraftRow, AuditRow, FlightRow } from "@/lib/types";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["pilot", "supervisor", "admin"] },
  { href: "/flights", label: "Flüge", roles: ["pilot", "supervisor", "admin"] },
  { href: "/aircraft", label: "Luftfahrzeuge", roles: ["pilot", "supervisor", "admin"] },
  { href: "/reviews", label: "Prüfung", roles: ["supervisor", "admin"] },
  { href: "/audit", label: "Audit", roles: ["supervisor", "admin"] },
  { href: "/admin", label: "Administration", roles: ["supervisor", "admin"] },
];

export const kpis = [
  { label: "Gesamtflugzeit", value: "247,8 h", delta: "+12,6 h" },
  { label: "Flüge gesamt", value: "1.284", delta: "+38" },
  { label: "Offene Einträge", value: "12", delta: "-3" },
  { label: "Abgelehnt", value: "4", delta: "0" },
];

export const flightRows: FlightRow[] = [
  {
    id: "FLX-2026-0041",
    date: "2026-05-18",
    time: "08:15 - 08:57",
    pilot: "HptGefr. M. Beispiel",
    unit: "DS-NORD",
    aircraft: "FLX-A1",
    category: "Ü-Flüge",
    duration: "00:42",
    type: "Aufklärungsflug",
    status: "Freigegeben",
    location: "Übungsraum Nord",
    day: "42 min",
    night: "0 min",
    reviewer: "Oberstleutnant A. Leiter",
  },
  {
    id: "FLX-2026-0042",
    date: "2026-05-20",
    time: "18:10 - 18:36",
    pilot: "HptGefr. M. Beispiel",
    unit: "DS-NORD",
    aircraft: "FLX-T7",
    category: "S-Flüge",
    duration: "00:26",
    type: "Schulungsflug",
    status: "Eingereicht",
    location: "Flugfeld West",
    day: "0 min",
    night: "26 min",
  },
  {
    id: "FLX-2026-0043",
    date: "2026-05-21",
    time: "09:30 - 09:45",
    pilot: "HptGefr. M. Beispiel",
    unit: "DS-NORD",
    aircraft: "FLX-A1",
    category: "T-Flüge",
    duration: "00:15",
    type: "Technischer Testflug",
    status: "Entwurf",
    location: "Hangar 3",
    day: "15 min",
    night: "0 min",
  },
];

export const aircraftRows: AircraftRow[] = [
  {
    id: "aircraft-01",
    name: "Aufklärungsdrohne A1",
    identifier: "FLX-A1",
    manufacturer: "FlyLogX Systems",
    model: "R-14 Recon",
    status: "aktiv",
    maintenance: "geprüft",
    hours: "148,6 h",
    release: "freigegeben",
  },
  {
    id: "aircraft-02",
    name: "Schulungsplattform T7",
    identifier: "FLX-T7",
    manufacturer: "FlyLogX Systems",
    model: "Trainer 7",
    status: "in Wartung",
    maintenance: "fällig",
    hours: "76,2 h",
    release: "gesperrt",
  },
];

export const auditRows: AuditRow[] = [
  {
    time: "2026-05-21 09:47",
    actor: "Stabsdienst F. Admin",
    action: "Rollenzuweisung",
    entity: "Benutzer",
    detail: "Pilot erhielt Einheit DS-NORD.",
  },
  {
    time: "2026-05-20 18:41",
    actor: "Oberstleutnant A. Leiter",
    action: "Freigabe",
    entity: "Flug FLX-2026-0041",
    detail: "Freigabe mit digitaler Bestätigung.",
  },
  {
    time: "2026-05-20 18:05",
    actor: "HptGefr. M. Beispiel",
    action: "Eingereicht",
    entity: "Flug FLX-2026-0042",
    detail: "Nachtflug zur Prüfung übermittelt.",
  },
];

export const overviewBars = [
  { label: "Ü-Flüge", value: 68 },
  { label: "S-Flüge", value: 42 },
  { label: "E-H-Flüge", value: 31 },
  { label: "T-Flüge", value: 27 },
  { label: "A-Flüge", value: 14 },
];

export const monthTrend = [
  { month: "Jan", value: 32 },
  { month: "Feb", value: 28 },
  { month: "Mär", value: 35 },
  { month: "Apr", value: 46 },
  { month: "Mai", value: 58 },
  { month: "Jun", value: 60 },
];

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}
