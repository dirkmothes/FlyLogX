"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { DropdownSelect } from "@/components/dropdown-select";
import type { ApiAircraft, ApiUnit, AircraftStatus } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  organizationId: string;
  units: ApiUnit[];
  mode?: "create" | "edit";
  aircraft?: ApiAircraft | null;
  onSuccess?: () => void;
};

type FormState = {
  owner_unit_id: string;
  name: string;
  identifier: string;
  manufacturer: string;
  model: string;
  status: AircraftStatus;
};

const statuses: AircraftStatus[] = ["active", "maintenance", "retired"];

function normalizeIdentifier(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildFormState(aircraft?: ApiAircraft | null): FormState {
  return {
    owner_unit_id: aircraft?.owner_unit_id ?? "",
    name: aircraft?.name ?? "",
    identifier: aircraft?.identifier ?? "",
    manufacturer: aircraft?.manufacturer ?? "",
    model: aircraft?.model ?? "",
    status: aircraft?.status ?? "active",
  };
}

export function AircraftCreateForm({ organizationId, units, mode = "create", aircraft = null, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => buildFormState(aircraft));

  useEffect(() => {
    setForm(buildFormState(aircraft));
    setMessage(null);
  }, [aircraft]);

  const isEdit = mode === "edit";
  const submitLabel = isEdit ? "Save aircraft" : "Create aircraft";

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
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}${isEdit && aircraft ? `/api/aircraft/${aircraft.id}` : "/api/aircraft"}`,
        {
          method: isEdit ? "PUT" : "POST",
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
            serial_number: aircraft?.serial_number ?? `${normalizedIdentifier || "AIRCRAFT"}-SN`,
            category: aircraft?.category ?? "UAS",
            aircraft_type: aircraft?.aircraft_type ?? "Multirotor",
            uas_class: aircraft?.uas_class ?? "C2",
            weight_kg: aircraft?.weight_kg ?? 1,
            use_case: aircraft?.use_case ?? "General use",
            registration_number: aircraft?.registration_number ?? null,
            internal_identifier: aircraft?.internal_identifier ?? `${normalizedIdentifier || "AIRCRAFT"}-INT`,
            battery_type: aircraft?.battery_type ?? null,
            battery_count: aircraft?.battery_count ?? 0,
            energy_source: aircraft?.energy_source ?? "Battery",
            payload: aircraft?.payload ?? null,
            max_duration_minutes: aircraft?.max_duration_minutes ?? null,
            operating_hours: aircraft?.operating_hours ?? 0,
            availability: aircraft?.availability ?? "available",
            status: form.status,
            notes: aircraft?.notes ?? null,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || `Could not ${isEdit ? "update" : "create"} the aircraft.`);
      }

      setMessage(isEdit ? "Aircraft updated." : "Aircraft created.");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not ${isEdit ? "update" : "create"} the aircraft.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="section-stack" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>Unit</span>
          <DropdownSelect
            value={form.owner_unit_id}
            placeholder="Select unit (optional)"
            options={[{ value: "", label: "Select unit (optional)" }, ...units.map((unit) => ({ value: unit.id, label: unit.name }))]}
            onChange={(value) => setForm((current) => ({ ...current, owner_unit_id: value }))}
          />
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
          <DropdownSelect
            value={form.status}
            placeholder="Select status"
            options={statuses.map((status) => ({ value: status, label: status }))}
            onChange={(value) => setForm((current) => ({ ...current, status: value as AircraftStatus }))}
          />
        </label>
      </div>
      {message ? <div className="form-note">{message}</div> : null}
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
