"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { ApiUser } from "@/lib/api";

type Props = {
  user: Pick<ApiUser, "name" | "email" | "role" | "organization_id" | "unit_id" | "two_factor_enabled">;
};

type AccountForm = {
  name: string;
  email: string;
  password: string;
  two_factor_enabled: boolean;
};

export function AccountDialog({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>({
    name: user.name,
    email: user.email,
    password: "",
    two_factor_enabled: user.two_factor_enabled,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      name: user.name,
      email: user.email,
      password: "",
      two_factor_enabled: user.two_factor_enabled,
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
    if (!form.name.trim()) {
      setMessage("Bitte einen Namen angeben.");
      return;
    }
    if (!form.email.trim()) {
      setMessage("Bitte eine E-Mail-Adresse angeben.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      two_factor_enabled: form.two_factor_enabled,
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
      setMessage(error instanceof Error ? error.message : "Konto konnte nicht gespeichert werden");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="topbar-button topbar-button-secondary">
        Mein Konto
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
                <span className="admin-mini-badge">Persönlicher Bereich</span>
                <h3 id="account-dialog-title">Mein Konto</h3>
                <p>Eigene Stammdaten, Sicherheit und Passwortpflege</p>
              </div>
              <button type="button" className="admin-close-button" onClick={() => setOpen(false)} aria-label="Dialog schließen">
                ×
              </button>
            </div>

            <form className="admin-dialog-form" onSubmit={handleSubmit}>
              <div className="mini-card">
                <h3>{user.name}</h3>
                <p>
                  Rolle: <strong>{user.role}</strong> · 2FA: {user.two_factor_enabled ? "aktiv" : "inaktiv"}
                </p>
              </div>

              <div className="admin-dialog-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>E-Mail</span>
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
                  <span>Neues Passwort</span>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <div className="admin-switch-row account-switch-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.two_factor_enabled}
                      onChange={(event) => setForm((current) => ({ ...current, two_factor_enabled: event.target.checked }))}
                    />
                    2FA aktivieren
                  </label>
                </div>
              </div>

              <div className="form-note">
                Das Passwortfeld bleibt leer, wenn nur Name, E-Mail oder 2FA geändert werden soll.
              </div>

              {message ? <div className="form-error">{message}</div> : null}

              <div className="admin-dialog-actions">
                <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>
                  Abbrechen
                </button>
                <button type="submit" className="button button-primary" disabled={busy}>
                  Speichern
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
