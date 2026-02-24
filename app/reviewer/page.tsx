"use client";

import { useEffect, useMemo, useState } from "react";

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
  };
  evidence: EvidenceItem[];
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

  const loadTasks = async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const data = (await res.json()) as Task[];
    data.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    const savedToken = window.localStorage.getItem("admin_api_token") || "";
    setAdminToken(savedToken);
    loadTasks();
    const timer = setInterval(loadTasks, 5000);
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

              <div className="reviewer-actions">
                {(selectedTask.status === "ai_done" || selectedTask.status === "human_done") && (
                  <button
                    className="button"
                    disabled={Boolean(working)}
                    onClick={() => runAction("verify", `/api/tasks/${selectedTask.id}/verify`)}
                  >
                    {working === "verify" ? "Approving..." : "Approve"}
                  </button>
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
                    <input
                      className="mvp-input"
                      value={humanName}
                      onChange={(event) => setHumanName(event.target.value)}
                      placeholder="Human operator name"
                    />
                    <button
                      className="button"
                      disabled={Boolean(working)}
                      onClick={() =>
                        runAction("assign", `/api/tasks/${selectedTask.id}/human`, {
                          body: { name: humanName || "Demo Human" }
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
    </div>
  );
}

