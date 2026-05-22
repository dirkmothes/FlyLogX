"use client";

import { useState, type FormEvent } from "react";

import { API_BASE_URL, type ApiUnit, type AircraftStatus } from "@/lib/api";

type Props = {
  organizationId: string;
  units: ApiUnit[];
};

const statuses: AircraftStatus[] = ["active", "maintenance", "retired"];

export function AircraftCreateForm({ organizationId, units }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    owner_unit_id: units[0]?.id ?? "",
    name: "New drone",
    identifier: "FLX-NEW",
    manufacturer: "FlyLogX Systems",
    model: "R-01",
    serial_number: "SN-NEW",
    category: "UAS",
    aircraft_type: "Multirotor",
    uas_class: "C2",
    weight_kg: 4.8,
    use_case: "Reconnaissance",
    registration_number: "",
    internal_identifier: "INT-NEW",
    battery_type: "Li-ion",
    battery_count: 2,
    energy_source: "Battery",
    payload: "Standard camera",
    max_duration_minutes: 35,
    operating_hours: 0,
    maintenance_status: "ok",
    release_status: true,
    availability: "available",
    status: "active" as AircraftStatus,
    notes: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/aircraft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organization_id: organizationId,
          ...form,
          owner_unit_id: form.owner_unit_id || null,
          registration_number: form.registration_number || null,
          notes: form.notes || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not create the aircraft.");
      }

      setMessage("Aircraft created.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the aircraft.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="section-stack" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>Unit</span>
          <select
            className="input"
            value={form.owner_unit_id}
            onChange={(event) => setForm((current) => ({ ...current, owner_unit_id: event.target.value }))}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Name</span>
          <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field">
          <span>Identifier</span>
          <input className="input" value={form.identifier} onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))} />
        </label>
        <label className="field">
          <span>Manufacturer</span>
          <input className="input" value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} />
        </label>
        <label className="field">
          <span>Model</span>
          <input className="input" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="input"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AircraftStatus }))}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? <div className="form-note">{message}</div> : null}
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create aircraft"}
        </button>
      </div>
    </form>
  );
}
