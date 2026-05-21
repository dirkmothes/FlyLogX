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
      title="Zentrale Luftfahrzeugverwaltung"
      subtitle="Stammdaten, Einsatzstatus, Wartung und Freigaben für Drohnen und Luftfahrzeuge."
      breadcrumbs={["FlyLogX", "Module", "Luftfahrzeuge"]}
      userName={session.user.name}
      userRole={session.user.role}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Wartungslage</h2>
              <p>Zustand der aktiven Systeme</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>Einsatzbereit</h3>
              <p>{aircraft.filter((item) => item.status === "active").length} Systeme freigegeben</p>
            </div>
            <div className="mini-card">
              <h3>In Wartung</h3>
              <p>{aircraft.filter((item) => item.status === "maintenance").length} Systeme blockiert</p>
            </div>
            <div className="mini-card">
              <h3>Nächste Wartung</h3>
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
              <h2>Neues Luftfahrzeug anlegen</h2>
              <p>Stammdatenpflege für Admins</p>
            </div>
          </div>
          <div className="panel-body">
            <AircraftCreateForm organizationId={session.user.organization_id} units={units} />
          </div>
        </section>
      ) : null}

      <DataTable
        title="Luftfahrzeug-Stammdaten"
        subtitle="Hersteller, Modell, Status, Freigabe und Betriebsstunden"
        rows={rows}
        columns={[
          { header: "Bezeichnung", render: (row) => row.name },
          { header: "Kennung", render: (row) => row.identifier },
          { header: "Hersteller", render: (row) => row.manufacturer },
          { header: "Modell", render: (row) => row.model },
          { header: "Betriebsstunden", render: (row) => row.hours },
          { header: "Wartung", render: (row) => row.maintenance },
          { header: "Status", render: (row) => <StatusPill tone={aircraftStatusTone(row.status)}>{row.status}</StatusPill> },
          {
            header: "Freigabe",
            render: (row) => <StatusPill tone={row.release === "freigegeben" ? "success" : "danger"}>{row.release}</StatusPill>,
          },
        ]}
      />
    </AppShell>
  );
}
