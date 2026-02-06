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
  created: "已创建",
  ai_running: "AI 执行中",
  ai_failed: "AI 失败",
  ai_done: "AI 完成",
  human_assigned: "已派人",
  human_done: "人类完成",
  verified: "已验证",
  paid: "已结算"
};

const demoTemplate = {
  title: "线下核验门店库存",
  budget: "$120",
  deadline: "4h",
  acceptance: "门店照片 + 时间戳"
};

const flowSteps = ["任务创建", "AI 执行", "人类兜底", "验证", "结算"];

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
  "Shenzhen",
  "Shanghai",
  "Austin",
  "Seoul",
  "Berlin",
  "Tokyo",
  "Singapore",
  "Dubai"
];

const taskTypes = [
  "线下核验",
  "价格监控",
  "内容合规",
  "物流跑腿",
  "数据抓取",
  "跨平台同步"
];

const urgencyLevels = ["紧急", "高优", "普通"];

const statusFilters = [
  { value: "all", label: "全部状态" },
  { value: "open", label: "待接单" },
  { value: "assigned", label: "已派人" },
  { value: "paid", label: "已结算" }
];

export default function MVPPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoRunningId, setDemoRunningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  useEffect(() => {
    loadTasks();
  }, []);

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

  const submitTask = async (payload?: typeof form) => {
    const data = payload ?? form;
    if (!data.title.trim()) {
      return;
    }
    setLoading(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    setForm({ title: "", budget: "", deadline: "", acceptance: "" });
    await loadTasks();
    setLoading(false);
  };

  const runAi = async (id: string, outcome: "success" | "fail") => {
    await fetch(`/api/tasks/${id}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note: "Auto run" })
    });
    await loadTasks();
  };

  const assignHuman = async (id: string) => {
    await fetch(`/api/tasks/${id}/human`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: humanName[id] || "Demo Human" })
    });
    await loadTasks();
  };

  const submitEvidence = async (id: string) => {
    await fetch(`/api/tasks/${id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        by: "human",
        note: evidenceNote[id] || "照片与时间戳已上传"
      })
    });
    setEvidenceNote((prev) => ({ ...prev, [id]: "" }));
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
        return { label: "运行 AI（失败触发人类）", action: () => runAi(task.id, "fail") };
      case "ai_failed":
        return { label: "派单给人", action: () => assignHuman(task.id) };
      case "human_assigned":
        return { label: "提交证据", action: () => submitEvidence(task.id) };
      case "human_done":
      case "ai_done":
        return { label: "验证通过", action: () => verifyTask(task.id) };
      case "verified":
        return { label: "结算完成", action: () => settleTask(task.id) };
      case "paid":
        return { label: "已完成", action: null };
      default:
        return { label: "开始", action: null };
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

  const scrollToPost = () => {
    document.getElementById("post-task")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="page mvp">
      <header className="market-hero">
        <div>
          <p className="eyebrow">Marketplace MVP</p>
          <h1>人雇 AI / AI 雇人 · 任务闭环市场</h1>
          <p className="mvp-lead">
            这是一个市场型 MVP：你发布任务，AI 执行，卡住就派人，验证后结算。
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => submitTask(demoTemplate)}>
              一键创建示例任务
            </button>
            <button className="btn btn-outline" onClick={scrollToPost}>
              发布我的任务
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
            <span>任务总数</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>进行中</span>
            <strong>{stats.running}</strong>
          </div>
          <div>
            <span>已结算</span>
            <strong>{stats.paid}</strong>
          </div>
        </div>
      </header>

      <section className="market-grid">
        <div id="post-task" className="market-card">
          <div className="block-header">
            <div>
              <h2>发布任务</h2>
              <p className="mvp-muted">进入市场队列，等待 AI 接单。</p>
            </div>
            <button className="btn btn-ghost" onClick={() => setForm(demoTemplate)}>
              填入示例
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
              placeholder="任务标题"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="预算（例如 $200）"
              value={form.budget}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, budget: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="截止时间"
              value={form.deadline}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, deadline: event.target.value }))
              }
            />
            <textarea
              className="mvp-textarea"
              placeholder="验收标准"
              value={form.acceptance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, acceptance: event.target.value }))
              }
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "提交中..." : "发布任务"}
            </button>
          </form>
        </div>

        <div className="market-card feed">
          <div className="block-header">
            <div>
              <h2>任务市场</h2>
              <p className="mvp-muted">点击卡片查看详情。</p>
            </div>
            <button className="btn btn-ghost" onClick={loadTasks}>
              刷新
            </button>
          </div>

          <div className="tabs">
            <button
              className={`tab ${marketTab === "ai" ? "active" : ""}`}
              onClick={() => setMarketTab("ai")}
            >
              雇 AI 接单
            </button>
            <button
              className={`tab ${marketTab === "human" ? "active" : ""}`}
              onClick={() => setMarketTab("human")}
            >
              AI 雇人兜底
            </button>
            <div className="density">
              <span>密度</span>
              <button
                className={`density-btn ${density === "compact" ? "active" : ""}`}
                onClick={() => setDensity("compact")}
              >
                紧凑
              </button>
              <button
                className={`density-btn ${density === "comfortable" ? "active" : ""}`}
                onClick={() => setDensity("comfortable")}
              >
                舒适
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
              <option value="all">全部地点</option>
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
              <option value="all">全部类型</option>
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
              <option value="all">全部紧急度</option>
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
              placeholder="最低预算"
              value={filters.budgetMin}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, budgetMin: event.target.value }))
              }
            />
            <input
              className="mvp-input"
              placeholder="最高预算"
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
              <option value="recent">最近</option>
              <option value="high">高价优先</option>
              <option value="urgent">紧急优先</option>
            </select>
          </div>

          {filteredTasks.length === 0 && (
            <div className="market-empty">没有符合条件的任务。</div>
          )}

          <div className={`feed-grid ${density}`}>
            {filteredTasks.map((task) => {
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
                    <span>验收：{task.acceptance}</span>
                    {task.assignee && (
                      <span>
                        执行者：{task.assignee.name} ({task.assignee.type})
                      </span>
                    )}
                  </div>
                  <div className="task-footer">
                    <div className={`avatar badge-${task.avatarSeed}`} />
                    <span>待接单</span>
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
              <h2>任务详情</h2>
              <p className="mvp-muted">选择任务后可推进闭环。</p>
            </div>
          </div>
          {!selectedTask && <div className="market-empty">请选择一个任务。</div>}
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
                <span>验收：{selectedTask.acceptance}</span>
                {selectedTask.assignee && (
                  <span>
                    执行者：{selectedTask.assignee.name} ({selectedTask.assignee.type})
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
                  一键走完整闭环
                </button>
              </div>

              <details className="mvp-details">
                <summary>手动操作</summary>
                <div className="mvp-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => runAi(selectedTask.id, "success")}
                  >
                    AI 成功
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => runAi(selectedTask.id, "fail")}
                  >
                    AI 失败
                  </button>
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="人类姓名"
                    value={humanName[selectedTask.id] || ""}
                    onChange={(event) =>
                      setHumanName((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                  <button className="btn btn-ghost" onClick={() => assignHuman(selectedTask.id)}>
                    派单给人
                  </button>
                </div>
                <div className="mvp-inline">
                  <input
                    className="mvp-input"
                    placeholder="证据描述"
                    value={evidenceNote[selectedTask.id] || ""}
                    onChange={(event) =>
                      setEvidenceNote((prev) => ({
                        ...prev,
                        [selectedTask.id]: event.target.value
                      }))
                    }
                  />
                  <button className="btn btn-ghost" onClick={() => submitEvidence(selectedTask.id)}>
                    提交证据
                  </button>
                </div>
                <div className="mvp-actions">
                  <button className="btn btn-ghost" onClick={() => verifyTask(selectedTask.id)}>
                    验证通过
                  </button>
                  <button className="btn btn-primary" onClick={() => settleTask(selectedTask.id)}>
                    结算完成
                  </button>
                </div>
              </details>

              <div className="mvp-evidence">
                <h4>证据 / 日志</h4>
                {selectedTask.evidence.length === 0 && (
                  <p className="mvp-muted">暂无证据</p>
                )}
                {selectedTask.evidence.map((item) => (
                  <div key={item.id} className="mvp-evidence-item">
                    <span>{item.by}</span>
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
