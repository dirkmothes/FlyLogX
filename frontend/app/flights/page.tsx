import { AppShell } from "@/components/app-shell";
import { FlightManagement } from "@/components/flight-management";
import { apiFetch, getAuthHeader, type ApiAircraft, type ApiFlight } from "@/lib/api";
import { loadSession } from "@/lib/session";

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

  return (
    <AppShell
      title="Flight logbook and records"
      breadcrumbs={["FlyLogX", "Module", "Flights"]}
      user={session.user}
    >
      <FlightManagement
        viewerRole={session.user.role}
        currentUserId={session.user.id}
        organizationId={session.user.organization_id}
        unitId={session.user.unit_id}
        aircraft={session.user.role === "admin" ? aircraft : aircraft.filter((item) => item.organization_id === session.user.organization_id)}
        flights={flights}
      />
    </AppShell>
  );
}
