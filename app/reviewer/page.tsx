"use client";

import { useEffect, useMemo, useState } from "react";
import { getTaskVerificationStatus } from "../lib/officialCampaignTasks.js";
import { getTaskAgentArchitecture } from "../lib/agentArchitecture.js";

type EvidenceItem = {
  id: string;
  by: "ai" | "human" | "system";
  type: "log" | "note" | "photo";
  content: string;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  acceptance: string;
  campaign?: {
    requesterName: string;
    requesterHandle?: string;
    platform: "x";
    action: "post" | "quote" | "reply" | "repost";
    targetUrl?: string;
    proofPhrase?: string;
    brief?: string;
    proofRequirements: string[];
    verificationChecks: string[];
  };
  status:
    | "created"
    | "ai_running"
    | "ai_failed"
    | "ai_done"
    | "human_assigned"
    | "human_done"
    | "verified"
    | "paid";
  createdAt: string;
  updatedAt: string;
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
  evidence: EvidenceItem[];
};

type Metrics = {
  total: number;
  created: number;
  inProgress: number;
  verified: number;
  paid: number;
  failed: number;
  failRate: number;
};

type Payment = {
  id: string;
  taskId?: string;
  fallbackOrderId?: string;
  amount: string;
  receiver: string;
  receiverAddress?: string;
  payerAddress?: string;
  method: "mock_x402" | "xlayer_erc20" | "x402_exact";
  status: "paid";
  source?: "task" | "fallback_order" | "x402_access";
  network?: "xlayer-mainnet" | "xlayer-testnet" | "xlayer-custom";
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
};

type HumanDirectoryRow = {
  human: {
    id: string;
    name: string;
    city: string;
    country: string;
    verified: boolean;
    skills: string[];
  };
  serviceCount: number;
  categories: string[];
  walletAddress?: string;
  minPrice: number;
};

const statusLabels: Record<Task["status"], string> = {
  created: "Created",
  ai_running: "AI Running",
  ai_failed: "AI Failed",
  ai_done: "AI Done",
  human_assigned: "Human Assigned",
  human_done: "Human Done",
  verified: "Verified",
  paid: "Paid"
};

const flowSteps = ["Task", "AI", "Human", "Verify", "Settle"];
const agentStateStyles: Record<string, string> = {
  waiting: "status-created",
  active: "status-ai_running",
  blocked: "status-ai_failed",
  ready: "status-human_done",
  done: "status-verified"
};

const getStageIndex = (status: Task["status"]) => {
  switch (status) {
    case "created":
      return 0;
    case "ai_running":
    case "ai_done":
    case "ai_failed":
      return 1;
    case "human_assigned":
    case "human_done":
      return 2;
    case "verified":
      return 3;
    case "paid":
      return 4;
    default:
      return 0;
  }
};

function tokenHeaders(adminToken: string, includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (adminToken.trim()) headers["x-admin-token"] = adminToken.trim();
  return headers;
}

