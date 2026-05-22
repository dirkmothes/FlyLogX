import { AppShell } from "@/components/app-shell";
import { AdminManagement } from "@/components/admin-management";
import { apiFetch, getAuthHeader, type ApiOrganization, type ApiUnit, type ApiUser } from "@/lib/api";
import { loadSession } from "@/lib/session";

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
      user={session.user}
    >
      <AdminManagement organizations={organizations} units={units} users={users} />
    </AppShell>
  );
}
