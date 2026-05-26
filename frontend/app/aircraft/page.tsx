import { AppShell } from "@/components/app-shell";
import { AircraftManagement } from "@/components/aircraft-management";
import { apiFetch, getAuthHeader, type ApiAircraft, type ApiUnit } from "@/lib/api";
import { loadSession } from "@/lib/session";

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

  return (
    <AppShell
      title="Central aircraft management"
      breadcrumbs={["FlyLogX", "Module", "Aircraft"]}
      user={session.user}
    >
      <AircraftManagement
        viewerRole={session.user.role}
        organizationId={session.user.organization_id}
        units={units}
        aircraft={aircraft}
      />
    </AppShell>
  );
}
