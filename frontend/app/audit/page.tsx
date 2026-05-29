import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch, getAuthHeader, type ApiAuditEvent } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { mapAuditRows } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const audit = await apiFetch<ApiAuditEvent[]>("/api/audit", {
    headers: {
      ...getAuthHeader(session.token),
    },
  });

  const rows = mapAuditRows(audit);

  return (
    <AppShell
      title="Audit log"
      subtitle="Complete traceability of all security-relevant actions."
      breadcrumbs={["FlyLogX", "Module", "Audit"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Audit quality</h2>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>Immutable log</h3>
              <p>Entries are not overwritten but versioned.</p>
            </div>
            <div className="mini-card">
              <h3>Soft delete</h3>
              <p>Deleted data remains traceable internally.</p>
            </div>
          </div>
        </section>
      }
    >
      <DataTable
        title="Change history"
        subtitle="Who changed what on which object and when"
        rows={rows}
        columns={[
          { header: "Time", render: (row) => row.time },
          { header: "Actor", render: (row) => row.actor },
          { header: "Action", render: (row) => row.action },
          { header: "Object", render: (row) => row.entity },
          { header: "Detail", render: (row) => row.detail },
        ]}
      />
    </AppShell>
  );
}
