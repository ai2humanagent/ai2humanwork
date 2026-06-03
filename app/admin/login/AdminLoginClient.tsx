"use client";

import { useState } from "react";
import styles from "../../app/admin/admin.module.css";

export default function AdminLoginClient({
  from,
  adminError
}: {
  from: string;
  adminError: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(adminError ? "Admin login required." : "");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in.");
      }
      window.location.href = from.startsWith("/") ? from : "/app/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <form className={styles.loginPanel} onSubmit={submit}>
        <div className={styles.loginHeader}>
          <span className={styles.loginKicker}>ai2human admin</span>
          <h1>Admin login</h1>
          <p>Access user, task, identity, and payout operations.</p>
        </div>

        <label className={styles.loginField}>
          <span>Username</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
          />
        </label>

        <label className={styles.loginField}>
          <span>Password</span>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
          />
        </label>

        {error && <p className={styles.loginError}>{error}</p>}

        <button className={styles.loginButton} type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
