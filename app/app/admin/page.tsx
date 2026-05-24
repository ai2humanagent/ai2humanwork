"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  taskState: string;
  mode: string;
  totalPool: string;
  maxWinners: number;
  claimedCount: number;
  participantCount: number;
  createdAt: string;
  deadline: string | null;
  escrowDepositId: string | null;
};

type Winner = {
  address: string;
  amount: string;
  claimed: boolean;
  txHash: string | null;
};

type Participant = {
  wallet: string;
  subtaskKey: string;
  status: string;
  verifiedAt: string | null;
  claimed: boolean;
  amount: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  network: string | null;
  xHandle: string | null;
  createdAt: string;
};

type TaskDetail = TaskSummary & {
  participants: Participant[];
  winners: Winner[];
  escrow: object | null;
  campaign: object | null;
  evidence: object[];
};

function shortAddress(addr: string) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function modeLabel(mode: string) {
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "equal") return "Equal Split";
  return "FCFS";
}

function statusBadge(status: string, taskState: string) {
  const cls =
    status === "paid" || taskState === "full"
      ? styles.badgeGreen
      : status === "created"
      ? styles.badgeBlue
      : status === "human_assigned"
      ? styles.badgeYellow
      : styles.badgeGray;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/tasks")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openTask(id: string) {
    setDetailLoading(true);
    setSelected(null);
    fetch(`/api/admin/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setSelected(d);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Admin Dashboard</h1>
          <span className={styles.subtitle}>Task &amp; Participant Management</span>
        </div>
        <button className={styles.backBtn} onClick={() => router.push("/tasks")}>
          ← Task Board
        </button>
      </header>

      <div className={styles.layout}>
        {/* Left: task list */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span>Tasks ({tasks.length})</span>
          </div>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : tasks.length === 0 ? (
            <div className={styles.empty}>No tasks</div>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                className={`${styles.taskCard} ${selected?.id === task.id ? styles.taskCardActive : ""}`}
                onClick={() => openTask(task.id)}
              >
                <div className={styles.taskCardTop}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  {statusBadge(task.status, task.taskState)}
                </div>
                <div className={styles.taskCardMeta}>
                  <span>{modeLabel(task.mode)}</span>
                  <span>{task.totalPool}</span>
                  <span>{task.claimedCount}/{task.maxWinners} claimed</span>
                </div>
                <div className={styles.taskCardMeta}>
                  <span>{task.participantCount} participants</span>
                  <span>{timeAgo(task.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Right: detail panel */}
        <main className={styles.main}>
          {!selected && !detailLoading && (
            <div className={styles.placeholder}>
              <p>Select a task to view details</p>
            </div>
          )}
          {detailLoading && (
            <div className={styles.loading}>Loading task details...</div>
          )}
          {selected && <TaskDetailPanel task={selected} />}
        </main>
      </div>
    </div>
  );
}

function TaskDetailPanel({ task }: { task: TaskDetail }) {
  const [tab, setTab] = useState<"overview" | "participants" | "winners" | "payments">("overview");

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <h2>{task.title}</h2>
        <div className={styles.detailMeta}>
          <span className={styles.pool}>{task.totalPool} pool</span>
          <span>{modeLabel(task.mode)}</span>
          <span>{task.claimedCount}/{task.maxWinners} claimed</span>
          <span>{task.participantCount} participants</span>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["overview", "participants", "winners", "payments"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "participants" && ` (${task.participants.length})`}
            {t === "winners" && ` (${task.winners.length})`}
            {t === "payments" && ` (${task.claimedCount})`}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className={styles.overview}>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Task ID</span>
              <span className={styles.infoValue}>{task.id}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{task.status} / {task.taskState}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Mode</span>
              <span className={styles.infoValue}>{modeLabel(task.mode)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Total Pool</span>
              <span className={styles.infoValue}>{task.totalPool}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Max Winners</span>
              <span className={styles.infoValue}>{task.maxWinners}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Escrow ID</span>
              <span className={styles.infoValue}>{task.escrowDepositId || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Deadline</span>
              <span className={styles.infoValue}>{task.deadline ? new Date(task.deadline).toLocaleString() : "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Created</span>
              <span className={styles.infoValue}>{new Date(task.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {task.campaign != null && (
            <div className={styles.section}>
              <h3>Campaign</h3>
              <pre className={styles.jsonPre}>{JSON.stringify(task.campaign as object, null, 2)}</pre>
            </div>
          )}

          {task.escrow != null && (
            <div className={styles.section}>
              <h3>Escrow</h3>
              <pre className={styles.jsonPre}>{JSON.stringify(task.escrow as object, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "participants" && (
        <div className={styles.tableWrap}>
          {task.participants.length === 0 ? (
            <div className={styles.empty}>No participants yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>X Handle</th>
                  <th>Subtask</th>
                  <th>Status</th>
                  <th>Verified At</th>
                  <th>Claimed</th>
                  <th>Amount</th>
                  <th>TX</th>
                </tr>
              </thead>
              <tbody>
                {task.participants.map((p) => (
                  <tr key={`${p.wallet}-${p.subtaskKey}`}>
                    <td>
                      <span className={styles.addr}>{shortAddress(p.wallet)}</span>
                    </td>
                    <td>{p.xHandle || "—"}</td>
                    <td>{p.subtaskKey}</td>
                    <td>
                      <span className={`${styles.badge} ${p.status === "verified" ? styles.badgeGreen : p.status === "action_done" ? styles.badgeYellow : styles.badgeGray}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.verifiedAt ? timeAgo(p.verifiedAt) : "—"}</td>
                    <td>{p.claimed ? "✅" : "❌"}</td>
                    <td>{p.amount || "—"}</td>
                    <td>
                      {p.txHash ? (
                        <a href={p.explorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                          {shortAddress(p.txHash)}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "winners" && (
        <div className={styles.tableWrap}>
          {task.winners.length === 0 ? (
            <div className={styles.empty}>No winners drawn yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Winner Address</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {task.winners.map((w, i) => (
                  <tr key={w.address}>
                    <td>{i + 1}</td>
                    <td><span className={styles.addr}>{shortAddress(w.address)}</span></td>
                    <td>{w.amount}</td>
                    <td>
                      {w.claimed ? (
                        <span className={`${styles.badge} ${styles.badgeGreen}`}>Paid</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeGray}`}>Pending</span>
                      )}
                    </td>
                    <td>
                      {w.txHash ? (
                        <span className={styles.addr}>{shortAddress(w.txHash)}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className={styles.tableWrap}>
          {task.claimedCount === 0 ? (
            <div className={styles.empty}>No payments yet</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receiver</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Network</th>
                  <th>TX Hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {task.participants
                  .filter((p) => p.claimed)
                  .map((p) => (
                    <tr key={p.txHash || p.wallet}>
                      <td><span className={styles.addr}>{shortAddress(p.wallet)}</span></td>
                      <td>{p.amount}</td>
                      <td>On-chain</td>
                      <td>{p.network || "—"}</td>
                      <td>
                        {p.txHash ? (
                          <a href={p.explorerUrl || "#"} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
                            {shortAddress(p.txHash)}
                          </a>
                        ) : "—"}
                      </td>
                      <td>{p.createdAt ? timeAgo(p.createdAt) : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
