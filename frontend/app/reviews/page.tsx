import { AppShell } from "@/components/app-shell";
import { ReviewQueue } from "@/components/review-queue";
import { StatusPill } from "@/components/status-pill";
import { apiFetch, getAuthHeader, type ApiFlight } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { flightStatusTone } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await loadSession();
  if (!session) {
    return null;
  }

  const flights = await apiFetch<ApiFlight[]>("/api/flights?status_filter=submitted", {
    headers: {
      ...getAuthHeader(session.token),
    },
  });

  return (
    <AppShell
      title="Review and approval process"
      subtitle="Entries are reviewed, approved, or rejected with a traceable audit trail."
      breadcrumbs={["FlyLogX", "Module", "Review"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Review rules</h2>
              <p>Workflow rules</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>No silent changes</h3>
              <p>Reviewed entries cannot be changed without a change request.</p>
            </div>
            <div className="mini-card">
              <h3>Logging</h3>
              <p>Every approval creates a traceable audit entry.</p>
            </div>
          </div>
        </section>
      }
    >
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Review queue</h2>
            <p>Open entries for supervisors and flight controllers.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="mini-card">
            <h3>{flights.length} entries waiting</h3>
            <p>Review can be performed directly in the system.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Approval action</h2>
            <p>Comments and digital confirmation are stored in the audit trail.</p>
          </div>
        </div>
        <div className="panel-body">
          <ReviewQueue flights={flights} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Change requests</h2>
            <p>Corrections and follow-up requests that were not approved.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="mini-card">
            <h3>No separate change requests yet</h3>
            <p>
              The change window is prepared and can be connected to the status chain{" "}
              <StatusPill tone={flightStatusTone("submitted")}>Submitted</StatusPill>.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
