"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { API_BASE_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("pilot");
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
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || "Login failed");
      }

      await response.json();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-hero">
        <div className="brand-block brand-block--logo" style={{ borderBottomColor: "rgba(255,255,255,0.1)" }}>
          <img className="brand-logo" src="/fly-icon.png" alt="FlyLogX Logo" />
          <div className="brand-subtitle">Flight operations logbook</div>
        </div>
        <div>
          <h1>Flight operations logging for pilots and organizations.</h1>
          <p>
            Record flights digitally, review entries with clear roles, export records as PDF, and keep the auditable
            overall status in view at all times.
          </p>
        </div>
        <div className="muted-list">
          <div>• Login and role management</div>
          <div>• Roles: Pilot, Supervisor, Admin</div>
          <div>• Digital approvals and change history</div>
        </div>
      </section>

      <section className="login-card">
        <div className="form-card">
          <div className="panel-header" style={{ padding: 0, borderBottom: "none", marginBottom: 18 }}>
            <div>
              <h2>Sign in</h2>
              <p>Demo accounts are seeded in the backend.</p>
            </div>
          </div>

          <form className="section-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input className="input" type="text" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label className="field">
              <span>Password</span>
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
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 16, color: "var(--muted)", lineHeight: 1.6 }}>
            Demo accounts:
            <br />
            <code>pilot</code>, <code>supervisor</code>, or <code>admin</code> with the password{" "}
            <code>flylogx-demo</code>.
          </div>
        </div>
      </section>
    </div>
  );
}
