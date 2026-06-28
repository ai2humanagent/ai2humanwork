"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../../market.module.css";

type RequestStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; requestId: string; persistence?: string }
  | { state: "error"; message: string; errors?: Record<string, string> };

const useCaseOptions = [
  "Reward campaigns",
  "Human proof tasks",
  "B20 proof gateway",
  "x402 paid access",
  "Compliance / RWA checks",
  "Custom agent workflows"
];

const platformOptions = ["OpenClaw", "Bankr", "Claude / Codex", "Custom agent", "Internal backend", "Not sure yet"];
const volumeOptions = ["1-5 campaigns / month", "6-25 campaigns / month", "26-100 campaigns / month", "100+ campaigns / month"];
const budgetOptions = ["Under 100 USDC", "100-1,000 USDC", "1,000-10,000 USDC", "10,000+ USDC"];

const defaultForm = {
  projectName: "",
  contactName: "",
  email: "",
  xHandle: "",
  website: "",
  agentPlatform: "OpenClaw",
  expectedVolume: "1-5 campaigns / month",
  rewardBudget: "100-1,000 USDC",
  useCases: ["Reward campaigns", "Human proof tasks"],
  needsWebhooks: false,
  needsX402: false,
  walletAddress: "",
  notes: "",
  honeypot: ""
};

function fieldError(status: RequestStatus, field: string) {
  return status.state === "error" ? status.errors?.[field] : undefined;
}

