"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getTaskSubmissionFields,
  getTaskVerificationStatus
} from "../lib/officialCampaignTasks.js";
import { getTaskAgentArchitecture } from "../lib/agentArchitecture.js";
import {
  CHAIN_NATIVE_FALLBACK_FRAMING,
  getOnchainOsPrecheck
} from "../lib/onchainOs.js";
import X402VerificationUnlockCard from "../components/X402VerificationUnlockCard";
import { formatBudgetLabel } from "../lib/assetLabels.js";

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
    platform: "x" | "real_world";
    action: string;
    label?: string;
    targetUrl?: string;
    targetLabel?: string;
    proofPhrase?: string;
    brief?: string;
    proofRequirements: string[];
    verificationChecks: string[];
    submissionFields?: string[];
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

const flowSteps = ["Task", "Precheck", "Planner", "Human", "Verify", "Settle"];

const getStageIndex = (status: Task["status"]) => {
  switch (status) {
    case "created":
      return 0;
    case "ai_running":
      return 1;
    case "ai_done":
    case "ai_failed":
      return 2;
    case "human_assigned":
    case "human_done":
      return 3;
    case "verified":
      return 4;
    case "paid":
      return 5;
    default:
      return 0;
  }
};

const formatMoney = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : null;
};

const pick = (items: string[], index: number) => items[index % items.length];

const taskLocations = ["Campaign", "Social", "Launch", "Growth", "Community", "Review"];

const taskTypes = ["Quote Post", "Reply", "Repost", "Standalone Post"];

const urgencyLevels = ["Urgent", "High", "Normal"];

const MAX_VISIBLE_TASKS = 12;
const DEMO_ADMIN_TOKEN = process.env.NEXT_PUBLIC_DEMO_ADMIN_TOKEN || "";
const DEMO_BNB_OPERATOR_WALLET = process.env.NEXT_PUBLIC_BNB_DEMO_OPERATOR_WALLET || "";
const DEMO_OPERATOR_WALLET = process.env.NEXT_PUBLIC_XLAYER_DEMO_OPERATOR_WALLET || "";
const DEMO_SOLANA_OPERATOR_WALLET = process.env.NEXT_PUBLIC_SOLANA_DEMO_OPERATOR_WALLET || "";
const agentStateStyles: Record<string, string> = {
  waiting: "status-created",
  active: "status-ai_running",
  blocked: "status-ai_failed",
  ready: "status-human_done",
  done: "status-verified"
};

