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
      title="Flugbuch & Nachweisheft"
      subtitle="Tabellarische Sicht im Stil eines klassischen Flugzeitennachweishefts."
      breadcrumbs={["FlyLogX", "Module", "Flüge"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Filter</h2>
              <p>Suche und Sortierung</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="filters-row">
              <span className="filter-chip">Zeitraum</span>
              <span className="filter-chip">Pilot</span>
              <span className="filter-chip">Drohne</span>
              <span className="filter-chip">Status</span>
              <span className="filter-chip">Flugart</span>
              <span className="filter-chip">Dienststelle</span>
            </div>
            <div className="mini-card">
              <h3>Prüfregeln</h3>
              <p>Geprüfte Einträge sind gesperrt und nur über Änderungsanträge anpassbar.</p>
            </div>
            <div className="mini-card">
              <h3>Export</h3>
              <p>PDF-, CSV- und Excel-Ausgabe werden für offizielle Nachweise vorbereitet.</p>
            </div>
          </div>
        </section>
      }
    >
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Neuen Entwurf anlegen</h2>
            <p>Digitale Erfassung mit automatischer Nachweisheft-Fortschreibung</p>
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
            <h2>Statusübersicht</h2>
            <p>Workflow für Entwurf, Einreichung, Prüfung und Freigabe</p>
          </div>
        </div>
        <div className="panel-body grid-4">
          <div className="mini-card">
            <h3>Entwürfe</h3>
            <p>{rows.filter((row) => row.status === "Entwurf").length} offene Erfassungen</p>
          </div>
          <div className="mini-card">
            <h3>Eingereicht</h3>
            <p>{rows.filter((row) => row.status === "Eingereicht").length} Einträge warten auf Prüfung</p>
          </div>
          <div className="mini-card">
            <h3>Freigegeben</h3>
            <p>{rows.filter((row) => row.status === "Freigegeben").length} revisionssichere Einträge</p>
          </div>
          <div className="mini-card">
            <h3>Abgelehnt</h3>
            <p>{rows.filter((row) => row.status === "Abgelehnt").length} Einträge mit Kommentar</p>
          </div>
        </div>
      </section>

      <DataTable
        title="Digitale Flugnachweise"
        subtitle="Ansicht in Tabellenform mit Status und Einsatzdaten"
        rows={rows}
        columns={[
          { header: "Datum", render: (row) => row.date },
          { header: "Zeit", render: (row) => row.time },
          { header: "Pilot", render: (row) => row.pilot },
          { header: "Drohne", render: (row) => row.aircraft },
          { header: "Kategorie", render: (row) => row.category },
          { header: "Einsatzart", render: (row) => row.type },
          { header: "Tag", render: (row) => row.day },
          { header: "Nacht", render: (row) => row.night },
          { header: "Status", render: (row) => <StatusPill tone={flightStatusTone(row.status)}>{row.status}</StatusPill> },
        ]}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Luftfahrzeugübersicht</h2>
            <p>Aktive Systeme in der zentralen Verwaltung</p>
          </div>
        </div>
        <div className="panel-body section-stack">
          {aircraft.map((item) => (
            <div className="workflow-step" key={item.id}>
              <div className="bar-row-head">
                <strong>
                  {item.identifier} · {item.name}
                </strong>
                <StatusPill tone={item.release_status ? "success" : "warning"}>
                  {aircraftStatusLabel(item.status)}
                </StatusPill>
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
