import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
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

  let summary: ApiDashboardSummary | null = null;
  let dashboardError: string | null = null;

  try {
    const path =
      session.user.role === "pilot"
        ? `/api/dashboards/pilot/${session.user.id}`
        : session.user.role === "admin"
          ? "/api/dashboards/global"
          : `/api/dashboards/unit/${session.user.unit_id ?? session.user.organization_id}`;
    summary = await apiFetch<ApiDashboardSummary>(path, {
      headers: {
        ...getAuthHeader(session.token),
      },
    });
  } catch (error) {
    dashboardError = error instanceof Error ? error.message : "Dashboard data could not be loaded.";
  }

  if (!summary) {
    return (
      <AppShell title="Dashboard" breadcrumbs={["FlyLogX", "Dashboard"]} user={session.user}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Dashboard unavailable</h2>
              <p>We could not load the operational overview right now.</p>
            </div>
          </div>
          <div className="panel-body content-flow">
            <div className="form-note" style={{ borderColor: "rgba(162, 58, 58, 0.18)", background: "rgba(162, 58, 58, 0.06)" }}>
              <strong>Data request failed.</strong>
              <div>{dashboardError ?? "Please try again in a moment."}</div>
            </div>
            <div className="form-actions">
              <a className="button button-secondary" href="/dashboard">
                Retry
              </a>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  const cards = mapDashboard(summary);
  const recentRows = mapFlightRows(summary.recent_flights);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Operational overview of flight duration, review status, and logbook progress."
      breadcrumbs={["FlyLogX", "Dashboard"]}
      user={session.user}
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
