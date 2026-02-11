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

const formatMoney = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : null;
};

const pick = (items: string[], index: number) => items[index % items.length];

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

const MAX_VISIBLE_TASKS = 12;

export default function LiveDemoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [demoRunningId, setDemoRunningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    if (seeding) return;
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
    if (!tasks.length && !seeding) {
      seedTasks();
      return;
    }
    if (!tasks.length) return;

    const hasOpen = tasks.some((task) => task.status !== "paid");
    if (!hasOpen && !seeding) {
      const timer = setTimeout(() => seedTasks(), 2400);
      return () => clearTimeout(timer);
    }

    if (demoRunningId) return;

    const nextTask = tasks.find((task) => task.status !== "paid");
    if (!nextTask) return;

    const timer = setTimeout(() => {
      setSelectedId(nextTask.id);
      runFullDemo(nextTask);
    }, 1200);

    return () => clearTimeout(timer);
  }, [tasks, demoRunningId, seeding]);

  useEffect(() => {
    if (!tasks.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !tasks.some((task) => task.id === selectedId)) {
      setSelectedId(tasks[0].id);
    }
  }, [tasks, selectedId]);

  const runAi = async (id: string, outcome: "success" | "fail") => {
    await fetch(`/api/tasks/${id}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note: "Auto run" })
    });
    await loadTasks();
  };

  const assignHuman = async (id: string, name = "Demo Human") => {
    await fetch(`/api/tasks/${id}/human`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await loadTasks();
  };

  const submitEvidence = async (id: string) => {
    await fetch(`/api/tasks/${id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        by: "human",
        type: "note",
        note: "Photo + timestamp uploaded",
        url: ""
      })
    });
    await loadTasks();
  };

  const verifyTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/verify`, { method: "POST" });
    await loadTasks();
  };

  const settleTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/settle`, { method: "POST" });
    await loadTasks();
  };

  const runFullDemo = async (task: Task) => {
    if (demoRunningId) return;
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

  const visibleTasks = useMemo(
    () => enrichedTasks.slice(0, MAX_VISIBLE_TASKS),
    [enrichedTasks]
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

  const selectedTask = tasks.find((task) => task.id === selectedId) || null;
  const stageIndex = selectedTask ? getStageIndex(selectedTask.status) : 0;
  const stageProgress = Math.min(100, Math.round((stageIndex / 4) * 100));
  const stageLabels = [
    "Task received",
    "AI executing",
    "Human dispatched",
    "Verified",
    "Settled"
  ];

  return (
    <div className="page mvp live-demo">
      <header className="market-hero">
        <div>
          <div className="auto-banner">
            <span className="auto-pill">
              <span className="auto-dot" aria-hidden />
              AUTO-RUNNING DEMO
            </span>
            <span className="auto-tag">hands-free playback</span>
          </div>
          <p className="eyebrow">Live Demo</p>
          <h1>Auto-running loop: task → AI → human → verify → settle</h1>
          <p className="mvp-lead">
            Read-only live demo. Tasks are auto-seeded, executed by AI, routed to humans when needed,
            verified, and settled on repeat.
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
        <div className="market-card">
          <div className="block-header">
            <div>
              <h2>Auto loop status</h2>
              <p className="mvp-muted">
                The demo cycles continuously — no clicks or manual inputs required.
              </p>
            </div>
            <span className={`status-pill ${demoRunningId ? "status-ai_running" : "status-ai_done"}`}>
              {demoRunningId ? "Running" : seeding ? "Seeding" : "Idle"}
            </span>
          </div>
          <div className="auto-progress" aria-hidden>
            <span style={{ width: `${stageProgress}%` }} />
          </div>
          <div className="auto-status">
            <div>
              <span>Mode</span>
              <strong>Read-only</strong>
            </div>
            <div>
              <span>Cycle</span>
              <strong>~12s</strong>
            </div>
            <div>
              <span>Seed size</span>
              <strong>{MAX_VISIBLE_TASKS}</strong>
            </div>
          </div>
          <div className="auto-highlight">
            <p className="mvp-muted">Now running</p>
            <strong>{selectedTask ? selectedTask.title : "Seeding tasks..."}</strong>
            {selectedTask && (
              <span className={`status-pill status-${selectedTask.status}`}>
                {statusLabels[selectedTask.status]}
              </span>
            )}
          </div>
          <div className="auto-timeline">
            {stageLabels.map((label, index) => (
              <div
                key={label}
                className={`auto-step ${index <= stageIndex ? "done" : ""} ${
                  index === stageIndex ? "active" : ""
                }`}
              >
                <span className="auto-index">{index + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="market-card feed">
          <div id="market" className="block-header">
            <div>
              <h2>Task market</h2>
              <p className="mvp-muted">Auto-refreshing task queue.</p>
            </div>
          </div>

          {visibleTasks.length === 0 && (
            <div className="market-empty">Seeding tasks...</div>
          )}

          <div className="feed-grid compact">
            {visibleTasks.map((task) => {
              const isSelected = task.id === selectedId;
              return (
                <article
                  key={task.id}
                  className={`task-card ${isSelected ? "selected" : ""}`}
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
              <p className="mvp-muted">Loop state updates automatically.</p>
            </div>
          </div>
          {!selectedTask && <div className="market-empty">Waiting for tasks...</div>}
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
              <p className="mvp-muted">Humans are auto-dispatched when AI hits reality.</p>
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
                  <span
                    className={`status-pill ${
                      human.available ? "status-ai_running" : "status-ai_failed"
                    }`}
                  >
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
                <span className="mvp-muted">Auto-dispatch enabled</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