export default function ApiKeyRequestClient() {
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState<RequestStatus>({ state: "idle" });

  const readiness = useMemo(() => {
    const required = [
      form.projectName,
      form.contactName,
      form.email,
      form.xHandle,
      form.agentPlatform,
      form.expectedVolume,
      form.rewardBudget
    ].filter(Boolean).length;
    return Math.round((required / 7) * 100);
  }, [form]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleUseCase(value: string) {
    setForm((current) => ({
      ...current,
      useCases: current.useCases.includes(value)
        ? current.useCases.filter((item) => item !== value)
        : [...current.useCases, value]
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ state: "submitting" });
    try {
      const response = await fetch("/api/developers/api-key-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          state: "error",
          message: payload.error || "Unable to submit request.",
          errors: payload.errors
        });
        return;
      }
      setStatus({
        state: "success",
        requestId: payload.requestId,
        persistence: payload.persistence
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Network request failed."
      });
    }
  }

  return (
    <div className={styles.devApiWorkspace}>
      <section className={styles.devApplicationPanel} id="request">
        <div className={styles.devApplicationHeader}>
          <div>
            <span>Developer access</span>
            <h2>Request an AI2Human Agent API key</h2>
            <p>
              Tell us what your agent needs to create. We review project identity, reward flow, and risk level
              before issuing a scoped key.
            </p>
          </div>
          <div className={styles.devReadinessMeter} aria-label={`Application readiness ${readiness}%`}>
            <strong>{readiness}%</strong>
            <span>ready</span>
          </div>
        </div>

        <form className={styles.devAccessForm} onSubmit={submit}>
          <input
            className={styles.devHoneypot}
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={(event) => update("honeypot", event.target.value)}
          />

          <div className={styles.devFormGrid}>
            <label className={styles.devField}>
              <span>Project name</span>
              <input value={form.projectName} onChange={(event) => update("projectName", event.target.value)} placeholder="Nova Agent Labs" />
              {fieldError(status, "projectName") ? <em>{fieldError(status, "projectName")}</em> : null}
            </label>
            <label className={styles.devField}>
              <span>Contact name</span>
              <input value={form.contactName} onChange={(event) => update("contactName", event.target.value)} placeholder="Richard" />
              {fieldError(status, "contactName") ? <em>{fieldError(status, "contactName")}</em> : null}
            </label>
            <label className={styles.devField}>
              <span>Work email</span>
              <input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="team@example.com" inputMode="email" />
              {fieldError(status, "email") ? <em>{fieldError(status, "email")}</em> : null}
            </label>
            <label className={styles.devField}>
              <span>Project X handle</span>
              <input value={form.xHandle} onChange={(event) => update("xHandle", event.target.value)} placeholder="@yourproject" />
              {fieldError(status, "xHandle") ? <em>{fieldError(status, "xHandle")}</em> : null}
            </label>
            <label className={styles.devField}>
              <span>Website</span>
              <input value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://yourproject.xyz" inputMode="url" />
              {fieldError(status, "website") ? <em>{fieldError(status, "website")}</em> : null}
            </label>
            <label className={styles.devField}>
              <span>Admin / treasury wallet</span>
              <input value={form.walletAddress} onChange={(event) => update("walletAddress", event.target.value)} placeholder="0x..." />
            </label>
          </div>

          <div className={styles.devFormGrid}>
            <label className={styles.devField}>
              <span>Agent platform</span>
              <select value={form.agentPlatform} onChange={(event) => update("agentPlatform", event.target.value)}>
                {platformOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className={styles.devField}>
              <span>Expected volume</span>
              <select value={form.expectedVolume} onChange={(event) => update("expectedVolume", event.target.value)}>
                {volumeOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className={styles.devField}>
              <span>Reward budget</span>
              <select value={form.rewardBudget} onChange={(event) => update("rewardBudget", event.target.value)}>
                {budgetOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className={styles.devUseCaseGroup}>
            <div>
              <span>Use cases</span>
              <p>Select the surfaces your key should unlock.</p>
            </div>
            <div className={styles.devUseCaseGrid}>
              {useCaseOptions.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={form.useCases.includes(item) ? styles.devUseCaseActive : styles.devUseCase}
                  onClick={() => toggleUseCase(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {fieldError(status, "useCases") ? <em>{fieldError(status, "useCases")}</em> : null}
          </div>

          <div className={styles.devSwitchGrid}>
            <label>
              <input type="checkbox" checked={form.needsWebhooks} onChange={(event) => update("needsWebhooks", event.target.checked)} />
              <span>We need webhook callbacks for proof, review, funding, or settlement events.</span>
            </label>
            <label>
              <input type="checkbox" checked={form.needsX402} onChange={(event) => update("needsX402", event.target.checked)} />
              <span>We want to test x402 paid access for API calls or proof bundles.</span>
            </label>
          </div>

          <label className={styles.devField}>
            <span>What will your agent create?</span>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Example: Create holder-gated reward campaigns, collect X proof, fund managed PrizePool campaigns, and publish only after admin confirmation."
            />
          </label>

          {status.state === "error" ? (
            <div className={styles.devFormAlert} role="alert">
              <strong>Request needs attention</strong>
              <span>{status.message}</span>
            </div>
          ) : null}

          {status.state === "success" ? (
            <div className={styles.devSuccessPanel} role="status">
              <span>Request received</span>
              <strong>{status.requestId}</strong>
              <p>
                We will review the project and issue a scoped key manually. Once approved, keep the key as an
                agent secret and pass it as <code>x-agent-api-key</code>.
              </p>
            </div>
          ) : null}

          <div className={styles.devFormFooter}>
            <button className={styles.devSubmitButton} type="submit" disabled={status.state === "submitting"}>
              {status.state === "submitting" ? "Submitting request..." : "Submit API key request"}
            </button>
            <Link href="/agent/skill-console">Test with demo console first</Link>
          </div>
        </form>
      </section>

      <aside className={styles.devReviewPanel} aria-label="API key review status">
        <div className={styles.devReviewCard}>
          <span>Review pipeline</span>
          <ol>
            <li><strong>Received</strong><small>Project and contact details are captured.</small></li>
            <li><strong>Risk check</strong><small>We review campaign type, funding flow, and abuse surface.</small></li>
            <li><strong>Scoped key</strong><small>Approved projects receive a key for preview and draft APIs.</small></li>
            <li><strong>Publish gate</strong><small>Campaigns still require confirmation before going live.</small></li>
          </ol>
        </div>

        <div className={styles.devReviewCard}>
          <span>Header format</span>
          <pre>{`x-agent-api-key: $AI2HUMAN_AGENT_KEY
x-agent-id: optional_agent_id`}</pre>
        </div>
      </aside>
    </div>
  );
}
