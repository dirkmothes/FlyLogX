import { AppShell } from "@/components/app-shell";
import { AircraftCreateDialog } from "@/components/aircraft-create-dialog";
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
      title="Central aircraft management"
      breadcrumbs={["FlyLogX", "Module", "Aircraft"]}
      user={session.user}
    >
      {session.user.role === "admin" ? (
        <AircraftCreateDialog organizationId={session.user.organization_id} units={units} />
      ) : null}

      <DataTable
        title="Aircraft master data"
        rows={rows}
        columns={[
          { header: "Name", render: (row) => row.name },
          { header: "Identifier", render: (row) => row.identifier },
          { header: "Manufacturer", render: (row) => row.manufacturer },
          { header: "Model", render: (row) => row.model },
          { header: "Operating hours", render: (row) => row.hours },
          { header: "Last maintenance", render: (row) => row.lastMaintenance },
          { header: "Next maintenance", render: (row) => row.nextMaintenance },
          { header: "Status", render: (row) => <StatusPill tone={aircraftStatusTone(row.status)}>{row.status}</StatusPill> },
        ]}
      />
    </AppShell>
  );
}
