import { AppShell } from "@/components/app-shell";
import { AircraftManagement } from "@/components/aircraft-management";
import { apiFetch, getAuthHeader, type ApiAircraft, type ApiOrganization, type ApiUnit } from "@/lib/api";
import { loadSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AircraftPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const [aircraft, units, organizations] = await Promise.all([
    apiFetch<ApiAircraft[]>("/api/aircraft", {
      headers: {
        ...getAuthHeader(session.token),
      },
    }),
    session.user.role === "admin" || session.user.role === "supervisor"
      ? apiFetch<ApiUnit[]>("/api/units", {
          headers: {
            ...getAuthHeader(session.token),
          },
        })
      : Promise.resolve([] as ApiUnit[]),
    session.user.role === "admin" || session.user.role === "supervisor"
      ? apiFetch<ApiOrganization[]>("/api/organizations", {
          headers: {
            ...getAuthHeader(session.token),
          },
        })
      : Promise.resolve([] as ApiOrganization[]),
  ]);

  return (
    <AppShell
      title="Central aircraft management"
      breadcrumbs={["FlyLogX", "Module", "Aircraft"]}
      user={session.user}
    >
      <AircraftManagement
        viewerRole={session.user.role}
        organizationId={session.user.organization_id}
        units={session.user.role === "admin" ? units : units.filter((item) => item.organization_id === session.user.organization_id)}
        organizations={session.user.role === "admin" ? organizations : organizations.filter((item) => item.id === session.user.organization_id)}
        aircraft={aircraft}
      />
    </AppShell>
  );
}
