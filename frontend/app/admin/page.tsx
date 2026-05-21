import { AppShell } from "@/components/app-shell";
import { AdminManagement } from "@/components/admin-management";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, getAuthHeader, type ApiOrganization, type ApiUnit, type ApiUser } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { flightStatusTone } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const [users, units, organizations] = await Promise.all([
    apiFetch<ApiUser[]>("/api/users", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
    apiFetch<ApiUnit[]>("/api/units", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
    apiFetch<ApiOrganization[]>("/api/organizations", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
  ]);

  return (
    <AppShell
      title="Administration"
      subtitle="Nutzer, Rollen, Einheiten, Stammdaten und Systemkonfiguration."
      breadcrumbs={["FlyLogX", "Module", "Administration"]}
      userName={session.user.name}
      userRole={session.user.role}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Systemstatus</h2>
              <p>Technische Kontrolle</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>API</h3>
              <div>
                <StatusPill tone="success">Online</StatusPill>
              </div>
            </div>
            <div className="mini-card">
              <h3>Datenbank</h3>
              <div>
                <StatusPill tone={flightStatusTone("approved")}>Produktiv</StatusPill>
              </div>
            </div>
            <div className="mini-card">
              <h3>Rollenlogik</h3>
              <p>Admin: Pflege aller Stammdaten, Supervisor: Leserechte, Pilot: eigene Daten.</p>
            </div>
          </div>
        </section>
      }
    >
      <AdminManagement organizations={organizations} units={units} users={users} />
    </AppShell>
  );
}
