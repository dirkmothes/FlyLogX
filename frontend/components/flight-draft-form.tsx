"use client";

import { useState, type FormEvent } from "react";

import { API_BASE_URL, type ApiAircraft, type FlightCategory } from "@/lib/api";

type Props = {
  organizationId: string;
  unitId: string;
  pilotId: string;
  aircraft: ApiAircraft[];
};

const categories: FlightCategory[] = ["Ü-Flüge", "S-Flüge", "E-H-Flüge", "T-Flüge", "A-Flüge"];

export function FlightDraftForm({ organizationId, unitId, pilotId, aircraft }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    aircraft_id: aircraft[0]?.id ?? "",
    category: "Ü-Flüge" as FlightCategory,
    flight_type: "Aufklärungsflug",
    date: new Date().toISOString().slice(0, 10),
    start_time: "08:00",
    landing_time: "08:45",
    duration_minutes: 45,
    location: "Übungsraum Nord",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const aircraftItem = aircraft.find((item) => item.id === form.aircraft_id);
    if (!aircraftItem) {
      setMessage("Bitte ein Luftfahrzeug auswählen.");
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
        throw new Error(payload?.detail || "Eintrag konnte nicht erstellt werden");
      }

      setMessage("Draft gespeichert und in der Nachweisheft-Ansicht sichtbar.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Eintrag konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="section-stack" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>Luftfahrzeug</span>
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
          <span>Flugart</span>
          <input
            className="input"
            value={form.flight_type}
            onChange={(event) => setForm((current) => ({ ...current, flight_type: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Datum</span>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Kategorie</span>
          <select
            className="input"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as FlightCategory }))}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
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
          <span>Landung</span>
          <input
            className="input"
            type="time"
            value={form.landing_time}
            onChange={(event) => setForm((current) => ({ ...current, landing_time: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Flugdauer (Min)</span>
          <input
            className="input"
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(event) => setForm((current) => ({ ...current, duration_minutes: Number(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Einsatzort</span>
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
          {loading ? "Speichern..." : "Entwurf anlegen"}
        </button>
      </div>
    </form>
  );
}
