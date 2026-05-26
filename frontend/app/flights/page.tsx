import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { FlightDraftForm } from "@/components/flight-draft-form";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, getAuthHeader, type ApiAircraft, type ApiFlight } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { aircraftStatusLabel, flightStatusTone, mapFlightRows } from "@/lib/view-model";

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
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Filters</h2>
              <p>Search and sorting</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="filters-row">
              <span className="filter-chip">Period</span>
              <span className="filter-chip">Pilot</span>
              <span className="filter-chip">Aircraft</span>
              <span className="filter-chip">Status</span>
              <span className="filter-chip">Flight type</span>
              <span className="filter-chip">Unit</span>
            </div>
            <div className="mini-card">
              <h3>Review rules</h3>
              <p>Reviewed entries are locked and can only be adjusted through change requests.</p>
            </div>
            <div className="mini-card">
              <h3>Export</h3>
              <p>PDF, CSV, and Excel output are prepared for official records.</p>
            </div>
          </div>
        </section>
      }
    >
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Create new draft</h2>
          </div>
        </div>
        <div className="panel-body">
          <FlightDraftForm
            organizationId={session.user.organization_id}
            unitId={session.user.unit_id ?? session.user.organization_id}
            pilotId={session.user.id}
            aircraft={aircraft.filter((item) => item.organization_id === session.user.organization_id)}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Status overview</h2>
            <p>Workflow for draft, submission, review, and approval</p>
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
        subtitle="Table view with status and mission data"
        rows={rows}
        columns={[
          { header: "Date", render: (row) => row.date },
          { header: "Time", render: (row) => row.time },
          { header: "Pilot", render: (row) => row.pilot },
          { header: "Aircraft", render: (row) => row.aircraft },
          { header: "Category", render: (row) => row.category },
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
                <StatusPill tone={item.release_status ? "success" : "warning"}>{aircraftStatusLabel(item.status)}</StatusPill>
              </div>
              <span>
                {item.manufacturer} · {item.model} · {item.operating_hours.toFixed(1)} h · {item.maintenance_status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
