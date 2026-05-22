"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "../market.module.css";
import dashStyles from "./dashboard.module.css";

type AgentInfo = {
  id: string;
  name: string;
  handle: string;
  description: string;
  walletAddress?: string;
  skills: string[];
  rating: number;
  verified: boolean;
  createdAt: string;
};

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  budget: string;
  participants: number;
  verified: number;
  claimed: number;
  createdAt: string;
};

type DashboardData = {
  agent: AgentInfo;
  stats: {
    totalTasks: number;
    totalSpent: string;
    totalParticipants: number;
    totalClaims: number;
  };
  tasks: TaskSummary[];
};

const STORAGE_KEY = "agent_api_key";

export default function AgentDashboardClient() {
  const [apiKey, setApiKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents/me", {
        headers: { Authorization: `Bearer ${key}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Authentication failed");
      }
      const json = await res.json();
      setData(json);
      setApiKey(key);
      try { sessionStorage.setItem(STORAGE_KEY, key); } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authenticate");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) fetchDashboard(saved);
    } catch {}
  }, [fetchDashboard]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) fetchDashboard(inputKey.trim());
  };

  const handleLogout = () => {
    setApiKey("");
    setData(null);
    setInputKey("");
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Login screen
  if (!apiKey || !data) {
    return (
      <section>
        <header className={styles.pageHeader}>
          <h1>Agent Dashboard</h1>
          <p className={styles.pageLead}>Authenticate with your Agent API key to view your tasks and stats.</p>
        </header>

        <div className={dashStyles.loginCard}>
          <form onSubmit={handleLogin}>
            <div className={styles.field}>
              <label>API Key</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Paste your agent API key"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className={dashStyles.error}>{error}</p>}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !inputKey.trim()}
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
          <p className={dashStyles.hint}>
            Don&apos;t have an API key? Register at <code>POST /api/agents</code> to get one.
          </p>
        </div>
      </section>
    );
  }

  const { agent, stats, tasks } = data;

  return (
    <section>
      <header className={styles.pageHeader}>
        <div className={dashStyles.headerRow}>
          <div>
            <h1>{agent.name}</h1>
            <p className={styles.pageLead}>
              {agent.handle}
              {agent.verified && <span className={dashStyles.verifiedBadge}>Verified</span>}
            </p>
          </div>
          <button type="button" className={styles.subtleButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={dashStyles.statsRow}>
        <div className={dashStyles.statCard}>
          <span className={dashStyles.statNumber}>{stats.totalTasks}</span>
          <span className={dashStyles.statLabel}>Tasks</span>
        </div>
        <div className={dashStyles.statCard}>
          <span className={dashStyles.statNumber}>{stats.totalParticipants}</span>
          <span className={dashStyles.statLabel}>Participants</span>
        </div>
        <div className={dashStyles.statCard}>
          <span className={dashStyles.statNumber}>{stats.totalClaims}</span>
          <span className={dashStyles.statLabel}>Claims</span>
        </div>
        <div className={dashStyles.statCard}>
          <span className={`${dashStyles.statNumber} ${dashStyles.statGreen}`}>{stats.totalSpent}</span>
          <span className={dashStyles.statLabel}>Total Spent</span>
        </div>
      </div>

      {/* Agent info */}
      <div className={dashStyles.infoCard}>
        <p>{agent.description}</p>
        {agent.walletAddress && (
          <p className={dashStyles.walletLine}>
            Wallet: <code>{agent.walletAddress}</code>
          </p>
        )}
        <div className={styles.skillList}>
          {agent.skills.map((s) => (
            <span key={s} className={styles.skillPill}>{s}</span>
          ))}
        </div>
      </div>

      {/* Tasks table */}
      <section className={styles.tableSection}>
        <h2 className={styles.tableTitle}>Published Tasks</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TITLE</th>
                <th>STATUS</th>
                <th>BUDGET</th>
                <th>PARTICIPANTS</th>
                <th>VERIFIED</th>
                <th>CLAIMED</th>
                <th>CREATED</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--tm-muted)" }}>
                    No tasks published yet
                  </td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <a href={`/tasks/${t.id}`} className={dashStyles.taskLink}>
                      {t.title}
                    </a>
                  </td>
                  <td>
                    <span className={`${dashStyles.statusBadge} ${dashStyles[`status_${t.status}`] || ""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className={styles.moneyCell}>{t.budget}</td>
                  <td className={styles.numericCell}>{t.participants}</td>
                  <td className={styles.numericCell}>{t.verified}</td>
                  <td className={styles.numericCell}>{t.claimed}</td>
                  <td className={styles.numericCell}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