export default function LiveDemoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [demoRunningId, setDemoRunningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [demoError, setDemoError] = useState("");
  const [lastEvent, setLastEvent] = useState("Idle");
  const [demoSettlementRail, setDemoSettlementRail] = useState<"bnb" | "xlayer" | "solana">("bnb");

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
    const filtered = data.filter(
      (task) => !/[\u4e00-\u9fff]/.test(`${task.title} ${task.acceptance}`)
    );
    setTasks(filtered);
  };

  const seedTasks = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      await fetch("/api/tasks/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 12, mode: "created_only" })
      });
      await loadTasks();
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    const localToken = window.localStorage.getItem("demo_admin_token") || "";
    setAdminToken(localToken || DEMO_ADMIN_TOKEN);
    loadTasks();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("demo_admin_token", adminToken);
  }, [adminToken]);

  useEffect(() => {
    if (!tasks.length && !seeding) {
      seedTasks();
      return;
    }
    if (!tasks.length) return;

    const hasOpen = tasks.some((task) => task.status === "created");
    if (!hasOpen && !seeding) {
      const timer = setTimeout(() => seedTasks(), 2400);
      return () => clearTimeout(timer);
    }

    if (demoRunningId) return;

    const nextTask = tasks.find((task) => task.status === "created");
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
    const res = await fetch(`/api/tasks/${id}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note: "Auto run" })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "AI action failed");
    }
    await loadTasks();
  };

  const protectedHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken.trim()) headers["x-admin-token"] = adminToken.trim();
    return headers;
  };

  const assignHuman = async (id: string, name = "Fallback Operator") => {
    const walletAddress =
      demoSettlementRail === "solana"
        ? DEMO_SOLANA_OPERATOR_WALLET
        : demoSettlementRail === "bnb"
          ? DEMO_BNB_OPERATOR_WALLET
          : DEMO_OPERATOR_WALLET;
    const res = await fetch(`/api/tasks/${id}/human`, {
      method: "POST",
      headers: protectedHeaders(),
      body: JSON.stringify({
        name,
        walletAddress: walletAddress || undefined
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Assign human failed");
    }
    await loadTasks();
  };

  const submitEvidence = async (task: Task) => {
    const submissionFields = getTaskSubmissionFields(task);
    const executorHandle = `@demooperator${task.id.replace(/-/g, "").slice(0, 4)}`;
    const postUrl = `https://x.com/${executorHandle.slice(1)}/status/${task.id.replace(/-/g, "").slice(0, 18)}`;
    const profileUrl = `https://x.com/${executorHandle.slice(1)}`;
    const screenshotUrl = submissionFields.includes("locationNote")
      ? ["/freelance-hero.jpg", "/freelance-desk.jpg", "/freelance-team.jpg"][
          task.id.charCodeAt(0) % 3
        ]
      : `/brand/ai2human-social-${(task.id.charCodeAt(0) % 3) + 1}.png`;
    const locationNote = [
      "Front entrance verified on Market Street",
      "Product shelf checked near refrigerated aisle",
      "Pickup desk verified in the lobby",
      "Menu board checked at the main counter",
      "Queue observed at the south entrance"
    ][task.id.charCodeAt(1) % 5];
    const timestampNote = `Checked at ${new Date().toLocaleString("en-US", { hour12: false })}`;
    const summary =
      task.campaign?.platform === "real_world"
        ? `Completed the ${task.campaign?.label || "field"} task on site and returned the requested proof package for review.`
        : task.campaign?.action === "repost"
        ? `Reposted the official campaign update from ${task.campaign.requesterHandle || "@official"} and kept it visible on profile.`
        : `Completed ${task.campaign?.action || "campaign"} task for ${task.campaign?.requesterHandle || "@official"} and kept the result live for review.`;
    const res = await fetch(`/api/tasks/${task.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        by: "human",
        executorHandle: submissionFields.includes("executorHandle") ? executorHandle : undefined,
        postUrl: submissionFields.includes("postUrl") ? postUrl : "",
        profileUrl: submissionFields.includes("profileUrl") ? profileUrl : "",
        proofPhrase: submissionFields.includes("proofPhrase") ? task.campaign?.proofPhrase || "" : "",
        locationNote: submissionFields.includes("locationNote") ? locationNote : "",
        timestampNote: submissionFields.includes("timestampNote") ? timestampNote : "",
        summary,
        screenshotUrl: submissionFields.includes("photo") ? screenshotUrl : ""
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Evidence submission failed");
    }
    await loadTasks();
  };

  const verifyTask = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}/verify`, {
      method: "POST",
      headers: protectedHeaders()
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Verify failed");
    }
    await loadTasks();
  };

  const settleTask = async (id: string, network: "bnb" | "xlayer" | "solana") => {
    const res = await fetch(`/api/tasks/${id}/settle`, {
      method: "POST",
      headers: protectedHeaders(),
      body: JSON.stringify({ network })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Settle failed");
    }
    const payload = await res.json().catch(() => ({}));
    await loadTasks();
    return payload as {
      payment?: {
        method?: "mock_x402" | "bnb_erc20" | "xlayer_erc20" | "solana_native";
      };
    };
  };

  const runFullDemo = async (task: Task) => {
    if (demoRunningId) return;
    setDemoRunningId(task.id);
    setDemoError("");
    try {
      setLastEvent("Planner started Wallet / Market / Trade precheck");
      await runAi(task.id, "fail");
      setLastEvent("Precheck blocked the autonomous path, handing off to dispatcher");
      await assignHuman(task.id);
      setLastEvent("Dispatcher assigned a fallback operator");
      await submitEvidence(task);
      setLastEvent("Structured proof submitted, verifying");
      await verifyTask(task.id);
      setLastEvent("Verifier cleared proof, releasing settlement");
      const payload = await settleTask(task.id, demoSettlementRail);
      setLastEvent(
        payload?.payment?.method === "solana_native"
          ? "Settled on Solana"
          : payload?.payment?.method === "bnb_erc20"
            ? "Settled on BNB Chain"
          : payload?.payment?.method === "xlayer_erc20"
            ? "Settled on X Layer"
            : "Settled in demo mode"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Demo run failed";
      setDemoError(message);
      setLastEvent(`Failed: ${message}`);
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
        location: task.campaign?.requesterHandle || pick(taskLocations, index),
        type: task.campaign ? `X ${task.campaign.action}` : pick(taskTypes, index),
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
  const x402ReadyTask = useMemo(() => {
    if (selectedTask && ["human_done", "verified", "paid"].includes(selectedTask.status)) {
      return selectedTask;
    }
    return (
      tasks.find((task) => ["human_done", "verified", "paid"].includes(task.status)) || null
    );
  }, [selectedTask, tasks]);
  const selectedVerificationStatus = useMemo(
    () =>
      selectedTask
        ? getTaskVerificationStatus(selectedTask)
        : { ok: true, checks: [], missing: [] as string[] },
    [selectedTask]
  );
  const selectedAgentArchitecture = useMemo(
    () => (selectedTask ? getTaskAgentArchitecture(selectedTask) : []),
    [selectedTask]
  );
  const selectedPrecheck = useMemo(() => {
    if (!selectedTask) return null;
    const outcome = selectedTask.status === "ai_done" ? "success" : "fail";
    return getOnchainOsPrecheck(selectedTask, outcome);
  }, [selectedTask]);
  const stageIndex = selectedTask ? getStageIndex(selectedTask.status) : 0;
  const stageProgress = Math.min(100, Math.round((stageIndex / 5) * 100));
  const stageLabels = [
    "Task posted",
    "OnchainOS precheck",
    "Planner handoff",
    "Human fallback",
    "Proof verified",
    "Settled"
  ];
  const settlementLabel =
    demoSettlementRail === "solana"
      ? "Solana"
      : demoSettlementRail === "bnb"
        ? "BNB Chain"
        : "X Layer";
  const demoOperatorWallet =
    demoSettlementRail === "solana"
      ? DEMO_SOLANA_OPERATOR_WALLET
      : demoSettlementRail === "bnb"
        ? DEMO_BNB_OPERATOR_WALLET
        : DEMO_OPERATOR_WALLET;

  return (
    <div className="page mvp live-demo">
      <header className="market-hero">
          <div>
            <div className="auto-banner">
              <span className="auto-pill">
                <span className="auto-dot" aria-hidden />
                AUTO-RUNNING DEMO
              </span>
              <span className="auto-tag">judge walkthrough</span>
            </div>
            <p className="eyebrow">BNB Hackathon Demo</p>
            <h1>{`Planner precheck → human fallback → proof → verify → settle on ${settlementLabel}`}</h1>
            <p className="mvp-lead">
              Single-scenario playback for judges. The planner queries Wallet API, Market API, and
              Trade API first. If the task is still blocked by real-world constraints or
              compliance gates, ai2human dispatches a local operator, verifies proof, and releases
              settlement on {settlementLabel}.
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
            <span>Loop stages</span>
            <strong>6</strong>
          </div>
          <div>
            <span>Paid tasks</span>
            <strong>{stats.paid}</strong>
          </div>
          <div>
            <span>Fallback rule</span>
            <strong>Last resort</strong>
          </div>
        </div>
      </header>

      <section className="market-grid">
        <div className="market-card">
          <div className="block-header">
            <div>
              <h2>Auto loop status</h2>
              <p className="mvp-muted">
                Continuous judge walkthrough. Planner precheck happens before human fallback.
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
                <strong>Submission</strong>
              </div>
            <div>
              <span>Cycle</span>
              <strong>~12s</strong>
            </div>
              <div>
              <span>Planner gate</span>
              <strong>Wallet + Market + Trade</strong>
              </div>
              <div>
                <span>Fallback policy</span>
                <strong>{demoOperatorWallet ? "Payout-ready" : "Demo fallback"}</strong>
              </div>
            </div>
          <p className="mvp-muted">Last event: {lastEvent}</p>
          <div className="demo-auth">
            <label htmlFor="demo-admin-token">Demo admin token</label>
            <input
              id="demo-admin-token"
              className="mvp-input"
              type="password"
              placeholder="Optional in dev, required in protected environments"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
            />
            <label htmlFor="demo-settlement-rail">Settlement rail</label>
            <select
              id="demo-settlement-rail"
              className="mvp-input"
              value={demoSettlementRail}
              onChange={(event) =>
                setDemoSettlementRail(event.target.value as "bnb" | "xlayer" | "solana")
              }
            >
              <option value="bnb">BNB Chain</option>
              <option value="xlayer">X Layer</option>
              <option value="solana">Solana</option>
            </select>
            <p className="mvp-muted">
              {demoSettlementRail === "solana"
                ? `Demo payouts will target Solana. Operator wallet: ${demoOperatorWallet || "not configured"}`
                : demoSettlementRail === "bnb"
                  ? `Demo payouts will target BNB Chain. Operator wallet: ${demoOperatorWallet || "not configured"}`
                  : `Demo payouts will target X Layer. Operator wallet: ${demoOperatorWallet || "not configured"}`}
            </p>
          </div>
          {demoError && <p className="demo-error">Loop paused: {demoError}</p>}
          <div className="auto-highlight">
            <p className="mvp-muted">Now running</p>
            <strong>{selectedTask ? selectedTask.title : "Seeding tasks..."}</strong>
            {selectedTask && (
              <span className={`status-pill status-${selectedTask.status}`}>
                {statusLabels[selectedTask.status]}
              </span>
            )}
            {selectedTask?.assignee?.walletAddress && (
              <span className="mvp-muted">{selectedTask.assignee.walletAddress}</span>
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
              <h2>Fallback execution queue</h2>
              <p className="mvp-muted">
                Planner-led OnchainOS prechecks decide whether the task stays autonomous or moves into fallback.
              </p>
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
                        {formatBudgetLabel(task.budget)} · {task.deadline}
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
                    {task.campaign?.requesterHandle && (
                      <span>Requester: {task.campaign.requesterHandle}</span>
                    )}
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
              <p className="mvp-muted">
                Planner queries wallet, market, and trade routes first. Human fallback only appears when the onchain path stays blocked.
              </p>
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

              <div className="mvp-evidence">
                <h4>OnchainOS precheck</h4>
                {selectedPrecheck && (
                  <>
                    <div className="mvp-evidence-item">
                      <div className="evidence-meta">
                        <span>main path</span>
                        <span>
                          {selectedPrecheck.route === "autonomous_onchain"
                            ? "autonomous"
                            : "human fallback"}
                        </span>
                      </div>
                      <p>{selectedPrecheck.precheckMessage}</p>
                      <p className="mvp-muted">{selectedPrecheck.handoffMessage}</p>
                    </div>
                    {selectedPrecheck.apis.map((api) => (
                      <div key={api.id} className="mvp-evidence-item">
                        <div className="evidence-meta">
                          <span>api</span>
                          <span>{api.label}</span>
                        </div>
                        <p>{api.summary}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="mvp-evidence">
                <h4>Multi-agent architecture</h4>
                <div className="reviewer-metric-grid">
                  {selectedAgentArchitecture.map((role) => (
                    <div key={role.id}>
                      <span>{role.kind}</span>
                      <strong>{role.title}</strong>
                      <span
                        className={`status-pill ${agentStateStyles[role.state] || "status-created"}`}
                      >
                        {role.state}
                      </span>
                      <p className="mvp-muted">{role.description}</p>
                      <p className="mvp-muted">{role.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-meta">
                <span>Acceptance: {selectedTask.acceptance}</span>
                {selectedTask.campaign?.requesterName && (
                  <span>
                    Requester: {selectedTask.campaign.requesterName}
                    {selectedTask.campaign.requesterHandle
                      ? ` (${selectedTask.campaign.requesterHandle})`
                      : ""}
                  </span>
                )}
                {selectedTask.campaign?.targetUrl && (
                  <span>
                    {selectedTask.campaign.platform === "x"
                      ? "Target"
                      : selectedTask.campaign.targetLabel || "Reference"}
                    : {selectedTask.campaign.targetUrl}
                  </span>
                )}
                {selectedTask.assignee && (
                  <span>
                    Executor: {selectedTask.assignee.name} ({selectedTask.assignee.type})
                  </span>
                )}
                {selectedTask.assignee?.walletAddress && (
                  <span>Wallet: {selectedTask.assignee.walletAddress}</span>
                )}
              </div>

              {selectedTask.campaign?.brief && (
                <div className="mvp-evidence">
                  <h4>Campaign brief</h4>
                  <div className="mvp-evidence-item">
                    <p>{selectedTask.campaign.brief}</p>
                    <p className="mvp-muted">{CHAIN_NATIVE_FALLBACK_FRAMING}</p>
                    {selectedTask.campaign.proofPhrase && (
                      <p className="mvp-muted">
                        Required phrase: <strong>{selectedTask.campaign.proofPhrase}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                  <h4>Verification checklist</h4>
                  {selectedTask.campaign.verificationChecks.map((item) => {
                    const matched = selectedVerificationStatus.checks.find(
                      (check: { label: string; passed: boolean }) => check.label === item
                    );
                    return (
                      <div key={item} className="mvp-evidence-item">
                        <div className="evidence-meta">
                          <span>check</span>
                          <span>{matched?.passed ? "passed" : "waiting"}</span>
                        </div>
                        <p>{item}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

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
                    {item.type === "photo" &&
                      (item.content.startsWith("http") || item.content.startsWith("/")) && (
                      <img className="evidence-photo" src={item.content} alt="evidence" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="market-detail">
        <X402VerificationUnlockCard task={x402ReadyTask} />
      </section>

      <section className="market-human">
        <div className="market-card">
          <div className="block-header">
            <div>
              <h2>Human pool</h2>
              <p className="mvp-muted">Pre-screened fallback operators for community growth, merchant ops, and proof collection.</p>
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
