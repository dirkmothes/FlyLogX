"use client";

import { useState, type FormEvent } from "react";

import { API_BASE_URL, type ApiOrganization, type ApiUnit, type ApiUser, type RoleName } from "@/lib/api";

type Props = {
  viewerRole: RoleName;
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

type DeleteTarget =
  | { type: "organization"; id: string; label: string }
  | { type: "unit"; id: string; label: string }
  | { type: "user"; id: string; label: string }
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
  is_deleted: boolean;
  supervised_organization_ids: string[];
};

const roleLabel: Record<RoleName, string> = {
  pilot: "Pilot",
  supervisor: "Supervisor",
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

function normalizeSupervisorOrganizationIds(
  organizationIds: string[],
  preferredOrganizationId: string,
  availableOrganizationIds: string[],
) {
  const available = new Set(availableOrganizationIds);
  const validIds = organizationIds.filter((organizationId) => available.has(organizationId));
  const fallbackIds = preferredOrganizationId && available.has(preferredOrganizationId) ? [preferredOrganizationId] : [];
  return Array.from(new Set([...validIds, ...fallbackIds]));
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14m-7-7h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AdminManagement({ viewerRole, organizations, units, users }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
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
    is_deleted: false,
    supervised_organization_ids: [],
  });

  const tabs: Array<{ id: AdminTab; label: string; count: number }> = [
    { id: "users", label: "User", count: users.length },
    { id: "units", label: "Units", count: units.length },
    { id: "organizations", label: "Organizations", count: organizations.length },
  ];

  const canCreateUsers = viewerRole === "admin" || viewerRole === "supervisor";
  const canCreateStructure = viewerRole === "admin";
  const activeCreateType =
    activeTab === "users" && canCreateUsers
      ? "user"
      : activeTab === "units" && canCreateStructure
        ? "unit"
        : activeTab === "organizations" && canCreateStructure
          ? "organization"
          : null;
  const activeCreateLabel =
    activeCreateType === "user"
      ? "Create user"
      : activeCreateType === "unit"
        ? "Create unit"
        : activeCreateType === "organization"
          ? "Create organization"
          : "";
  const activeSupervisorOrganizationIds =
    userForm.role === "supervisor"
      ? normalizeSupervisorOrganizationIds(
          userForm.supervised_organization_ids,
          userForm.organization_id,
          organizations.map((organization) => organization.id),
        )
      : [];

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
    if (!id) return "No organization";
    return organizations.find((organization) => organization.id === id)?.name ?? shortId(id);
  }

  function unitName(id: string | null | undefined) {
    if (!id) return "No unit";
    const unit = units.find((item) => item.id === id);
    return unit ? `${unit.code} - ${unit.name}` : shortId(id);
  }

  function organizationSupervisors(organizationId: string) {
    const names = users
      .filter((user) => user.role === "supervisor" && user.supervised_organization_ids?.includes(organizationId))
      .map((user) => user.name);
    return names.length > 0 ? names.join(", ") : "No supervisor";
  }

  function openCreate(type: "organization" | "unit" | "user") {
    if (type !== "user" && !canCreateStructure) {
      return;
    }
    if (type === "user" && !canCreateUsers) {
      return;
    }
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
        is_deleted: false,
        supervised_organization_ids: [],
      });
    }
    setDialog({ type, mode: "create" });
  }

  function openEditOrganization(organization: ApiOrganization) {
    setMessage(null);
    setOrganizationForm({
      name: organization.name,
      parent_id: organization.parent_id ?? "",
    });
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
      active: user.active && !user.is_deleted,
      is_deleted: user.is_deleted || !user.active,
      supervised_organization_ids:
        user.role === "supervisor"
          ? normalizeSupervisorOrganizationIds(
              user.supervised_organization_ids ?? [],
              user.organization_id,
              organizations.map((organization) => organization.id),
            )
          : [],
    });
    setDialog({ type: "user", mode: "edit", id: user.id });
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationForm.name.trim()) {
      setMessage("Please enter an organization name.");
      return;
    }

    setBusy("organization-save");
    setMessage(null);
    try {
      const body: {
        name: string;
        parent_id: string | null;
      } = {
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
      setMessage(error instanceof Error ? error.message : "Could not save the organization.");
      setBusy(null);
    }
  }

  async function saveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unitForm.organization_id || !unitForm.name.trim() || !unitForm.code.trim()) {
      setMessage("Please provide an organization, code, and name for the unit.");
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
      setMessage(error instanceof Error ? error.message : "Could not save the unit.");
      setBusy(null);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userForm.organization_id || !userForm.name.trim() || !userForm.email.trim()) {
      setMessage("Please provide an organization, name, and email for the user.");
      return;
    }
    if (dialog?.mode === "create" && !userForm.password.trim()) {
      setMessage("Please provide an initial password for the user.");
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
        is_deleted: userForm.is_deleted,
        supervised_organization_ids:
          viewerRole === "admin" && userForm.role === "supervisor" ? activeSupervisorOrganizationIds : [],
      };
      if (dialog?.mode === "edit" && dialog.id) {
        await requestJson(`/api/users/${dialog.id}`, "PATCH", body);
      } else {
        await requestJson("/api/users", "POST", body);
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the user.");
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

  async function restoreUser(userId: string, busyKey: string) {
    setBusy(busyKey);
    setMessage(null);
    try {
      await requestJson(`/api/users/${userId}`, "PATCH", {
        active: true,
        is_deleted: false,
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not unlock the user.");
      setBusy(null);
    }
  }

  async function deleteDialogEntity() {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === "organization" && viewerRole === "admin") {
      await deactivate(`/api/organizations/${target.id}`, "organization-delete", "Could not delete the organization.");
      return;
    }

    if (target.type === "unit" && viewerRole === "admin") {
      await deactivate(`/api/units/${target.id}`, "unit-delete", "Could not delete the unit.");
      return;
    }

    if (target.type === "user") {
      await deactivate(`/api/users/${target.id}`, "user-delete", "Could not delete the user.");
    }
  }

  function openDeleteTarget(target: DeleteTarget) {
    if (!target) {
      return;
    }
    setDeleteTarget(target);
  }

  function openDeleteConfirmation() {
    if (!dialog || dialog.mode !== "edit" || !dialog.id) {
      return;
    }

    if (dialog.type === "organization" && viewerRole === "admin") {
      setDeleteTarget({
        type: "organization",
        id: dialog.id,
        label: organizationForm.name.trim() || "Organization",
      });
      return;
    }

    if (dialog.type === "unit" && viewerRole === "admin") {
      setDeleteTarget({
        type: "unit",
        id: dialog.id,
        label: unitForm.name.trim() || "Unit",
      });
      return;
    }

    if (dialog.type === "user") {
      setDeleteTarget({
        type: "user",
        id: dialog.id,
        label: userForm.name.trim() || "User",
      });
    }
  }

  const activeDialogTitle =
    dialog?.type === "user"
      ? dialog.mode === "edit"
        ? "Edit user"
        : "Create user"
      : dialog?.type === "unit"
        ? dialog.mode === "edit"
          ? "Edit unit"
          : "Create unit"
      : dialog?.mode === "edit"
        ? "Edit organization"
        : "Create organization";

  const deleteTargetTypeLabel =
    deleteTarget?.type === "organization"
      ? "Organization"
      : deleteTarget?.type === "unit"
        ? "Unit"
        : deleteTarget?.type === "user"
          ? "User"
          : "";

  return (
    <div className="admin-console">
      {message ? <div className="form-note admin-message">{message}</div> : null}

      <section className="admin-command">
        <div>
          <span className="admin-kicker">Administration</span>
          <h2>Identities, units, and organizational structure</h2>
        </div>
        <div className="admin-command-actions">
          {activeCreateType ? (
            <button
              type="button"
              className="admin-command-button"
              onClick={() => openCreate(activeCreateType)}
              aria-label={activeCreateLabel}
              title={activeCreateLabel}
            >
              <PlusIcon />
              <span className="sr-only">{activeCreateLabel}</span>
            </button>
          ) : null}
        </div>
      </section>

      <section className="admin-directory">
        <div className="admin-directory-sidebar-stack">
          <div className="admin-directory-sidebar" role="tablist" aria-label="Administration sections">
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
                <span>Search</span>
                <input
                  className="input"
                  value={userSearch}
                  placeholder="Name, email, or unit"
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </label>

              <div className="admin-chip-group">
                <span className="admin-chip-label">Role</span>
                <div className="admin-chip-row">
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${roleFilter === "all" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setRoleFilter("all")}
                  >
                    All roles
                  </button>
                  {((viewerRole === "admin"
                    ? ["pilot", "supervisor", "admin"]
                    : ["pilot", "supervisor"]) as RoleName[]).map((role) => (
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
                    All
                  </button>
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${statusFilter === "active" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`filter-chip admin-chip-button ${statusFilter === "inactive" ? "admin-chip-button-active" : ""}`}
                    onClick={() => setStatusFilter("inactive")}
                  >
                    Blocked
                  </button>
                </div>
              </div>

              <div className="admin-chip-count">
                <span>Results</span>
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
                          {user.active && !user.is_deleted ? "active" : "blocked"}
                        </span>
                        <span>{roleLabel[user.role]}</span>
                      </div>
                    </div>
                    <div className="admin-record-actions">
                      <button type="button" className="admin-action-button admin-action-button-edit" title="Edit user" onClick={() => openEditUser(user)}>
                        Edit
                      </button>
                      {viewerRole === "admin" || viewerRole === "supervisor" ? (
                        <button
                          type="button"
                          className="admin-action-button admin-danger-button"
                          title="Delete user"
                          onClick={() =>
                            openDeleteTarget({
                              type: "user",
                              id: user.id,
                              label: user.name,
                            })
                          }
                        >
                          Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`admin-action-button ${user.active && !user.is_deleted ? "admin-danger-button" : "admin-action-button-edit"}`}
                        title={user.active && !user.is_deleted ? "Lock user" : "Unlock user"}
                        disabled={busy === `user-toggle-${user.id}`}
                        onClick={() =>
                          user.active && !user.is_deleted
                            ? deactivate(`/api/users/${user.id}`, `user-toggle-${user.id}`, "Could not lock the user.")
                            : restoreUser(user.id, `user-toggle-${user.id}`)
                        }
                      >
                        {user.active && !user.is_deleted ? "Lock" : "Unlock"}
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
                <article className="admin-record-card admin-user-record-card admin-entity-record-card" key={unit.id}>
                  <div className="admin-record-top">
                    <div className="admin-primary-cell">
                      <div className="admin-entity-headline">
                        <strong>{unit.name}</strong>
                        <span>{organizationName(unit.organization_id)}</span>
                        <span className="admin-code-cell">{unit.code}</span>
                      </div>
                    </div>
                    <div className="admin-record-actions">
                      <button type="button" className="admin-action-button admin-action-button-edit" title="Edit unit" onClick={() => openEditUnit(unit)}>
                        Edit
                      </button>
                      {viewerRole === "admin" ? (
                        <button
                          type="button"
                          className="admin-action-button admin-danger-button"
                          title="Delete unit"
                          onClick={() =>
                            openDeleteTarget({
                              type: "unit",
                              id: unit.id,
                              label: unit.name,
                            })
                          }
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "organizations" ? (
            <div className="admin-card-list">
              {organizations.map((organization) => (
                <article className="admin-record-card admin-user-record-card admin-entity-record-card" key={organization.id}>
                  <div className="admin-record-top">
                    <div className="admin-primary-cell">
                      <div className="admin-entity-headline">
                        <strong>{organization.name}</strong>
                        <span>{organization.parent_id ? organizationName(organization.parent_id) : "Top-level organization"}</span>
                        <span>Supervisors: {organizationSupervisors(organization.id)}</span>
                      </div>
                    </div>
                    <div className="admin-record-actions">
                      <button
                        type="button"
                        className="admin-action-button admin-action-button-edit"
                        title="Edit organization"
                        onClick={() => openEditOrganization(organization)}
                      >
                        Edit
                      </button>
                      {viewerRole === "admin" ? (
                        <button
                          type="button"
                          className="admin-action-button admin-danger-button"
                          title="Delete organization"
                          onClick={() =>
                            openDeleteTarget({
                              type: "organization",
                              id: organization.id,
                              label: organization.name,
                            })
                          }
                        >
                          Delete
                        </button>
                      ) : null}
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
                <span className="admin-kicker">{dialog.mode === "edit" ? "Edit" : "New"}</span>
                <h3 id="admin-dialog-title">{activeDialogTitle}</h3>
              </div>
              <button type="button" className="admin-close-button" title="Close dialog" onClick={() => setDialog(null)}>
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
                  <span>Parent organization</span>
                  <select
                    className="input"
                    value={organizationForm.parent_id}
                    onChange={(event) => setOrganizationForm((current) => ({ ...current, parent_id: event.target.value }))}
                  >
                    <option value="">None</option>
                    {organizations
                      .filter((organization) => organization.id !== dialog.id)
                      .map((organization) => (
                        <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                      ))}
                    </select>
                </label>
                <DialogActions
                  busy={busy === "organization-save"}
                  onCancel={() => setDialog(null)}
                />
              </form>
            ) : null}

            {dialog.type === "unit" ? (
              <form className="admin-dialog-form" onSubmit={saveUnit}>
                <label className="field">
                  <span>Organization</span>
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
                    <span>Code</span>
                    <input className="input" value={unitForm.code} onChange={(event) => setUnitForm((current) => ({ ...current, code: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Name</span>
                    <input className="input" value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} />
                  </label>
                </div>
                <DialogActions
                  busy={busy === "unit-save"}
                  onCancel={() => setDialog(null)}
                />
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
                    <span>Email</span>
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
                    <span>Organization</span>
                    <select
                      className="input"
                      value={userForm.organization_id}
                      onChange={(event) => {
                        const organization_id = event.target.value;
                        const firstUnit = units.find((unit) => unit.organization_id === organization_id);
                        setUserForm((current) => ({
                          ...current,
                          organization_id,
                          unit_id: firstUnit?.id ?? "",
                          supervised_organization_ids:
                            current.role === "supervisor"
                              ? normalizeSupervisorOrganizationIds(
                                  current.supervised_organization_ids,
                                  organization_id,
                                  organizations.map((organization) => organization.id),
                                )
                              : [],
                        }));
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
                    <span>Unit</span>
                    <select className="input" value={userForm.unit_id} onChange={(event) => setUserForm((current) => ({ ...current, unit_id: event.target.value }))}>
                      <option value="">No unit</option>
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
                    <span>Role</span>
                    <select
                      className="input"
                      value={userForm.role}
                      onChange={(event) =>
                        setUserForm((current) => {
                          const role = event.target.value as RoleName;
                          return {
                            ...current,
                            role,
                            supervised_organization_ids:
                              role === "supervisor"
                                ? normalizeSupervisorOrganizationIds(
                                    current.supervised_organization_ids,
                                    current.organization_id,
                                    organizations.map((organization) => organization.id),
                                  )
                                : [],
                          };
                        })
                      }
                    >
                      <option value="pilot">Pilot</option>
                      <option value="supervisor">Supervisor</option>
                      {viewerRole === "admin" ? <option value="admin">Admin</option> : null}
                    </select>
                  </label>
                  <label className="field">
                    <span>{dialog.mode === "edit" ? "New password" : "Initial password"}</span>
                    <input
                      className="input"
                      type="password"
                      value={userForm.password}
                      onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                </div>
                {viewerRole === "admin" && userForm.role === "supervisor" ? (
                  <label className="field">
                    <span>Supervised organizations</span>
                    <div className="admin-org-checkbox-list">
                      {organizations.map((organization) => {
                        const checked = activeSupervisorOrganizationIds.includes(organization.id);
                        return (
                          <label key={organization.id} className={`admin-org-checkbox ${checked ? "admin-org-checkbox-active" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setUserForm((current) => {
                                  const currentIds = normalizeSupervisorOrganizationIds(
                                    current.supervised_organization_ids,
                                    current.organization_id,
                                    organizations.map((item) => item.id),
                                  );
                                  const nextIds = checked
                                    ? currentIds.filter((id) => id !== organization.id)
                                    : Array.from(new Set([...currentIds, organization.id]));
                                  return {
                                    ...current,
                                    supervised_organization_ids: normalizeSupervisorOrganizationIds(
                                      nextIds,
                                      current.organization_id,
                                      organizations.map((item) => item.id),
                                    ),
                                  };
                                })
                              }
                            />
                            <span>{organization.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </label>
                ) : null}
                <div className="admin-state-group">
                  <span className="admin-state-label">Status</span>
                  <div className="admin-state-toggle" role="radiogroup" aria-label="User status">
                    <label className={`admin-state-option ${userForm.active && !userForm.is_deleted ? "admin-state-option-active" : ""}`}>
                      <input
                        type="radio"
                        name="user-state"
                        checked={userForm.active && !userForm.is_deleted}
                        onChange={() => setUserForm((current) => ({ ...current, active: true, is_deleted: false }))}
                      />
                      Active
                    </label>
                    <label className={`admin-state-option ${!userForm.active || userForm.is_deleted ? "admin-state-option-active" : ""}`}>
                      <input
                        type="radio"
                        name="user-state"
                        checked={!userForm.active || userForm.is_deleted}
                        onChange={() => setUserForm((current) => ({ ...current, active: false, is_deleted: true }))}
                      />
                      Blocked
                    </label>
                  </div>
                </div>
                <DialogActions
                  busy={busy === "user-save"}
                  onCancel={() => setDialog(null)}
                />
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="admin-dialog-backdrop admin-confirm-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section
            className="admin-dialog admin-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-dialog-header admin-confirm-header">
              <div>
                <span className="admin-kicker">Confirm deletion</span>
                <h3 id="delete-dialog-title">{deleteTarget.label}</h3>
              </div>
              <button type="button" className="admin-close-button" title="Close dialog" onClick={() => setDeleteTarget(null)}>
                X
              </button>
            </div>
            <div className="admin-confirm-copy">
              <div className="admin-confirm-warning">Warning: {deleteTargetTypeLabel} permanently delete</div>
              <p>
                The record will be removed from administration and hidden from the UI. Only continue if you are sure.
              </p>
            </div>
            <div className="admin-dialog-actions">
              <button type="button" className="button button-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="button button-danger" disabled={busy === "organization-delete" || busy === "unit-delete" || busy === "user-delete"} onClick={() => void deleteDialogEntity()}>
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DialogActions({
  busy,
  deleteBusy = false,
  canDelete = false,
  onDelete,
  onCancel,
}: {
  busy: boolean;
  deleteBusy?: boolean;
  canDelete?: boolean;
  onDelete?: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div className="admin-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onCancel}>
        Cancel
      </button>
      {canDelete && onDelete ? (
        <button type="button" className="button button-danger" disabled={deleteBusy} onClick={() => void onDelete()}>
          Delete
        </button>
      ) : null}
      <button type="submit" className="button button-primary" disabled={busy}>
        Save
      </button>
    </div>
  );
}
