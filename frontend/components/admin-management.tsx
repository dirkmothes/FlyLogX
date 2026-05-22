"use client";

import { useState, type FormEvent } from "react";

import { API_BASE_URL, type ApiOrganization, type ApiUnit, type ApiUser, type RoleName } from "@/lib/api";

type Props = {
  organizations: ApiOrganization[];
  units: ApiUnit[];
  users: ApiUser[];
};

type AdminTab = "users" | "units" | "organizations";
type DialogMode = "create" | "edit";
type DialogState =
  | { type: "organization"; mode: DialogMode; id?: string }
  | { type: "unit"; mode: DialogMode; id?: string }
  | { type: "user"; mode: DialogMode; id?: string }
  | null;

type OrganizationForm = {
  name: string;
  parent_id: string;
};

type UnitForm = {
  organization_id: string;
  name: string;
  code: string;
};

type UserForm = {
  organization_id: string;
  unit_id: string;
  role: RoleName;
  name: string;
  email: string;
  password: string;
  active: boolean;
  two_factor_enabled: boolean;
};

const roleLabel: Record<RoleName, string> = {
  pilot: "Pilot",
  supervisor: "Vorgesetzter",
  admin: "Admin",
};

function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function requestJson(path: string, method: string, body: unknown) {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }

  return response.json().catch(() => null);
}

function shortId(id: string) {
  return id.length > 18 ? `${id.slice(0, 10)}...${id.slice(-4)}` : id;
}