export default function ReviewerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("Need more evidence");
  const [humanName, setHumanName] = useState("Demo Human");
  const [humanWalletAddress, setHumanWalletAddress] = useState("");
  const [selectedHumanId, setSelectedHumanId] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [humans, setHumans] = useState<HumanDirectoryRow[]>([]);

  const loadTasks = async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const data = (await res.json()) as Task[];
    data.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    setTasks(data);
    const metricsRes = await fetch("/api/metrics", { cache: "no-store" });
    if (metricsRes.ok) {
      const metricsPayload = (await metricsRes.json()) as Metrics;
      setMetrics(metricsPayload);
    }
    const paymentsRes = await fetch("/api/payments?limit=12", { cache: "no-store" });
    if (paymentsRes.ok) {
      const paymentPayload = (await paymentsRes.json()) as Payment[];
      setPayments(paymentPayload);
    }
    setLoading(false);
  };

  const loadHumans = async () => {
    const res = await fetch("/api/humans?sort=top_rated", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      rows?: HumanDirectoryRow[];
    };
    setHumans(payload.rows || []);
  };

  useEffect(() => {
    const savedToken = window.localStorage.getItem("admin_api_token") || "";
    setAdminToken(savedToken);
    loadTasks();
    loadHumans();
    const timer = setInterval(() => {
      loadTasks();
      loadHumans();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin_api_token", adminToken);
  }, [adminToken]);

  useEffect(() => {
    if (!tasks.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !tasks.some((task) => task.id === selectedId)) {
      const pending = tasks.find((task) => ["ai_done", "human_done"].includes(task.status));
      setSelectedId(pending?.id ?? tasks[0].id);
    }
  }, [tasks, selectedId]);

  const kpis = useMemo(() => {
    return {
      pendingReview: tasks.filter((task) => task.status === "ai_done" || task.status === "human_done")
        .length,
      readyToSettle: tasks.filter((task) => task.status === "verified").length,
      blocked: tasks.filter((task) => task.status === "ai_failed").length
    };
  }, [tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;
  const payoutReadyHumans = humans.filter((row) => row.walletAddress);
  const verificationStatus = useMemo(
    () =>
      selectedTask
        ? getTaskVerificationStatus(selectedTask)
        : { ok: true, checks: [], missing: [] as string[] },
    [selectedTask]
  );
  const agentArchitecture = useMemo(
    () => (selectedTask ? getTaskAgentArchitecture(selectedTask) : []),
    [selectedTask]
  );

  function applySelectedHuman(humanId: string) {
    setSelectedHumanId(humanId);
    const found = humans.find((row) => row.human.id === humanId);
    if (!found) return;
    setHumanName(found.human.name);
    setHumanWalletAddress(found.walletAddress || "");
  }

  const runAction = async (
    key: string,
    path: string,
    options?: {
      method?: "POST";
      body?: Record<string, unknown>;
    }
  ) => {
    if (!selectedTask) return;
    setWorking(key);
    setError("");
    setMessage("");
    try {
      const res = await fetch(path, {
        method: options?.method ?? "POST",
        headers: tokenHeaders(adminToken, Boolean(options?.body)),
        body: options?.body ? JSON.stringify(options.body) : undefined
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed");
      await loadTasks();
      setMessage("Action completed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="page mvp reviewer-page">
      <header className="market-hero">
        <div>
          <p className="eyebrow">Reviewer Console</p>
          <h1>Approve, reject, settle — with strict state control</h1>
          <p className="mvp-lead">
            Admin-only actions for trusted closure. This page is the operational layer behind the
            live demo.
          </p>
          <div className="mvp-steps">
            {flowSteps.map((step, index) => (
              <div key={step} className="step-card">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="market-kpis">
          <div>
            <span>Pending review</span>
            <strong>{kpis.pendingReview}</strong>
          </div>
          <div>
            <span>Ready to settle</span>
            <strong>{kpis.readyToSettle}</strong>
          </div>
          <div>
            <span>Blocked</span>
            <strong>{kpis.blocked}</strong>
          </div>
        </div>
      </header>

      <section className="market-card reviewer-metrics">
        <div className="block-header">
          <div>
            <h2>Public metrics</h2>
            <p className="mvp-muted">Operational visibility for closure health.</p>
          </div>
        </div>
        <div className="reviewer-metric-grid">
          <div>
            <span>Created</span>
            <strong>{metrics?.created ?? 0}</strong>
          </div>
          <div>
            <span>In progress</span>
            <strong>{metrics?.inProgress ?? 0}</strong>
          </div>
          <div>
            <span>Verified</span>
            <strong>{metrics?.verified ?? 0}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{metrics?.paid ?? 0}</strong>
          </div>
          <div>
            <span>Fail rate</span>
            <strong>{metrics ? `${metrics.failRate}%` : "0%"}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{metrics?.total ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="market-grid">
        <div className="market-card feed">
          <div className="block-header">
            <div>
              <h2>Review queue</h2>
              <p className="mvp-muted">Tasks sorted by latest update.</p>
            </div>
          </div>

          {loading && <div className="market-empty">Loading tasks...</div>}

          {!loading && !tasks.length && <div className="market-empty">No tasks found.</div>}

          <div className="reviewer-queue">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`reviewer-queue-item ${selectedId === task.id ? "active" : ""}`}
                onClick={() => setSelectedId(task.id)}
              >
                <div className="task-head">
                  <div>
                    <h3>{task.title}</h3>
                    <p>
                      {task.budget} · {task.deadline}
                    </p>
                  </div>
                  <span className={`status-pill status-${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                <p className="mvp-muted">Updated: {new Date(task.updatedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="market-card detail">
          <div className="block-header">
            <div>
              <h2>Task actions</h2>
              <p className="mvp-muted">Only valid transitions are accepted by API.</p>
            </div>
          </div>

          <label className="reviewer-label" htmlFor="admin-token">
            Admin token
          </label>
          <input
            id="admin-token"
            className="mvp-input"
            type="password"
            placeholder="x-admin-token"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
          />

          {error && <p className="reviewer-error">{error}</p>}
          {message && <p className="reviewer-success">{message}</p>}

          {!selectedTask && <div className="market-empty">Select a task from the queue.</div>}

          {selectedTask && (
            <div className="detail-body">
              <div className="detail-head">
                <div>
                  <h3>{selectedTask.title}</h3>
                  <p>
                    {selectedTask.budget} · {selectedTask.deadline}
                  </p>
                </div>
                <span className={`status-pill status-${selectedTask.status}`}>
                  {statusLabels[selectedTask.status]}
                </span>
              </div>

              <div className="mvp-stepper">
                {flowSteps.map((step, index) => (
                  <div
                    key={step}
                    className={`step ${index <= getStageIndex(selectedTask.status) ? "done" : ""} ${
                      index === getStageIndex(selectedTask.status) ? "active" : ""
                    }`}
                  >
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>

              <div className="mvp-evidence">
                <h4>Multi-agent collaboration</h4>
                <div className="reviewer-metric-grid">
                  {agentArchitecture.map((role) => (
                    <div key={role.id}>
                      <span>{role.kind === "human" ? "human" : "agent"}</span>
                      <strong>{role.title}</strong>
                      <span
                        className={`status-pill ${agentStateStyles[role.state] || "status-created"}`}
                      >
                        {role.state}
                      </span>
                      <p className="mvp-muted">{role.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mvp-evidence">
                <h4>Task brief</h4>
                <div className="mvp-evidence-item">
                  <div className="evidence-meta">
                    <span>acceptance</span>
                    <span>{selectedTask.campaign?.platform || "general"}</span>
                  </div>
                  <p>{selectedTask.acceptance}</p>
                  {selectedTask.campaign?.brief && <p className="mvp-muted">{selectedTask.campaign.brief}</p>}
                  {selectedTask.campaign?.requesterName && (
                    <p className="mvp-muted">
                      Requested by {selectedTask.campaign.requesterName}
                      {selectedTask.campaign.requesterHandle
                        ? ` (${selectedTask.campaign.requesterHandle})`
                        : ""}
                    </p>
                  )}
                  {selectedTask.campaign?.targetUrl && (
                    <p className="mvp-muted">
                      Target post:{" "}
                      <a href={selectedTask.campaign.targetUrl} target="_blank" rel="noreferrer">
                        {selectedTask.campaign.targetUrl}
                      </a>
                    </p>
                  )}
                  {selectedTask.campaign?.proofPhrase && (
                    <p className="mvp-muted">
                      Required phrase: <strong>{selectedTask.campaign.proofPhrase}</strong>
                    </p>
                  )}
                </div>
              </div>

              {selectedTask.campaign?.proofRequirements?.length ? (
                <div className="mvp-evidence">
                  <h4>Proof requirements</h4>
                  {selectedTask.campaign.proofRequirements.map((item) => (
                    <div key={item} className="mvp-evidence-item">
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedTask.campaign?.verificationChecks?.length ? (
                <div className="mvp-evidence">
                  <h4>Reviewer checklist</h4>
                  {selectedTask.campaign.verificationChecks.map((item) => {
                    const matched = verificationStatus.checks.find(
                      (check: { label: string; passed: boolean }) => check.label === item
                    );
                    return (
                      <div key={item} className="mvp-evidence-item">
                        <div className="evidence-meta">
                          <span>check</span>
                          <span>{matched?.passed ? "passed" : "missing"}</span>
                        </div>
                        <p>{item}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="mvp-evidence">
                <h4>Settlement target</h4>
                <div className="mvp-evidence-item">
                  <div className="evidence-meta">
                    <span>receiver</span>
                    <span>{selectedTask.assignee?.type || "unassigned"}</span>
                  </div>
                  <p>{selectedTask.assignee?.name || "No executor assigned yet."}</p>
                  {selectedTask.assignee?.walletAddress && (
                    <p className="mvp-muted">{selectedTask.assignee.walletAddress}</p>
                  )}
                  {!selectedTask.assignee?.walletAddress && (
                    <p className="mvp-muted">
                      Select an operator with a connected Privy wallet to auto-route settlement.
                    </p>
                  )}
                </div>
              </div>

              <div className="reviewer-actions">
                {(selectedTask.status === "ai_done" || selectedTask.status === "human_done") && (
                  <button
                    className="button"
                    disabled={Boolean(working) || Boolean(selectedTask.campaign && !verificationStatus.ok)}
                    onClick={() => runAction("verify", `/api/tasks/${selectedTask.id}/verify`)}
                  >
                    {working === "verify" ? "Approving..." : "Approve"}
                  </button>
                )}

                {selectedTask.campaign && !verificationStatus.ok && (
                  <p className="mvp-muted">
                    Verification is blocked until all required evidence checks pass.
                  </p>
                )}

                {selectedTask.status === "verified" && (
                  <button
                    className="button buttonPrimary"
                    disabled={Boolean(working)}
                    onClick={() => runAction("settle", `/api/tasks/${selectedTask.id}/settle`)}
                  >
                    {working === "settle" ? "Settling..." : "Settle"}
                  </button>
                )}

                {selectedTask.status === "ai_failed" && (
                  <>
                    <select
                      className="mvp-input"
                      value={selectedHumanId}
                      onChange={(event) => applySelectedHuman(event.target.value)}
                    >
                      <option value="">Select operator with wallet</option>
                      {payoutReadyHumans.map((row) => (
                        <option key={row.human.id} value={row.human.id}>
                          {row.human.name} · {row.human.city} · {row.walletAddress}
                        </option>
                      ))}
                    </select>
                    <p className="mvp-muted">
                      {payoutReadyHumans.length} operator profiles currently have a connected Privy wallet.
                    </p>
                    <input
                      className="mvp-input"
                      value={humanName}
                      onChange={(event) => {
                        setSelectedHumanId("");
                        setHumanName(event.target.value);
                      }}
                      placeholder="Human operator name"
                    />
                    <input
                      className="mvp-input"
                      value={humanWalletAddress}
                      onChange={(event) => {
                        setSelectedHumanId("");
                        setHumanWalletAddress(event.target.value);
                      }}
                      placeholder="Human operator wallet (optional)"
                    />
                    <button
                      className="button"
                      disabled={Boolean(working)}
                      onClick={() =>
                        runAction("assign", `/api/tasks/${selectedTask.id}/human`, {
                          body: {
                            name: humanName || "Demo Human",
                            walletAddress: humanWalletAddress || undefined
                          }
                        })
                      }
                    >
                      {working === "assign" ? "Assigning..." : "Assign Human"}
                    </button>
                  </>
                )}

                {selectedTask.status !== "paid" && (
                  <>
                    <input
                      className="mvp-input"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Reject reason"
                    />
                    <button
                      className="button"
                      disabled={Boolean(working)}
                      onClick={() =>
                        runAction("reject", `/api/tasks/${selectedTask.id}/reject`, {
                          body: { reason: rejectReason || "Rejected by reviewer" }
                        })
                      }
                    >
                      {working === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </>
                )}
              </div>

              <div className="mvp-evidence">
                <h4>Evidence timeline</h4>
                {selectedTask.evidence.length === 0 && (
                  <p className="mvp-muted">No evidence available.</p>
                )}
                {selectedTask.evidence.map((item) => (
                  <div key={item.id} className="mvp-evidence-item">
                    <div className="evidence-meta">
                      <span>{item.by}</span>
                      <span>{item.type}</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="market-card reviewer-ledger">
        <div className="block-header">
          <div>
            <h2>Settlement ledger</h2>
            <p className="mvp-muted">
              Latest settlement records, including X Layer transaction proof when configured.
            </p>
          </div>
        </div>
        {!payments.length && <div className="market-empty">No settlements yet.</div>}
        {!!payments.length && (
          <div className="reviewer-ledger-list">
            {payments.map((payment) => (
              <div key={payment.id} className="reviewer-ledger-item">
                <div>
                  <strong>{payment.amount}</strong>
                  <p className="mvp-muted">
                    {payment.receiver} · {payment.tokenSymbol || "USDC"} · {payment.method}
                  </p>
                  {payment.payerAddress && (
                    <p className="mvp-muted">payer {payment.payerAddress}</p>
                  )}
                  {payment.receiverAddress && (
                    <p className="mvp-muted">to {payment.receiverAddress}</p>
                  )}
                  {payment.txHash && payment.explorerUrl && (
                    <p className="mvp-muted">
                      <a href={payment.explorerUrl} target="_blank" rel="noreferrer">
                        {payment.txHash.slice(0, 10)}...{payment.txHash.slice(-6)}
                      </a>
                    </p>
                  )}
                </div>
                <div className="reviewer-ledger-meta">
                  <span>{(payment.taskId || payment.fallbackOrderId || payment.id).slice(0, 8)}</span>
                  <span>{payment.source || "task"}</span>
                  <span>{payment.network || "demo"}</span>
                  <span>{new Date(payment.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
