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
      title="Audit-Log"
      subtitle="Lückenlose Nachvollziehbarkeit aller sicherheitsrelevanten Vorgänge."
      breadcrumbs={["FlyLogX", "Module", "Audit"]}
      userName={session.user.name}
      userRole={session.user.role}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Revisionssicherheit</h2>
              <p>Audit-Qualität</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>Immutable Log</h3>
              <p>Einträge werden nicht überschrieben, sondern versioniert ergänzt.</p>
            </div>
            <div className="mini-card">
              <h3>Soft-Delete</h3>
              <p>Gelöschte Daten bleiben intern nachvollziehbar erhalten.</p>
            </div>
          </div>
        </section>
      }
    >
      <DataTable
        title="Änderungsverlauf"
        subtitle="Wer hat wann was an welchem Objekt geändert"
        rows={rows}
        columns={[
          { header: "Zeit", render: (row) => row.time },
          { header: "Akteur", render: (row) => row.actor },
          { header: "Aktion", render: (row) => row.action },
          { header: "Objekt", render: (row) => row.entity },
          { header: "Detail", render: (row) => row.detail },
        ]}
      />
    </AppShell>
  );
}
