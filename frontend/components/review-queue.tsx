"use client";

import { useState } from "react";

import { API_BASE_URL, type ApiFlight } from "@/lib/api";

type Props = {
  flights: ApiFlight[];
};

export function ReviewQueue({ flights }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function reviewFlight(flightId: string, decision: "approve" | "reject") {
    setBusyId(flightId);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/flights/${flightId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          decision,
          comment: comments[flightId] || null,
          signature: "digital-signature",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Review failed");
      }

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="section-stack">
      {message ? <div className="form-note">{message}</div> : null}
      {flights.map((flight) => (
        <div key={flight.id} className="workflow-step">
          <div className="bar-row-head">
            <strong>
              {flight.flight_number || flight.id} · {flight.flight_type}
            </strong>
            <span>{flight.status}</span>
          </div>
          <span>
            {flight.date} · {flight.duration_minutes} min · {flight.pilot_name || flight.pilot_id} · {flight.aircraft_name || flight.aircraft_identifier} · {flight.location}
          </span>
          <label className="field">
            <span>Comment</span>
            <textarea
              className="textarea"
              value={comments[flight.id] ?? ""}
              onChange={(event) => setComments((current) => ({ ...current, [flight.id]: event.target.value }))}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => reviewFlight(flight.id, "reject")}
              disabled={busyId === flight.id}
            >
              Reject
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => reviewFlight(flight.id, "approve")}
              disabled={busyId === flight.id}
            >
              {busyId === flight.id ? "Reviewing..." : "Approve"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
