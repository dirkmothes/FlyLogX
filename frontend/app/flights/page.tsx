import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { FlightDraftDialog } from "@/components/flight-draft-dialog";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, formatDate, getAuthHeader, type ApiAircraft, type ApiFlight } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { aircraftStatusLabel, aircraftStatusTone, flightStatusTone, mapFlightRows } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function FlightsPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const [flights, aircraft] = await Promise.all([
    apiFetch<ApiFlight[]>("/api/flights", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
    apiFetch<ApiAircraft[]>("/api/aircraft", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
  ]);

  const rows = mapFlightRows(flights);

  return (
    <AppShell
      title="Flight logbook and records"
      breadcrumbs={["FlyLogX", "Module", "Flights"]}
      user={session.user}
    >
      <FlightDraftDialog
        organizationId={session.user.organization_id}
        unitId={session.user.unit_id ?? session.user.organization_id}
        pilotId={session.user.id}
        aircraft={aircraft.filter((item) => item.organization_id === session.user.organization_id)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Status overview</h2>
          </div>
        </div>
        <div className="panel-body grid-4">
          <div className="mini-card">
            <h3>Drafts</h3>
            <p>{rows.filter((row) => row.status === "Draft").length} open entries</p>
          </div>
          <div className="mini-card">
            <h3>Submitted</h3>
            <p>{rows.filter((row) => row.status === "Submitted").length} entries waiting for review</p>
          </div>
          <div className="mini-card">
            <h3>Approved</h3>
            <p>{rows.filter((row) => row.status === "Approved").length} confirmed entries</p>
          </div>
          <div className="mini-card">
            <h3>Rejected</h3>
            <p>{rows.filter((row) => row.status === "Rejected").length} entries with remarks</p>
          </div>
        </div>
      </section>

      <DataTable
        title="Digital flight records"
        rows={rows}
        columns={[
          { header: "Date", render: (row) => row.date },
          { header: "Pilot", render: (row) => row.pilot },
          { header: "Aircraft", render: (row) => row.aircraft },
          { header: "Category", render: (row) => row.category },
          { header: "Duration", render: (row) => row.duration },
          { header: "Mission type", render: (row) => row.type },
          { header: "Day", render: (row) => row.day },
          { header: "Night", render: (row) => row.night },
          { header: "Status", render: (row) => <StatusPill tone={flightStatusTone(row.status)}>{row.status}</StatusPill> },
        ]}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Aircraft overview</h2>
            <p>Active systems in the central registry</p>
          </div>
        </div>
        <div className="panel-body section-stack">
          {aircraft.map((item) => (
            <div className="workflow-step" key={item.id}>
              <div className="bar-row-head">
                <strong>
                  {item.identifier} · {item.name}
                </strong>
                <StatusPill tone={aircraftStatusTone(item.status)}>{aircraftStatusLabel(item.status)}</StatusPill>
              </div>
              <span>
                {item.manufacturer} · {item.model} · {item.operating_hours.toFixed(1)} h · Last maintenance{" "}
                {item.last_maintenance ? formatDate(item.last_maintenance) : "n/a"} · Next maintenance{" "}
                {item.next_maintenance ? formatDate(item.next_maintenance) : "n/a"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
