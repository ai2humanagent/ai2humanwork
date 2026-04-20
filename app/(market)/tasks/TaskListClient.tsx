"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "../market.module.css";
import {
  DEFAULT_SETTLEMENT_TOKEN_SYMBOL,
  formatBudgetLabel
} from "../../lib/assetLabels.js";
import {
  fetchWithPrivySessionRetry,
  loadAuthWithPrivySession
} from "../../lib/clientPrivySession";
import { sortTasksForBoard } from "../../lib/taskBoard.js";

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
  updatedAt: string;
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
    submissionFields?: string[];
  };
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
};

type AuthPayload = {
  user: {
    id: string;
    walletAddress?: string;
  };
  human: {
    id: string;
    name: string;
    handle: string;
  } | null;
};

const statusLabels: Record<Task["status"], string> = {
  created: "Open",
  ai_running: "AI Running",
  ai_failed: "Needs Human",
  ai_done: "AI Ready",
  human_assigned: "Claimed",
  human_done: "Proof Submitted",
  verified: "Verified",
  paid: "Paid"
};

function parseReward(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionLabel(task: Task) {
  if (!task.campaign) return "fallback";
  if (task.campaign.label) return task.campaign.label;
  if (task.campaign.platform === "x") return `x ${task.campaign.action}`;
  return task.campaign.action.replace(/_/g, " ");
}

function statusClass(status: Task["status"]) {
  if (status === "created" || status === "ai_done") return styles.badgeStatusOpen;
  if (status === "human_assigned" || status === "human_done") return styles.badgeModeClaim;
  if (status === "verified" || status === "paid") return styles.badgeModeBounty;
  return styles.badgeStatus;
}

function canClaim(task: Task, auth: AuthPayload | null) {
  if (!["created", "ai_failed"].includes(task.status)) return false;
  if (!auth?.human?.id || !auth?.user?.walletAddress) return false;
  return true;
}

function isClaimedByCurrentUser(task: Task, auth: AuthPayload | null) {
  if (!auth?.human?.name) return false;
  return task.assignee?.type === "human" && task.assignee.name === auth.human.name;
}

export default function TaskListClient({ justCreated }: { justCreated: boolean }) {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [minReward, setMinReward] = useState("0");
  const [claimingId, setClaimingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  async function loadTasks() {
    const response = await fetch("/api/tasks", { cache: "no-store", credentials: "same-origin" });
    const payload = (await response.json().catch(() => [])) as Task[];
    setTasks(sortTasksForBoard(payload));
  }

  async function loadAuth() {
    const payload = await loadAuthWithPrivySession<AuthPayload>({
      authenticated,
      getAccessToken,
      walletAddress: connectedWallet
    });
    if (!payload) {
      setAuth(null);
      return;
    }
    setAuth(payload);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTasks(), loadAuth()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadAuth();
  }, [ready, authenticated, getAccessToken, connectedWallet]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (parseReward(task.budget) < Number.parseFloat(minReward || "0")) return false;

      if (filter === "available") {
        return ["created", "ai_failed"].includes(task.status);
      }
      if (filter === "mine") {
        return isClaimedByCurrentUser(task, auth);
      }
      if (filter === "closed") {
        return ["verified", "paid"].includes(task.status);
      }
      return true;
    });
  }, [tasks, filter, minReward, auth]);

  async function claimTask(task: Task) {
    setError("");
    setMessage("");

    if (!authenticated) {
      login();
      return;
    }

    if (!auth?.human?.id || !auth?.user?.walletAddress) {
      router.push("/app/profile");
      return;
    }

    setClaimingId(task.id);
    try {
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/claim`,
        {
          method: "POST",
          credentials: "same-origin"
        },
        {
          authenticated,
          getAccessToken,
          walletAddress: connectedWallet
        }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to claim task.");
      }
      setMessage(`Claimed "${task.title}" as ${auth.human.name}.`);
      await Promise.all([loadTasks(), loadAuth()]);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Unable to claim task.");
    } finally {
      setClaimingId("");
    }
  }

  return (
    <section>
      <header className={styles.pageHeader}>
        <h1>Tasks</h1>
        <p className={styles.pageLead}>
          Live fallback tasks across social distribution and real-world execution. Connect a
          wallet, claim a task, then submit proof for reviewer approval and onchain settlement.
        </p>
      </header>

      {justCreated ? <div className={styles.success}>Task created and added to the live board.</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.alert}>{error}</div> : null}

      <div className={`${styles.panel} ${styles.filters}`}>
        <div className={styles.field}>
          <label>Board</label>
          <select className={styles.select} value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="available">Available to claim</option>
            <option value="mine">My claimed tasks</option>
            <option value="closed">Closed</option>
            <option value="all">All tasks</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>{`Min Reward (${DEFAULT_SETTLEMENT_TOKEN_SYMBOL})`}</label>
          <input className={styles.input} value={minReward} onChange={(event) => setMinReward(event.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Operator session</label>
          <div className={styles.modeHelp}>
            {auth?.human ? (
              <>
                <div>
                  <strong>{auth.human.name}</strong>
                  <span> @{auth.human.handle}</span>
                </div>
                <div>Wallet connected and payout-ready.</div>
              </>
            ) : (
              <div>No operator profile loaded yet.</div>
            )}
          </div>
        </div>
        <div className={styles.field}>
          <label>Claim flow</label>
          {authenticated ? (
            <Link href="/app/profile" className={styles.submitButton}>
              Manage Operator Profile
            </Link>
          ) : (
            <button type="button" className={styles.submitButton} onClick={() => login()}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {loading ? <div className={styles.placeholderCard}><p>Loading live tasks...</p></div> : null}
      {!loading && filtered.length === 0 ? (
        <div className={styles.placeholderCard}>
          <h1>0 open tasks</h1>
          <p>Create a campaign task at `/tasks/new`, or switch the board filter.</p>
        </div>
      ) : null}

      <div className={styles.tasksGrid}>
        {filtered.map((task) => {
          const claimedByMe = isClaimedByCurrentUser(task, auth);
          const claimable = canClaim(task, auth);
          return (
            <article key={task.id} className={styles.taskCard}>
              <Link href={`/tasks/${task.id}`} className={styles.taskCardLink}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.badge} ${styles.badgeModeBounty}`}>{actionLabel(task)}</span>
                  <span className={`${styles.badge} ${statusClass(task.status)}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                <h3 className={styles.taskTitle}>{task.title}</h3>
                <div className={styles.taskTags}>
                  {task.campaign?.requesterHandle ? (
                    <span className={styles.taskTag}>{task.campaign.requesterHandle}</span>
                  ) : null}
                  {task.campaign?.proofPhrase ? (
                    <span className={styles.taskTag}>{task.campaign.proofPhrase}</span>
                  ) : null}
                  <span className={styles.taskTag}>{task.deadline}</span>
                </div>
                <div className={styles.modeHelp}>
                  <div>{task.acceptance}</div>
                  {task.campaign?.brief ? <div>{task.campaign.brief}</div> : null}
                  {task.campaign?.targetUrl ? <div>{task.campaign.targetUrl}</div> : null}
                </div>
              </Link>

              <div className={styles.taskFooter}>
                <div>
                  <p className={styles.reward}>{formatBudgetLabel(task.budget)}</p>
                  <div className={styles.metaLine}>Updated {new Date(task.updatedAt).toLocaleString()}</div>
                  <div className={styles.requester}>
                    {task.assignee?.type === "human"
                      ? `Claimed by ${task.assignee.name}`
                      : task.campaign?.requesterName || "Official campaign"}
                  </div>
                </div>
                <div className={styles.footerRight}>
                  <Link href={`/tasks/${task.id}`} className={styles.taskOpenLink}>
                    Open Task
                  </Link>
                  {claimable ? (
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={claimingId === task.id}
                      onClick={() => claimTask(task)}
                    >
                      {claimingId === task.id ? "Claiming..." : "Accept Task"}
                    </button>
                  ) : claimedByMe ? (
                    <div className={styles.modeHelp}>
                      <strong>Claimed by you</strong>
                      <Link href="/reviewer">Open reviewer</Link>
                    </div>
                  ) : (
                    <div className={styles.modeHelp}>
                      <strong>{statusLabels[task.status]}</strong>
                      {!authenticated ? (
                        <span>Connect wallet to claim</span>
                      ) : !auth?.human?.id || !auth?.user?.walletAddress ? (
                        <span>Finish `/app/profile` first</span>
                      ) : (
                        <span>Not claimable</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
