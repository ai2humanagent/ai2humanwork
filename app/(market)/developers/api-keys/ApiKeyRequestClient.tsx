"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "../../market.module.css";

type KeyState = "active" | "pending" | "revoked";

type ApiKeyCard = {
  id: string;
  name: string;
  maskedKey: string;
  scopes: string[];
  state: KeyState;
  createdAt: string;
  requests: number;
};

type RequestStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const storageKey = "ai2human.developer.apiKeys.v1";

const scopeOptions = ["Agent API", "LLM Gateway", "x402 Cloud", "Read-only", "IP allowlist"];
const defaultScopes = ["Agent API", "Read-only"];

function createLocalKey(name: string, requestId: string, scopes: string[]): ApiKeyCard {
  return {
    id: requestId,
    name,
    maskedKey: `a2h_live_${requestId.slice(-6)}••••••••`,
    scopes,
    state: "pending",
    createdAt: new Date().toISOString(),
    requests: 0
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function loadStoredKeys(): ApiKeyCard[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ApiKeyRequestClient() {
  const [apiKeyName, setApiKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState(defaultScopes);
  const [statusFilter, setStatusFilter] = useState<"all" | KeyState>("all");
  const [query, setQuery] = useState("");
  const [keys, setKeys] = useState<ApiKeyCard[]>([]);
  const [status, setStatus] = useState<RequestStatus>({ state: "idle" });

  useEffect(() => {
    setKeys(loadStoredKeys());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(keys));
  }, [keys]);

  const visibleKeys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return keys.filter((item) => {
      const matchesState = statusFilter === "all" || item.state === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.maskedKey.toLowerCase().includes(normalizedQuery) ||
        item.scopes.some((scope) => scope.toLowerCase().includes(normalizedQuery));
      return matchesState && matchesQuery;
    });
  }, [keys, query, statusFilter]);

  const canGenerate = apiKeyName.trim().length >= 2 && status.state !== "submitting";

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = apiKeyName.trim();
    if (!name) return;

    setStatus({ state: "submitting" });
    try {
      const response = await fetch("/api/developers/api-key-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          apiKeyName: name,
          scopes: selectedScopes
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          state: "error",
          message: payload.error || "Unable to generate key request."
        });
        return;
      }

      const nextKey = createLocalKey(name, payload.requestId || crypto.randomUUID(), selectedScopes);
      setKeys((current) => [nextKey, ...current]);
      setApiKeyName("");
      setStatus({ state: "success", message: "API key request created. Approval is pending." });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Network request failed."
      });
    }
  }

  function revokeKey(id: string) {
    setKeys((current) => current.map((item) => (item.id === id ? { ...item, state: "revoked" } : item)));
  }

  function removeKey(id: string) {
    setKeys((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className={styles.apiKeysShell}>
      <section className={styles.apiCreatePanel}>
        <div className={styles.apiCreateCopy}>
          <h2>Create API Key</h2>
          <p>Create your API key first, then configure Agent API, LLM Gateway, x402, IP allowlisting, and read-only access.</p>
        </div>

        <div className={styles.apiScopePills} aria-label="API key scopes">
          {scopeOptions.map((scope) => (
            <button
              key={scope}
              type="button"
              className={selectedScopes.includes(scope) ? styles.apiScopePillActive : styles.apiScopePill}
              onClick={() => toggleScope(scope)}
            >
              {scope}
            </button>
          ))}
        </div>

        <form className={styles.apiCreateForm} onSubmit={submit}>
          <label>
            <span>API Key Name *</span>
            <input
              value={apiKeyName}
              onChange={(event) => setApiKeyName(event.target.value)}
              placeholder="e.g., Production Bot, OpenClaw Skill, Trading Script"
            />
          </label>
          <button type="submit" disabled={!canGenerate}>
            {status.state === "submitting" ? "Generating..." : "Generate Key"}
          </button>
        </form>

        {status.state === "error" ? <p className={styles.apiStatusError}>{status.message}</p> : null}
        {status.state === "success" ? <p className={styles.apiStatusSuccess}>{status.message}</p> : null}
      </section>

      <section className={styles.apiKeysListSection}>
        <div className={styles.apiKeysListHeader}>
          <div>
            <h2>
              Your API keys <span>{keys.length} API keys</span>
            </h2>
            <p>Manage access, permissions, and usage settings.</p>
          </div>
        </div>

        <div className={styles.apiKeysToolbar}>
          <label className={styles.apiSearchBox}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="2" />
              <path d="m12.4 12.4 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search API keys" />
          </label>

          <div className={styles.apiFilterGroup}>
            {(["all", "active", "pending", "revoked"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={statusFilter === item ? styles.apiFilterActive : styles.apiFilter}
                onClick={() => setStatusFilter(item)}
              >
                {item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
            <button type="button" className={styles.apiRefreshButton} onClick={() => setKeys(loadStoredKeys())}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {visibleKeys.length > 0 ? (
          <div className={styles.apiKeyGrid}>
            {visibleKeys.map((item) => (
              <article key={item.id} className={styles.apiKeyCard}>
                <div className={styles.apiKeyCardTop}>
                  <h3>{item.name}</h3>
                  <span className={styles[`apiKeyState_${item.state}`]}>{item.state}</span>
                </div>
                <code>{item.maskedKey}</code>
                <div className={styles.apiKeyScopes}>
                  {item.scopes.slice(0, 3).map((scope) => <span key={scope}>{scope}</span>)}
                  {item.scopes.length > 3 ? <span>+{item.scopes.length - 3}</span> : null}
                </div>
                <dl>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Requests</dt>
                    <dd>{item.requests}</dd>
                  </div>
                </dl>
                <div className={styles.apiKeyActions}>
                  <button type="button">View details</button>
                  {item.state !== "revoked" ? (
                    <button type="button" onClick={() => revokeKey(item.id)}>Revoke</button>
                  ) : (
                    <button type="button" onClick={() => removeKey(item.id)}>Remove</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.apiEmptyState}>
            <strong>No API keys yet</strong>
            <span>Create your first key above.</span>
          </div>
        )}
      </section>
    </div>
  );
}
