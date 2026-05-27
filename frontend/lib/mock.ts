import type { AircraftRow, AuditRow, FlightRow } from "@/lib/types";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", roles: ["pilot", "supervisor", "admin"] },
  { href: "/flights", label: "Flights", roles: ["pilot", "supervisor", "admin"] },
  { href: "/aircraft", label: "Aircraft", roles: ["pilot", "supervisor", "admin"] },
  { href: "/reviews", label: "Review", roles: ["supervisor", "admin"] },
  { href: "/audit", label: "Audit", roles: ["supervisor", "admin"] },
  { href: "/admin", label: "Administration", roles: ["supervisor", "admin"] },
];

export const kpis = [
  { label: "Total Flight Time", value: "247.8 h", delta: "+12.6 h" },
  { label: "Total Flights", value: "1,284", delta: "+38" },
  { label: "Open Entries", value: "12", delta: "-3" },
  { label: "Rejected", value: "4", delta: "0" },
];

export const flightRows: FlightRow[] = [
  {
    id: "FLX-2026-0041",
    date: "2026-05-18",
    pilot: "Sgt. M. Example",
    unit: "DS-NORTH",
    aircraft: "FLX-A1",
    category: "U Flights",
    duration: "00:42",
    type: "Reconnaissance Flight",
    status: "Approved",
    location: "Training Area North",
    period: "Day",
    reviewer: "Lt Col. A. Leiter",
  },
  {
    id: "FLX-2026-0042",
    date: "2026-05-20",
    pilot: "Sgt. M. Example",
    unit: "DS-NORTH",
    aircraft: "FLX-T7",
    category: "S Flights",
    duration: "00:26",
    type: "Training Flight",
    status: "Submitted",
    location: "Airfield West",
    period: "Night",
  },
  {
    id: "FLX-2026-0043",
    date: "2026-05-21",
    pilot: "Sgt. M. Example",
    unit: "DS-NORTH",
    aircraft: "FLX-A1",
    category: "T Flights",
    duration: "00:15",
    type: "Technical Test Flight",
    status: "Draft",
    location: "Hangar 3",
    period: "Day",
  },
];

export const aircraftRows: AircraftRow[] = [
  {
    id: "aircraft-01",
    name: "Recon Drone A1",
    identifier: "FLX-A1",
    manufacturer: "FlyLogX Systems",
    model: "R-14 Recon",
    status: "Active",
    hours: "148.6 h",
  },
  {
    id: "aircraft-02",
    name: "Training Platform T7",
    identifier: "FLX-T7",
    manufacturer: "FlyLogX Systems",
    model: "Trainer 7",
    status: "Maintenance",
    hours: "76.2 h",
  },
];

export const auditRows: AuditRow[] = [
  {
    time: "2026-05-21 09:47",
    actor: "Staff Sgt. F. Admin",
    action: "Role assignment",
    entity: "User",
    detail: "Pilot was assigned to unit DS-NORTH.",
  },
  {
    time: "2026-05-20 18:41",
    actor: "Lt Col. A. Leiter",
    action: "Approval",
    entity: "Flight FLX-2026-0041",
    detail: "Approved with digital confirmation.",
  },
  {
    time: "2026-05-20 18:05",
    actor: "Cpl. M. Example",
    action: "Submitted",
    entity: "Flight FLX-2026-0042",
    detail: "Night flight submitted for review.",
  },
];

export const overviewBars = [
  { label: "U Flights", value: 68 },
  { label: "S Flights", value: 42 },
  { label: "E-H Flights", value: 31 },
  { label: "T Flights", value: 27 },
  { label: "A Flights", value: 14 },
];

export const monthTrend = [
  { month: "Jan", value: 32 },
  { month: "Feb", value: 28 },
  { month: "Mar", value: 35 },
  { month: "Apr", value: 46 },
  { month: "May", value: 58 },
  { month: "Jun", value: 60 },
];

export function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}
