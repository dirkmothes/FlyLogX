import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { ExportActions } from "@/components/export-actions";
import { KpiCard } from "@/components/kpi-card";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, getAuthHeader, type DashboardSummary as ApiDashboardSummary } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { flightStatusTone, mapDashboard, mapFlightRows } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const summary = await apiFetch<ApiDashboardSummary>(
    session.user.role === "pilot"
      ? `/api/dashboards/pilot/${session.user.id}`
      : `/api/dashboards/unit/${session.user.unit_id ?? session.user.organization_id}`,
    {
      headers: {
        ...getAuthHeader(session.token),
      },
    },
  );

  const cards = mapDashboard(summary);
  const recentRows = mapFlightRows(summary.recent_flights);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Operativer Überblick über Flugzeiten, Prüfstatus und Nachweisheft-Fortschritt."
      breadcrumbs={["FlyLogX", "Dashboard"]}
      userName={session.user.name}
      userRole={session.user.role}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Freigabe-Pipeline</h2>
              <p>Status der aktuellen Prüfstrecke</p>
            </div>
          </div>
          <div className="panel-body workflow">
            <div className="workflow-step">
              <strong>1. Entwurf</strong>
              <span>Neue Flüge werden lokal erfasst und validiert.</span>
            </div>
            <div className="workflow-step">
              <strong>2. Eingereicht</strong>
              <span>Der Pilot übergibt den Eintrag an die Prüfstelle.</span>
            </div>
            <div className="workflow-step">
              <strong>3. Freigegeben</strong>
              <span>Nach Prüfung wird der Datensatz gesperrt und protokolliert.</span>
            </div>
          </div>
        </section>
      }
    >
      <div className="grid-4">
        {cards.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
        ))}
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Flugartenverteilung</h2>
              <p>Gesamtstunden nach Flugkategorie</p>
            </div>
          </div>
          <div className="panel-body bar-list">
            {Object.entries(summary.by_category).map(([label, value]) => (
              <div className="bar-row" key={label}>
                <div className="bar-row-head">
                  <strong>{label}</strong>
                  <span>{value.toFixed(1)} h</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, value * 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Monatsverlauf</h2>
              <p>Fortschreibung der Flugstunden</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-grid">
              {Object.entries(summary.by_month).map(([month, value]) => (
                <div className="chart-column" key={month}>
                  <div className="meter" style={{ height: `${80 + value * 18}px` }} />
                  <strong>{value.toFixed(1)} h</strong>
                  <span>{month}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Export & Nachweis</h2>
            <p>CSV-Export der sichtbaren Flugdaten für Weiterverarbeitung und Archivierung</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="grid-2">
            <ExportActions format="csv" />
            <ExportActions format="pdf" />
          </div>
        </div>
      </section>

      <DataTable
        title="Letzte Flüge"
        subtitle="Aktuelle Einträge im digitalen Nachweisheft"
        rows={recentRows}
        columns={[
          { header: "Datum", render: (row) => row.date },
          { header: "Flugnummer", render: (row) => row.id },
          { header: "Pilot", render: (row) => row.pilot },
          { header: "Drohne", render: (row) => row.aircraft },
          { header: "Kategorie", render: (row) => row.category },
          { header: "Dauer", render: (row) => row.duration },
          { header: "Status", render: (row) => <StatusPill tone={flightStatusTone(row.status)}>{row.status}</StatusPill> },
          { header: "Ort", render: (row) => row.location },
        ]}
      />
    </AppShell>
  );
}
