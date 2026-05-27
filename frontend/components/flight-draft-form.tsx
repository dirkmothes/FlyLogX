"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL, type ApiAircraft, type ApiFlight, type FlightCategory } from "@/lib/api";

type Props = {
  organizationId: string;
  unitId: string;
  pilotId: string;
  aircraft: ApiAircraft[];
  mode?: "create" | "edit";
  flight?: ApiFlight | null;
  onSuccess?: () => void;
};

const categories: Array<{ value: FlightCategory; label: string }> = [
  { value: "U Flights", label: "U Flights" },
  { value: "S Flights", label: "S Flights" },
  { value: "E-H Flights", label: "E-H Flights" },
  { value: "T Flights", label: "T Flights" },
  { value: "A Flights", label: "A Flights" },
];

type FormState = {
  aircraft_id: string;
  category: FlightCategory | "";
  flight_type: string;
  date: string;
  duration_minutes: string;
  location: string;
  period: "day" | "night";
};

function buildFormState(flight?: ApiFlight | null): FormState {
  return {
    aircraft_id: flight?.aircraft_id ?? "",
    category: flight?.category ?? "",
    flight_type: flight?.flight_type ?? "",
    date: flight?.date ?? "",
    duration_minutes: flight ? String(flight.duration_minutes) : "",
    location: flight?.location ?? "",
    period: flight?.night_flight ? "night" : "day",
  };
}

export function FlightDraftForm({ organizationId, unitId, pilotId, aircraft, mode = "create", flight = null, onSuccess }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildFormState(flight));

  useEffect(() => {
    setForm(buildFormState(flight));
    setMessage(null);
  }, [flight]);

  const isEdit = mode === "edit";
  const currentOrganizationId = flight?.organization_id ?? organizationId;
  const currentUnitId = flight?.unit_id ?? unitId;
  const currentPilotId = flight?.pilot_id ?? pilotId;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const aircraftItem = aircraft.find((item) => item.id === form.aircraft_id);
    if (!aircraftItem) {
      setMessage("Please select an aircraft.");
      return;
    }
    if (!form.category) {
      setMessage("Please select a category.");
      return;
    }
    if (!form.flight_type.trim()) {
      setMessage("Please enter a flight type / task / description.");
      return;
    }
    if (!form.date) {
      setMessage("Please select a date.");
      return;
    }
    const durationMinutes = Number(form.duration_minutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      setMessage("Please enter a valid duration.");
      return;
    }
    if (!form.location.trim()) {
      setMessage("Please enter a location.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${isEdit && flight ? `/api/flights/${flight.id}` : "/api/flights"}`, {
        method: isEdit && flight ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organization_id: currentOrganizationId,
          unit_id: currentUnitId,
          pilot_id: currentPilotId,
          aircraft_id: aircraftItem.id,
          aircraft_identifier: aircraftItem.identifier,
          category: form.category as FlightCategory,
          flight_type: form.flight_type,
          date: form.date,
          flight_count: 1,
          duration_minutes: durationMinutes,
          day_flight: form.period === "day",
          night_flight: form.period === "night",
          location: form.location,
          coordinates: flight?.coordinates ?? null,
          special_notes: flight?.special_notes ?? null,
          remarks: flight?.remarks ?? null,
          flight_supervisor_name: flight?.flight_supervisor_name ?? null,
          flight_supervisor_id: flight?.flight_supervisor_id ?? null,
          flight_supervisor_signature: flight?.flight_supervisor_signature ?? null,
          previous_flights: flight?.previous_flights ?? 0,
          previous_hours: flight?.previous_hours ?? 0,
          monthly_carryover: flight?.monthly_carryover ?? 0,
          yearly_carryover: flight?.yearly_carryover ?? 0,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || (isEdit ? "Could not update the entry." : "Could not create the entry."));
      }

      setMessage(isEdit ? "Draft updated." : "Draft saved and shown in the logbook.");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : isEdit ? "Could not update the entry." : "Could not create the entry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="section-stack" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>Aircraft</span>
          <select
            className="input"
            value={form.aircraft_id}
            onChange={(event) => setForm((current) => ({ ...current, aircraft_id: event.target.value }))}
          >
            <option value="" disabled>
              Select aircraft
            </option>
            {aircraft.map((item) => (
              <option key={item.id} value={item.id}>
                {item.identifier} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>FLIGHT TYP / TASK / Description</span>
          <input
            className="input"
            value={form.flight_type}
            onChange={(event) => setForm((current) => ({ ...current, flight_type: event.target.value }))}
            placeholder="Enter flight type / task / description"
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            className="input"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FlightCategory | "" }))}
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Flight duration (min)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(event) => setForm((current) => ({ ...current, duration_minutes: event.target.value }))}
            placeholder="Enter duration in minutes"
          />
        </label>
        <div className="field admin-state-group">
          <span className="admin-state-label">Day / Night</span>
          <div className="admin-state-toggle" role="group" aria-label="Flight period">
            <button
              type="button"
              className={`admin-state-option ${form.period === "day" ? "admin-state-option-active" : ""}`}
              onClick={() => setForm((current) => ({ ...current, period: "day" }))}
            >
              Day
            </button>
            <button
              type="button"
              className={`admin-state-option ${form.period === "night" ? "admin-state-option-active" : ""}`}
              onClick={() => setForm((current) => ({ ...current, period: "night" }))}
            >
              Night
            </button>
          </div>
        </div>
        <label className="field">
          <span>Location</span>
          <input
            className="input"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder="Enter location"
          />
        </label>
      </div>
      {message ? <div className="form-note">{message}</div> : null}
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={loading || aircraft.length === 0}>
          {loading ? "Saving..." : isEdit ? "Save draft" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