export function AdminManagement({ organizations, units, users }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleName>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>({ name: "", parent_id: "" });
  const [unitForm, setUnitForm] = useState<UnitForm>({
    organization_id: organizations[0]?.id ?? "",
    name: "",
    code: "",
  });
  const [userForm, setUserForm] = useState<UserForm>({
    organization_id: organizations[0]?.id ?? "",
    unit_id: units.find((unit) => unit.organization_id === organizations[0]?.id)?.id ?? "",
    role: "pilot",
    name: "",
    email: "",
    password: "",
    active: true,
    two_factor_enabled: false,
  });

  const tabs: Array<{ id: AdminTab; label: string; count: number }> = [
    { id: "users", label: "Nutzer", count: users.length },
    { id: "units", label: "Einheiten", count: units.length },
    { id: "organizations", label: "Organisationen", count: organizations.length },
  ];

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = userSearch.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch) ||
      unitName(user.unit_id).toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const isActive = user.active && !user.is_deleted;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? isActive : !isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  function organizationName(id: string | null | undefined) {
    if (!id) return "Keine Organisation";
    return organizations.find((organization) => organization.id === id)?.name ?? shortId(id);
  }

  function unitName(id: string | null | undefined) {
    if (!id) return "Ohne Einheit";
    const unit = units.find((item) => item.id === id);
    return unit ? `${unit.code} - ${unit.name}` : shortId(id);
  }

  function openCreate(type: "organization" | "unit" | "user") {
    setMessage(null);
    if (type === "organization") {
      setOrganizationForm({ name: "", parent_id: "" });
    }
    if (type === "unit") {
      setUnitForm({ organization_id: organizations[0]?.id ?? "", name: "", code: "" });
    }
    if (type === "user") {
      const organization_id = organizations[0]?.id ?? "";
      setUserForm({
        organization_id,
        unit_id: units.find((unit) => unit.organization_id === organization_id)?.id ?? "",
        role: "pilot",
        name: "",
        email: "",
        password: "",
        active: true,
        two_factor_enabled: false,
      });
    }
    setDialog({ type, mode: "create" });
  }

  function openEditOrganization(organization: ApiOrganization) {
    setMessage(null);
    setOrganizationForm({ name: organization.name, parent_id: organization.parent_id ?? "" });
    setDialog({ type: "organization", mode: "edit", id: organization.id });
  }

  function openEditUnit(unit: ApiUnit) {
    setMessage(null);
    setUnitForm({ organization_id: unit.organization_id, name: unit.name, code: unit.code });
    setDialog({ type: "unit", mode: "edit", id: unit.id });
  }

  function openEditUser(user: ApiUser) {
    setMessage(null);
    setUserForm({
      organization_id: user.organization_id,
      unit_id: user.unit_id ?? "",
      role: user.role,
      name: user.name,
      email: user.email,
      password: "",
      active: user.active,
      two_factor_enabled: user.two_factor_enabled,
    });
    setDialog({ type: "user", mode: "edit", id: user.id });
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationForm.name.trim()) {
      setMessage("Bitte einen Organisationsnamen angeben.");
      return;
    }

    setBusy("organization-save");
    setMessage(null);
    try {
      const body = {
        name: organizationForm.name.trim(),
        parent_id: organizationForm.parent_id || null,
      };
      if (dialog?.mode === "edit" && dialog.id) {
        await requestJson(`/api/organizations/${dialog.id}`, "PATCH", body);
      } else {
        await requestJson("/api/organizations", "POST", body);
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Organisation konnte nicht gespeichert werden");
      setBusy(null);
    }
  }

  async function saveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unitForm.organization_id || !unitForm.name.trim() || !unitForm.code.trim()) {
      setMessage("Bitte Organisation, Kürzel und Namen für die Einheit angeben.");
      return;
    }

    setBusy("unit-save");
    setMessage(null);
    try {
      const body = {
        organization_id: unitForm.organization_id,
        name: unitForm.name.trim(),
        code: unitForm.code.trim(),
      };
      if (dialog?.mode === "edit" && dialog.id) {
        await requestJson(`/api/units/${dialog.id}`, "PATCH", body);
      } else {
        await requestJson("/api/units", "POST", body);
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Einheit konnte nicht gespeichert werden");
      setBusy(null);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userForm.organization_id || !userForm.name.trim() || !userForm.email.trim()) {
      setMessage("Bitte Organisation, Name und E-Mail für den Benutzer angeben.");
      return;
    }
    if (dialog?.mode === "create" && !userForm.password.trim()) {
      setMessage("Bitte ein Startpasswort für den Benutzer angeben.");
      return;
    }

    setBusy("user-save");
    setMessage(null);
    try {
      const body = {
        organization_id: userForm.organization_id,
        unit_id: userForm.unit_id || null,
        role: userForm.role,
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password.trim() || null,
        active: userForm.active,
        two_factor_enabled: userForm.two_factor_enabled,
      };
      if (dialog?.mode === "edit" && dialog.id) {
        await requestJson(`/api/users/${dialog.id}`, "PATCH", body);
      } else {
        await requestJson("/api/users", "POST", body);
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Benutzer konnte nicht gespeichert werden");
      setBusy(null);
    }
  }

  async function deactivate(path: string, busyKey: string, fallback: string) {
    setBusy(busyKey);
    setMessage(null);
    try {
      await requestJson(path, "DELETE", {});
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallback);
      setBusy(null);
    }
  }

  const activeDialogTitle =
    dialog?.type === "user"
      ? dialog.mode === "edit"
        ? "Nutzer bearbeiten"
        : "Nutzer anlegen"
      : dialog?.type === "unit"
        ? dialog.mode === "edit"
          ? "Einheit bearbeiten"
          : "Einheit anlegen"
        : dialog?.mode === "edit"
          ? "Organisation bearbeiten"
          : "Organisation anlegen";

  return (
    <div className="admin-console">
      {message ? <div className="form-note admin-message">{message}</div> : null}

      <section className="admin-command">
        <div>
          <span className="admin-kicker">Administration</span>
          <h2>Identitäten, Einheiten und Organisationsstruktur</h2>
        </div>
        <div className="admin-command-actions">
          <button type="button" className="button button-secondary" onClick={() => openCreate("organization")}>
            Organisation
          </button>
          <button type="button" className="button button-secondary" onClick={() => openCreate("unit")}>
            Einheit
          </button>
          <button type="button" className="button button-primary" onClick={() => openCreate("user")}>
            Nutzer anlegen
          </button>
        </div>
      </section>

      <section className="admin-directory">
        <div className="admin-directory-sidebar-stack">
          <div className="admin-directory-sidebar" role="tablist" aria-label="Verwaltungsbereiche">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`admin-directory-tab ${activeTab === tab.id ? "admin-directory-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </button>
            ))}
          </div>

          {activeTab === "users" ? (
            <div className="admin-user-toolbar">
              <label className="admin-search-field">
                <span>Suche</span>
                <input
                  className="input"
                  value={userSearch}
                  placeholder="Name, E-Mail oder Einheit"
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </label>

              <div className="admin-chip-group">
                <span className="admin-chip-label">Rolle</span>
                <div className="admin-chip-row">
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${roleFilter === "all" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setRoleFilter("all")}
                  >
                    Alle Rollen
                  </button>
                  {(["pilot", "supervisor", "admin"] as RoleName[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`filter-chip admin-chip-button ${roleFilter === role ? "admin-chip-button-active" : ""}`}
                      onClick={() => setRoleFilter(role)}
                    >
                      {roleLabel[role]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-chip-group">
                <span className="admin-chip-label">Status</span>
                <div className="admin-chip-row">
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${statusFilter === "all" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${statusFilter === "active" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Aktiv
                  </button>
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${statusFilter === "inactive" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setStatusFilter("inactive")}
                  >
                    Gesperrt
                  </button>
                </div>
              </div>

              <div className="admin-chip-count">
                <span>Treffer</span>
                <strong>{filteredUsers.length}</strong>
              </div>
            </div>
          ) : null}
        </div>

        <div className="admin-directory-main">
          {activeTab === "users" ? (
            <div className="admin-card-list">
              {filteredUsers.map((user) => (
                <article className="admin-record-card admin-user-record-card" key={user.id}>
                  <div className="admin-record-top">
                    <div className="admin-primary-cell">
                      <div className="admin-user-headline">
                        <strong>{user.name}</strong>
                        <span className={`admin-status-inline ${user.active && !user.is_deleted ? "admin-status-active" : "admin-status-blocked"}`}>
                          {user.active && !user.is_deleted ? "aktiv" : "gesperrt"}
                        </span>
                        <span>{roleLabel[user.role]}</span>
                      </div>
                    </div>
                    <div className="admin-record-actions">
                      <button type="button" className="admin-action-button" title="Nutzer bearbeiten" onClick={() => openEditUser(user)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="admin-action-button admin-danger-button"
                        title={user.active && !user.is_deleted ? "Nutzer sperren" : "Nutzer ist gesperrt"}
                        disabled={busy === `user-delete-${user.id}`}
                        onClick={() => deactivate(`/api/users/${user.id}`, `user-delete-${user.id}`, "Benutzer konnte nicht gesperrt werden")}
                      >
                        {user.active && !user.is_deleted ? "Sperren" : "Gesperrt"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "units" ? (
            <div className="admin-card-list">
              {units.map((unit) => (
                <article className="admin-record-card" key={unit.id}>
                  <div className="admin-record-top">
                    <div className="admin-primary-cell">
                      <strong>{unit.name}</strong>
                      <span className="admin-code-cell">{unit.code}</span>
                    </div>
                    <div className="admin-record-actions">
                      <button type="button" className="admin-action-button" title="Einheit bearbeiten" onClick={() => openEditUnit(unit)}>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="admin-action-button admin-danger-button"
                        title="Einheit deaktivieren"
                        disabled={busy === `unit-delete-${unit.id}`}
                        onClick={() => deactivate(`/api/units/${unit.id}`, `unit-delete-${unit.id}`, "Einheit konnte nicht deaktiviert werden")}
                      >
                        Sperren
                      </button>
                    </div>
                  </div>
                  <div className="admin-record-meta">
                    <div className="admin-record-field">
                      <span>Organisation</span>
                      <strong>{organizationName(unit.organization_id)}</strong>
                    </div>
                    <div className="admin-record-field">
                      <span>ID</span>
                      <strong className="admin-mono-cell">{shortId(unit.id)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "organizations" ? (
            <div className="admin-card-list">
              {organizations.map((organization) => (
                <article className="admin-record-card" key={organization.id}>
                  <div className="admin-record-top">
                    <div className="admin-primary-cell">
                      <strong>{organization.name}</strong>
                      <span>{organization.parent_id ? organizationName(organization.parent_id) : "Root-Organisation"}</span>
                    </div>
                    <div className="admin-record-actions">
                      <button
                        type="button"
                        className="admin-action-button"
                        title="Organisation bearbeiten"
                        onClick={() => openEditOrganization(organization)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="admin-action-button admin-danger-button"
                        title="Organisation deaktivieren"
                        disabled={busy === `org-delete-${organization.id}`}
                        onClick={() =>
                          deactivate(
                            `/api/organizations/${organization.id}`,
                            `org-delete-${organization.id}`,
                            "Organisation konnte nicht deaktiviert werden",
                          )
                        }
                      >
                        Sperren
                      </button>
                    </div>
                  </div>
                  <div className="admin-record-meta">
                    <div className="admin-record-field">
                      <span>ID</span>
                      <strong className="admin-mono-cell">{shortId(organization.id)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {dialog ? (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-dialog-header">
              <div>
                <span className="admin-kicker">{dialog.mode === "edit" ? "Bearbeiten" : "Neu"}</span>
                <h3 id="admin-dialog-title">{activeDialogTitle}</h3>
              </div>
              <button type="button" className="admin-close-button" title="Dialog schließen" onClick={() => setDialog(null)}>
                X
              </button>
            </div>

            {dialog.type === "organization" ? (
              <form className="admin-dialog-form" onSubmit={saveOrganization}>
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    value={organizationForm.name}
                    onChange={(event) => setOrganizationForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Übergeordnete Organisation</span>
                  <select
                    className="input"
                    value={organizationForm.parent_id}
                    onChange={(event) => setOrganizationForm((current) => ({ ...current, parent_id: event.target.value }))}
                  >
                    <option value="">Keine</option>
                    {organizations
                      .filter((organization) => organization.id !== dialog.id)
                      .map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                  </select>
                </label>
                <DialogActions busy={busy === "organization-save"} onCancel={() => setDialog(null)} />
              </form>
            ) : null}

            {dialog.type === "unit" ? (
              <form className="admin-dialog-form" onSubmit={saveUnit}>
                <label className="field">
                  <span>Organisation</span>
                  <select
                    className="input"
                    value={unitForm.organization_id}
                    onChange={(event) => setUnitForm((current) => ({ ...current, organization_id: event.target.value }))}
                  >
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="admin-dialog-grid">
                  <label className="field">
                    <span>Kürzel</span>
                    <input className="input" value={unitForm.code} onChange={(event) => setUnitForm((current) => ({ ...current, code: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Name</span>
                    <input className="input" value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                </div>
                <DialogActions busy={busy === "unit-save"} onCancel={() => setDialog(null)} />
              </form>
            ) : null}

            {dialog.type === "user" ? (
              <form className="admin-dialog-form" onSubmit={saveUser}>
                <div className="admin-dialog-grid">
                  <label className="field">
                    <span>Name</span>
                    <input className="input" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>E-Mail</span>
                    <input
                      className="input"
                      type="email"
                      value={userForm.email}
                      onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="admin-dialog-grid">
                  <label className="field">
                    <span>Organisation</span>
                    <select
                      className="input"
                      value={userForm.organization_id}
                      onChange={(event) => {
                        const organization_id = event.target.value;
                        const firstUnit = units.find((unit) => unit.organization_id === organization_id);
                        setUserForm((current) => ({ ...current, organization_id, unit_id: firstUnit?.id ?? "" }));
                      }}
                    >
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Einheit</span>
                    <select className="input" value={userForm.unit_id} onChange={(event) => setUserForm((current) => ({ ...current, unit_id: event.target.value }))}>
                      <option value="">Ohne Einheit</option>
                      {units
                        .filter((unit) => unit.organization_id === userForm.organization_id)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.code} - {unit.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <div className="admin-dialog-grid">
                  <label className="field">
                    <span>Rolle</span>
                    <select className="input" value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as RoleName }))}>
                      <option value="pilot">Pilot</option>
                      <option value="supervisor">Vorgesetzter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dialog.mode === "edit" ? "Neues Passwort" : "Startpasswort"}</span>
                    <input
                      className="input"
                      type="password"
                      value={userForm.password}
                      onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="admin-switch-row">
                  <label>
                    <input type="checkbox" checked={userForm.active} onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))} />
                    Aktiv
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={userForm.two_factor_enabled}
                      onChange={(event) => setUserForm((current) => ({ ...current, two_factor_enabled: event.target.checked }))}
                    />
                    2FA
                  </label>
                </div>
                <DialogActions busy={busy === "user-save"} onCancel={() => setDialog(null)} />
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DialogActions({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <div className="admin-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onCancel}>
        Abbrechen
      </button>
      <button type="submit" className="button button-primary" disabled={busy}>
        Speichern
      </button>
    </div>
  );
}
