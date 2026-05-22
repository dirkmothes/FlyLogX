"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { API_BASE_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("pilot@flylogx.local");
  const [password, setPassword] = useState("flylogx-demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Login fehlgeschlagen");
      }

      await response.json();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-hero">
        <div className="brand-block brand-block--logo" style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}>
          <Image className="brand-logo" src="/fly-icon.png" alt="FlyLogX Logo" width={112} height={112} priority />
          <div className="brand-subtitle">Digitales Flugzeitennachweisheft</div>
        </div>
        <div>
          <h1>Digitale Flugerfassung für Piloten und Organisationen.</h1>
          <p>
            Erfasse Flüge digital, prüfe Einträge mit klaren Rollen, exportiere Nachweise als PDF und behalte jederzeit
            den auditierbaren Gesamtstatus im Blick.
          </p>
        </div>
        <div className="muted-list">
          <div>• Login und Rollenverwaltung</div>
          <div>• Rollen: Pilot, Vorgesetzter, Admin</div>
          <div>• Digitale Freigabe und Änderungsverlauf</div>
        </div>
      </section>

      <section className="login-card">
        <div className="form-card">
          <div className="panel-header" style={{ padding: 0, borderBottom: "none", marginBottom: 18 }}>
            <div>
              <h2>Anmeldung</h2>
              <p>Demo-Zugänge sind im Backend-Seed vorgesehen.</p>
            </div>
          </div>

          <form className="section-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>E-Mail</span>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Passwort</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <div className="form-error">{error}</div> : null}
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? "Anmeldung..." : "Anmelden"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 16, color: "var(--muted)", lineHeight: 1.6 }}>
            Demo-Konten:
            <br />
            Pilot, Supervisor oder Admin mit dem Passwort <code>flylogx-demo</code>.
          </div>

        </div>
      </section>
    </div>
  );
}
