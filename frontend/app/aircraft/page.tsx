import { AppShell } from "@/components/app-shell";
import { AircraftCreateForm } from "@/components/aircraft-create-form";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, getAuthHeader, type ApiAircraft, type ApiUnit } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { aircraftStatusTone, mapAircraftRows } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function AircraftPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const [aircraft, units] = await Promise.all([
    apiFetch<ApiAircraft[]>("/api/aircraft", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
    apiFetch<ApiUnit[]>("/api/units", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
  ]);

  const rows = mapAircraftRows(aircraft);

  return (
    <AppShell
      title="Central aircraft management"
      subtitle="Master data, mission status, maintenance, and releases for drones and aircraft."
      breadcrumbs={["FlyLogX", "Module", "Aircraft"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Maintenance status</h2>
              <p>Condition of active systems</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>Ready for use</h3>
              <p>{aircraft.filter((item) => item.status === "active").length} systems released</p>
            </div>
            <div className="mini-card">
              <h3>In maintenance</h3>
              <p>{aircraft.filter((item) => item.status === "maintenance").length} systems blocked</p>
            </div>
            <div className="mini-card">
              <h3>Next maintenance</h3>
              <p>{aircraft[0]?.next_maintenance ?? "n/a"}</p>
            </div>
          </div>
        </section>
      }
    >
      {session.user.role === "admin" ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create new aircraft</h2>
              <p>Master data maintenance for admins</p>
            </div>
          </div>
          <div className="panel-body">
            <AircraftCreateForm organizationId={session.user.organization_id} units={units} />
          </div>
        </section>
      ) : null}

      <DataTable
        title="Aircraft master data"
        subtitle="Manufacturer, model, status, release, and operating hours"
        rows={rows}
        columns={[
          { header: "Name", render: (row) => row.name },
          { header: "Identifier", render: (row) => row.identifier },
          { header: "Manufacturer", render: (row) => row.manufacturer },
          { header: "Model", render: (row) => row.model },
          { header: "Operating hours", render: (row) => row.hours },
          { header: "Maintenance", render: (row) => row.maintenance },
          { header: "Status", render: (row) => <StatusPill tone={aircraftStatusTone(row.status)}>{row.status}</StatusPill> },
          {
            header: "Release",
            render: (row) => <StatusPill tone={row.release === "Released" ? "success" : "danger"}>{row.release}</StatusPill>,
          },
        ]}
      />
    </AppShell>
  );
}
