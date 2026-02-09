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

const demoTemplate = {
  title: "On-site inventory check",
  budget: "$120",
  deadline: "4h",
  acceptance: "Photos + timestamp"
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

const formatMoney = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : null;
};

const pick = (items: string[], index: number) =>
  items[index % items.length];

const taskLocations = [
  "Austin",
  "Berlin",
  "Tokyo",
  "Seoul",
  "Singapore",
  "Dubai",
  "London",
  "NYC"
];

const taskTypes = [
  "On-site verification",
  "Price monitoring",
  "Compliance scan",
  "Pickup & delivery",
  "Data scraping",
  "Cross-app sync"
];

const urgencyLevels = ["Urgent", "High", "Normal"];

const statusFilters = [
  { value: "all", label: "All status" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "paid", label: "Paid" }
];

const MAX_VISIBLE_TASKS = 12;

export default function MVPPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [demoRunningId, setDemoRunningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoDemoDone, setAutoDemoDone] = useState(false);
  const [marketTab, setMarketTab] = useState<"ai" | "human">("ai");
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable"
  );
  const [form, setForm] = useState({
    title: "",
    budget: "",
    deadline: "",
    acceptance: ""
  });
  const [humanName, setHumanName] = useState<Record<string, string>>({});
  const [evidenceNote, setEvidenceNote] = useState<Record<string, string>>({});
  const [aiNote, setAiNote] = useState<Record<string, string>>({});
  const [evidenceType, setEvidenceType] = useState<
    Record<string, "note" | "photo">
  >({});
  const [evidenceUrl, setEvidenceUrl] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({
    location: "all",
    type: "all",
    urgency: "all",
    budgetMin: "",
    budgetMax: "",
    sort: "recent",
    status: "all"
  });

  const stats = useMemo(() => {
    const total = tasks.length;
    const paid = tasks.filter((task) => task.status === "paid").length;
    const running = tasks.filter((task) =>
      ["ai_running", "human_assigned"].includes(task.status)
    ).length;
    return { total, paid, running };
  }, [tasks]);

  const loadTasks = async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const data = (await res.json()) as Task[];
    setTasks(data);
  };

  const seedTasks = async () => {
    setSeeding(true);
    try {
      await fetch("/api/tasks/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 12 })
      });
      await loadTasks();
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (autoDemoDone) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "1") return;
    const run = async () => {
      const created = await createTask(demoTemplate);
      if (created) {
        setSelectedId(created.id);
        await runFullDemo(created);
      }
      setAutoDemoDone(true);
    };
    run();
  }, [autoDemoDone]);

  useEffect(() => {
    if (!tasks.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !tasks.some((task) => task.id === selectedId)) {
      setSelectedId(tasks[0].id);
    }
  }, [tasks, selectedId]);

  const selectedTask = tasks.find((task) => task.id === selectedId) || null;

  const createTask = async (payload?: typeof form) => {
    const data = payload ?? form;
    if (!data.title.trim()) {
      return null;
    }
    setLoading(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const created = (await res.json()) as Task;
    setForm({ title: "", budget: "", deadline: "", acceptance: "" });
    await loadTasks();
    setLoading(false);
    return created;
  };

  const submitTask = async (payload?: typeof form) => {
    await createTask(payload);
  };

  const runAi = async (id: string, outcome: "success" | "fail") => {
    const note = aiNote[id]?.trim() || "Auto run";
    await fetch(`/api/tasks/${id}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note })
    });
    setAiNote((prev) => ({ ...prev, [id]: "" }));
    await loadTasks();
  };

  const assignHuman = async (id: string, name?: string) => {
    await fetch(`/api/tasks/${id}/human`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || humanName[id] || "Demo Human" })
    });
    await loadTasks();
  };

  const submitEvidence = async (id: string) => {
    const type = evidenceType[id] || "note";
    await fetch(`/api/tasks/${id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        by: "human",
        type,
        note: evidenceNote[id] || "Photo + timestamp uploaded",
        url: evidenceUrl[id] || ""
      })
    });
    setEvidenceNote((prev) => ({ ...prev, [id]: "" }));
    setEvidenceUrl((prev) => ({ ...prev, [id]: "" }));
    await loadTasks();
  };

  const verifyTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/verify`, { method: "POST" });
    await loadTasks();
  };

  const rejectTask = async (id: string) => {
    const reason = rejectReason[id] || "Rejected by reviewer";
    await fetch(`/api/tasks/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    setRejectReason((prev) => ({ ...prev, [id]: "" }));
    await loadTasks();
  };

  const settleTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/settle`, { method: "POST" });
    await loadTasks();
  };

  const runFullDemo = async (task: Task) => {
    if (demoRunningId) {
      return;
    }
    setDemoRunningId(task.id);
    try {
      await runAi(task.id, "fail");
      await assignHuman(task.id);
      await submitEvidence(task.id);
      await verifyTask(task.id);
      await settleTask(task.id);
    } finally {
      setDemoRunningId(null);
    }
  };

  const getNextAction = (task: Task) => {
    switch (task.status) {
      case "created":
        return { label: "Run AI (fail to trigger human)", action: () => runAi(task.id, "fail") };
      case "ai_failed":
        return { label: "Assign human", action: () => assignHuman(task.id) };
      case "human_assigned":
        return { label: "Submit evidence", action: () => submitEvidence(task.id) };
      case "human_done":
      case "ai_done":
        return { label: "Verify", action: () => verifyTask(task.id) };
      case "verified":
        return { label: "Settle", action: () => settleTask(task.id) };
      case "paid":
        return { label: "Done", action: null };
      default:
        return { label: "Start", action: null };
    }
  };

  const enrichedTasks = useMemo(() => {
    return tasks.map((task, index) => {
      const budgetValue = formatMoney(task.budget) ?? 0;
      return {
        ...task,
        budgetValue,
        location: pick(taskLocations, index),
        type: pick(taskTypes, index),
        urgency: pick(urgencyLevels, index),
        avatarSeed: (index % 6) + 1
      };
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...enrichedTasks];
    if (filters.location !== "all") {
      result = result.filter((task) => task.location === filters.location);
    }
    if (filters.type !== "all") {
      result = result.filter((task) => task.type === filters.type);
    }
    if (filters.urgency !== "all") {
      result = result.filter((task) => task.urgency === filters.urgency);
    }
    if (filters.status !== "all") {
      if (filters.status === "open") {
        result = result.filter((task) =>
          ["created", "ai_running"].includes(task.status)
        );
      }
      if (filters.status === "assigned") {
        result = result.filter((task) => task.status === "human_assigned");
      }
      if (filters.status === "paid") {
        result = result.filter((task) => task.status === "paid");
      }
    }
    const min = formatMoney(filters.budgetMin);
    const max = formatMoney(filters.budgetMax);
    if (min !== null) {
      result = result.filter((task) => task.budgetValue >= min);
    }
    if (max !== null) {
      result = result.filter((task) => task.budgetValue <= max);
    }
    switch (filters.sort) {
      case "high":
        result.sort((a, b) => b.budgetValue - a.budgetValue);
        break;
      case "urgent":
        result.sort((a, b) =>
          urgencyLevels.indexOf(a.urgency) - urgencyLevels.indexOf(b.urgency)
        );
        break;
      default:
        break;
    }
    if (marketTab === "human") {
      result = result.filter((task) =>
        ["ai_failed", "human_assigned", "human_done"].includes(task.status)
      );
    }
    return result;
  }, [enrichedTasks, filters, marketTab]);

  const visibleTasks = useMemo(
    () => filteredTasks.slice(0, MAX_VISIBLE_TASKS),
    [filteredTasks]
  );

  const humanPool = useMemo(
    () => [
      {
        name: "Alex Chen",
        location: "Austin",
        rate: "$55/hr",
        tags: ["verification", "pickup", "photo"],
        available: true
      },
      {
        name: "Maya Li",
        location: "Shanghai",
        rate: "$42/hr",
        tags: ["onsite", "timestamp", "delivery"],
        available: true
      },
      {
        name: "Ryo Tanaka",
        location: "Tokyo",
        rate: "$68/hr",
        tags: ["research", "interview", "report"],
        available: false
      },
      {
        name: "Samira K",
        location: "Dubai",
        rate: "$75/hr",
        tags: ["signing", "verification", "rush"],
        available: true
      },
      {
        name: "Ben Hart",
        location: "Berlin",
        rate: "$48/hr",
        tags: ["pickup", "errands", "proof"],
        available: true
      },
      {
        name: "Nina Zhou",
        location: "Singapore",
        rate: "$62/hr",
        tags: ["photo", "retail", "audit"],
        available: true
      }
    ],
    []
  );

  const scrollToPost = () => {
    document.getElementById("post-task")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="page mvp">
      <header className="market-hero">
        <div>
          <p className="eyebrow">Live Demo</p>
          <h1>Human ↔ AI · Closed-Loop Work Demo</h1>
          <p className="mvp-lead">
            A live demo of the loop: post a task → AI runs → humans step in → verify → settle.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => submitTask(demoTemplate)}>
              Create sample task
            </button>
            <button className="btn btn-outline" onClick={scrollToPost}>
              Post a task
            </button>
          </div>
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
            <span>Total tasks</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>In progress</span>
            <strong>{stats.running}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{stats.paid}</strong>
          </div>
        </div>
      </header>

      <section className="market-grid">
          <div id="post-task" className="market-card">
            <div className="block-header">
              <div>
                <h2>Post a task</h2>
                <p className="mvp-muted">Enter the market queue and let AI bid.</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setForm(demoTemplate)}>
                Fill sample
              </button>
            </div>
          <form
            className="mvp-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitTask();
            }}
          >
            <input
              className="mvp-input"
              placeholder="Task title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="Budget (e.g. $200)"
              value={form.budget}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, budget: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="Deadline"
              value={form.deadline}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, deadline: event.target.value }))
              }
            />
            <textarea
              className="mvp-textarea"
              placeholder="Acceptance criteria"
              value={form.acceptance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, acceptance: event.target.value }))
              }
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Post task"}
            </button>
          </form>
        </div>

        <div className="market-card feed">
          <div id="market" className="block-header">
            <div>
              <h2>Task market</h2>
              <p className="mvp-muted">Click a card to view details.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={seedTasks} disabled={seeding}>
                {seeding ? "Generating..." : "Generate mock"}
              </button>
              <button className="btn btn-ghost" onClick={loadTasks}>
                Refresh
              </button>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${marketTab === "ai" ? "active" : ""}`}
              onClick={() => setMarketTab("ai")}
            >
              Hire AI
            </button>
            <button
              className={`tab ${marketTab === "human" ? "active" : ""}`}
              onClick={() => setMarketTab("human")}
            >
              AI hires humans
            </button>
            <div className="density">
              <span>Density</span>
              <button
                className={`density-btn ${density === "compact" ? "active" : ""}`}
                onClick={() => setDensity("compact")}
              >
                Compact
              </button>
              <button
                className={`density-btn ${density === "comfortable" ? "active" : ""}`}
                onClick={() => setDensity("comfortable")}
              >
                Comfortable
              </button>
            </div>
          </div>

          <div className="filters">
            <select
              value={filters.location}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, location: event.target.value }))
              }
            >
              <option value="all">All locations</option>
              {taskLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              <option value="all">All types</option>
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={filters.urgency}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, urgency: event.target.value }))
              }
            >
              <option value="all">All urgency</option>
              {urgencyLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <input
              className="mvp-input"
              placeholder="Min budget"
              value={filters.budgetMin}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, budgetMin: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="Max budget"
              value={filters.budgetMax}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, budgetMax: event.target.value }))
              }
            />
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, sort: event.target.value }))
              }
            >
              <option value="recent">Recent</option>
              <option value="high">High budget</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {visibleTasks.length === 0 && (
            <div className="market-empty">No matching tasks.</div>
          )}

          <div className={`feed-grid ${density}`}>
            {visibleTasks.map((task) => {
              const isSelected = task.id === selectedId;
              return (
                <article
                  key={task.id}
                  className={`task-card ${isSelected ? "selected" : ""}`}
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
                  <div className="task-tags">
                    <span className="tag-pill">{task.type}</span>
                    <span className="tag-pill">{task.location}</span>
                    <span className="tag-pill ghost">{task.urgency}</span>
                  </div>
                  <div className="task-meta">
                    <span>Acceptance: {task.acceptance}</span>
                    {task.assignee && (
                      <span>
                        Assignee: {task.assignee.name} ({task.assignee.type})
                      </span>
                    )}
                  </div>
                  <div className="task-footer">
                    <div className={`avatar badge-${task.avatarSeed}`} />
                    <span>{statusLabels[task.status]}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="market-detail">
        <div className="market-card detail">
          <div className="block-header">
            <div>
              <h2>Task detail</h2>
              <p className="mvp-muted">Select a task to advance the loop.</p>
            </div>
          </div>
          {!selectedTask && <div className="market-empty">Select a task to view details.</div>}
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
                    className={`step ${
                      index <= getStageIndex(selectedTask.status) ? "done" : ""
                    } ${index === getStageIndex(selectedTask.status) ? "active" : ""}`}
                  >
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
              <div className="detail-meta">
                <span>Acceptance: {selectedTask.acceptance}</span>
                {selectedTask.assignee && (
                  <span>
                    Executor: {selectedTask.assignee.name} ({selectedTask.assignee.type})
                  </span>
                )}
              </div>
              <div className="mvp-action-row">
                <button
                  className="btn btn-primary"
                  disabled={!getNextAction(selectedTask).action || demoRunningId === selectedTask.id}
                  onClick={() => getNextAction(selectedTask).action?.()}
                >
                  {getNextAction(selectedTask).label}
                </button>
                <button
                  className="btn btn-outline"
                  disabled={selectedTask.status === "paid" || demoRunningId === selectedTask.id}
                  onClick={() => runFullDemo(selectedTask)}
                >
                  Run full loop
                </button>
              </div>

              <details className="mvp-details">
                <summary>Manual actions</summary>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="AI log / failure reason"
                    value={aiNote[selectedTask.id] || ""}
                    onChange={(event) =>
                      setAiNote((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="AI log / failure reason"
                    value={aiNote[selectedTask.id] || ""}
                    onChange={(event) =>
                      setAiNote((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="mvp-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => runAi(selectedTask.id, "success")}
                  >
                    AI success
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => runAi(selectedTask.id, "fail")}
                  >
                    AI fail
                  </button>
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="Human name"
                    value={humanName[selectedTask.id] || ""}
                    onChange={(event) =>
                      setHumanName((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                  <button className="btn btn-ghost" onClick={() => assignHuman(selectedTask.id)}>
                    Assign human
                  </button>
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="Evidence note"
                    value={evidenceNote[selectedTask.id] || ""}
                    onChange={(event) =>
                      setEvidenceNote((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                  <select
                    className="mvp-input"
                    value={evidenceType[selectedTask.id] || "note"}
                    onChange={(event) =>
                      setEvidenceType((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value as "note" | "photo"
                      }))
                    }
                  >
                    <option value="note">Text evidence</option>
                    <option value="photo">Photo link</option>
                  </select>
                  {(evidenceType[selectedTask.id] || "note") === "photo" && (
                    <input
                      className="mvp-input"
                      placeholder="Photo URL"
                      value={evidenceUrl[selectedTask.id] || ""}
                      onChange={(event) =>
                        setEvidenceUrl((prev) => ({
                          ...prev,
                          [selectedTask.id]: event.target.value
                        }))
                      }
                    />
                  )}
                  <button className="btn btn-ghost" onClick={() => submitEvidence(selectedTask.id)}>
                    Submit evidence
                  </button>
                </div>
                <div className="mvp-actions">
                  <button className="btn btn-ghost" onClick={() => verifyTask(selectedTask.id)}>
                    Verify
                  </button>
                  <button className="btn btn-outline" onClick={() => rejectTask(selectedTask.id)}>
                    Reject
                  </button>
                  <button className="btn btn-primary" onClick={() => settleTask(selectedTask.id)}>
                    Settle
                  </button>
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason[selectedTask.id] || ""}
                    onChange={(event) =>
                      setRejectReason((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                </div>
              </details>

              <div className="mvp-evidence">
                <h4>Evidence / Logs</h4>
                {selectedTask.evidence.length === 0 && (
                  <p className="mvp-muted">No evidence yet.</p>
                )}
                {selectedTask.evidence.map((item) => (
                  <div key={item.id} className="mvp-evidence-item">
                    <div className="evidence-meta">
                      <span>{item.by}</span>
                      <span>{item.type}</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{item.content}</p>
                    {item.type === "photo" && item.content.startsWith("http") && (
                      <img className="evidence-photo" src={item.content} alt="evidence" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="market-human">
        <div className="market-card">
          <div className="block-header">
            <div>
              <h2>Human pool</h2>
              <p className="mvp-muted">Dispatch a human when AI gets stuck.</p>
            </div>
          </div>
          <div className="human-grid">
            {humanPool.map((human) => (
              <div key={human.name} className="human-card">
                <div className="human-head">
                  <div>
                    <h3>{human.name}</h3>
                    <p>
                      {human.location} · {human.rate}
                    </p>
                  </div>
                  <span className={`status-pill ${human.available ? "status-ai_running" : "status-ai_failed"}`}>
                    {human.available ? "Available" : "Busy"}
                  </span>
                </div>
                <div className="task-tags">
                  {human.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-outline"
                  disabled={!selectedTask || !human.available}
                  onClick={() => selectedTask && assignHuman(selectedTask.id, human.name)}
                >
                  {selectedTask ? "Assign this human" : "Select a task first"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
