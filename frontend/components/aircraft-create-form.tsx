"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL, type ApiUnit, type AircraftStatus } from "@/lib/api";

type Props = {
  organizationId: string;
  units: ApiUnit[];
  onSuccess?: () => void;
};

const statuses: AircraftStatus[] = ["active", "maintenance", "retired"];

function normalizeIdentifier(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

export function AircraftCreateForm({ organizationId, units, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    owner_unit_id: "",
    name: "",
    identifier: "",
    manufacturer: "",
    model: "",
    status: "active" as AircraftStatus,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setMessage("Please enter a name.");
      return;
    }
    if (!form.identifier.trim()) {
      setMessage("Please enter an identifier.");
      return;
    }
    if (!form.manufacturer.trim()) {
      setMessage("Please enter a manufacturer.");
      return;
    }
    if (!form.model.trim()) {
      setMessage("Please enter a model.");
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const identifier = form.identifier.trim();
      const normalizedIdentifier = normalizeIdentifier(identifier);
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/aircraft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organization_id: organizationId,
          owner_unit_id: form.owner_unit_id || null,
          name: form.name.trim(),
          identifier,
          manufacturer: form.manufacturer.trim(),
          model: form.model.trim(),
          serial_number: `${normalizedIdentifier || "AIRCRAFT"}-SN`,
          category: "UAS",
          aircraft_type: "Multirotor",
          uas_class: "C2",
          weight_kg: 1,
          use_case: "General use",
          registration_number: null,
          internal_identifier: `${normalizedIdentifier || "AIRCRAFT"}-INT`,
          battery_type: null,
          battery_count: 0,
          energy_source: "Battery",
          payload: null,
          max_duration_minutes: null,
          operating_hours: 0,
          availability: "available",
          status: form.status,
          notes: null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Could not create the aircraft.");
      }

      setMessage("Aircraft created.");
      onSuccess?.();
      router.refresh();
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
            <option value="">Select unit (optional)</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Name</span>
          <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter aircraft name" />
        </label>
        <label className="field">
          <span>Identifier</span>
          <input className="input" value={form.identifier} onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="Enter identifier" />
        </label>
        <label className="field">
          <span>Manufacturer</span>
          <input className="input" value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} placeholder="Enter manufacturer" />
        </label>
        <label className="field">
          <span>Model</span>
          <input className="input" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="Enter model" />
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
