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
    aircraft_id: aircraft[0]?.id ?? "",
    category: "U Flights" as FlightCategory,
    flight_type: "Reconnaissance Flight",
    date: new Date().toISOString().slice(0, 10),
    start_time: "08:00",
    landing_time: "08:45",
    duration_minutes: 45,
    location: "Training Area North",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const aircraftItem = aircraft.find((item) => item.id === form.aircraft_id);
    if (!aircraftItem) {
      setMessage("Please select an aircraft.");
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
          category: form.category,
          flight_type: form.flight_type,
          date: form.date,
          start_time: `${form.start_time}:00`,
          landing_time: `${form.landing_time}:00`,
          flight_count: 1,
          duration_minutes: form.duration_minutes,
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
            {aircraft.map((item) => (
              <option key={item.id} value={item.id}>
                {item.identifier} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Flight type</span>
          <input
            className="input"
            value={form.flight_type}
            onChange={(event) => setForm((current) => ({ ...current, flight_type: event.target.value }))}
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
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FlightCategory }))}
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Start</span>
          <input
            className="input"
            type="time"
            value={form.start_time}
            onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Landing</span>
          <input
            className="input"
            type="time"
            value={form.landing_time}
            onChange={(event) => setForm((current) => ({ ...current, landing_time: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Flight duration (min)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(event) => setForm((current) => ({ ...current, duration_minutes: Number(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Location</span>
          <input
            className="input"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
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
