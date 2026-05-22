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
      subtitle="Operational overview of flight times, review status, and logbook progress."
      breadcrumbs={["FlyLogX", "Dashboard"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Approval pipeline</h2>
              <p>Status of the current approval flow</p>
            </div>
          </div>
          <div className="panel-body workflow">
            <div className="workflow-step">
              <strong>1. Draft</strong>
              <span>New flights are created and validated locally.</span>
            </div>
            <div className="workflow-step">
              <strong>2. Submitted</strong>
              <span>The pilot submits the entry for review.</span>
            </div>
            <div className="workflow-step">
              <strong>3. Approved</strong>
              <span>After review, the record is locked and logged.</span>
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
              <h2>Flight category distribution</h2>
              <p>Total hours by flight category</p>
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
              <h2>Monthly trend</h2>
              <p>Flight hour progression</p>
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
              <h2>Export & records</h2>
              <p>Export the visible flight data as CSV or PDF for further processing and archiving.</p>
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
        title="Recent flights"
        subtitle="Current entries in the digital logbook"
        rows={recentRows}
        columns={[
          { header: "Date", render: (row) => row.date },
          { header: "Flight no.", render: (row) => row.id },
          { header: "Pilot", render: (row) => row.pilot },
          { header: "Aircraft", render: (row) => row.aircraft },
          { header: "Category", render: (row) => row.category },
          { header: "Duration", render: (row) => row.duration },
          { header: "Status", render: (row) => <StatusPill tone={flightStatusTone(row.status)}>{row.status}</StatusPill> },
          { header: "Location", render: (row) => row.location },
        ]}
      />
    </AppShell>
  );
}
