"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL, type ApiAircraft, type FlightCategory } from "@/lib/api";

type Props = {
  organizationId: string;
  unitId: string;
  pilotId: string;
  aircraft: ApiAircraft[];
  onSuccess?: () => void;
};

const categories: Array<{ value: FlightCategory; label: string }> = [
  { value: "U Flights", label: "U Flights" },
  { value: "S Flights", label: "S Flights" },
  { value: "E-H Flights", label: "E-H Flights" },
  { value: "T Flights", label: "T Flights" },
  { value: "A Flights", label: "A Flights" },
];

export function FlightDraftForm({ organizationId, unitId, pilotId, aircraft, onSuccess }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    aircraft_id: "",
    category: "" as FlightCategory | "",
    flight_type: "",
    date: "",
    duration_minutes: "",
    location: "",
  });

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
      setMessage("Please enter a flight type / task.");
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
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/flights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organization_id: organizationId,
          unit_id: unitId,
          pilot_id: pilotId,
          aircraft_id: aircraftItem.id,
          aircraft_identifier: aircraftItem.identifier,
          category: form.category as FlightCategory,
          flight_type: form.flight_type,
          date: form.date,
          flight_count: 1,
          duration_minutes: durationMinutes,
          day_flight: true,
          night_flight: false,
          location: form.location,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not create the entry.");
      }

      setMessage("Draft saved and shown in the logbook.");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the entry.");
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
          <span>FLIGHT TYP / TASK</span>
          <input
            className="input"
            value={form.flight_type}
            onChange={(event) => setForm((current) => ({ ...current, flight_type: event.target.value }))}
            placeholder="Enter flight type / task"
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
          {loading ? "Saving..." : "Create draft"}
        </button>
      </div>
    </form>
  );
}
