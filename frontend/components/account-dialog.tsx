"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { ApiUser } from "@/lib/api";

type Props = {
  user: Pick<ApiUser, "username" | "first_name" | "last_name" | "name" | "email" | "role" | "organization_id" | "unit_id">;
};

type AccountForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm0 2.3c-4.1 0-7.5 2.4-7.5 5.4v.1h15v-.1c0-3-3.4-5.4-7.5-5.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AccountDialog({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>({
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    password: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: "",
    });
    setMessage(null);
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.username.trim()) {
      setMessage("Please enter a username.");
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMessage("Please enter a first and last name.");
      return;
    }
    if (!form.email.trim()) {
      setMessage("Please enter an email address.");
      return;
    }

    const payload: Record<string, unknown> = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorPayload?.detail || `Request failed (${response.status})`);
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="topbar-icon-button topbar-icon-button-secondary"
        aria-label="My account"
        title="My account"
      >
        <UserIcon />
        <span className="sr-only">My account</span>
      </button>

      {open ? (
        <div
          className="admin-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            className="admin-dialog account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
          >
            <div className="admin-dialog-header">
              <div>
                <span className="admin-mini-badge">Account settings</span>
                <h3 id="account-dialog-title">My account</h3>
                <p>Update your profile details and password here.</p>
              </div>
              <button type="button" className="admin-close-button" onClick={() => setOpen(false)} aria-label="Close dialog">
                ×
              </button>
            </div>

            <form className="admin-dialog-form" onSubmit={handleSubmit}>
              <div className="mini-card">
                <h3>{user.name}</h3>
                <p>@{user.username}</p>
                <p>
                  Role: <strong>{user.role}</strong>
                </p>
              </div>

              <div className="admin-dialog-grid">
                <label className="field">
                  <span>Username</span>
                  <input
                    className="input"
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
              </div>

              <div className="admin-dialog-grid">
                <label className="field">
                  <span>First name</span>
                  <input
                    className="input"
                    value={form.first_name}
                    onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input
                    className="input"
                    value={form.last_name}
                    onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                  />
                </label>
              </div>

              <div className="admin-dialog-grid">
                <label className="field">
                  <span>New password</span>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <div className="account-note-box">
                  <span>Note</span>
                  <p>Leave the password field empty if you only want to change your profile data.</p>
                </div>
              </div>

              {message ? <div className="form-error">{message}</div> : null}

              <div className="admin-dialog-actions">
                <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={busy}>
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
