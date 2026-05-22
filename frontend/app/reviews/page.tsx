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
      title="Prüf- und Freigabeprozess"
      subtitle="Einträge werden nachvollziehbar geprüft, bestätigt oder abgelehnt."
      breadcrumbs={["FlyLogX", "Module", "Prüfung"]}
      user={session.user}
      aside={
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Prüfregeln</h2>
              <p>Workflow-Schutz</p>
            </div>
          </div>
          <div className="panel-body section-stack">
            <div className="mini-card">
              <h3>Keine stille Änderung</h3>
              <p>Geprüfte Einträge werden nicht ohne Änderungsantrag verändert.</p>
            </div>
            <div className="mini-card">
              <h3>Protokollierung</h3>
              <p>Jede Freigabe erzeugt einen nachvollziehbaren Audit-Eintrag.</p>
            </div>
          </div>
        </section>
      }
    >
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Prüfwarteschlange</h2>
            <p>Offene Einträge für Vorgesetzte und Flugaufsichtsleiter</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="mini-card">
            <h3>{flights.length} Einträge wartend</h3>
            <p>Die Prüfung kann direkt im System durchgeführt werden.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Freigabeaktion</h2>
            <p>Kommentar und digitale Bestätigung werden nachvollziehbar gespeichert</p>
          </div>
        </div>
        <div className="panel-body">
          <ReviewQueue flights={flights} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Änderungsanträge</h2>
            <p>Nicht genehmigte Korrekturen und Nachforderungen</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="mini-card">
            <h3>Aktuell keine separaten Änderungsanträge</h3>
            <p>
              Das Änderungsfenster ist vorbereitet und kann an die Statuskette {<StatusPill tone={flightStatusTone("submitted")}>Eingereicht</StatusPill>} angebunden werden.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
