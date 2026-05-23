"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "../market.module.css";
import { formatBudgetLabel } from "../../lib/assetLabels.js";
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
  rewardDistribution?: {
    totalPool?: string;
    perWinner?: string;
    maxWinners?: number;
    mode?: string;
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
  if (!task.campaign) return "Task";
  if (task.campaign.label) return task.campaign.label;
  if (task.campaign.platform === "x") return `x ${task.campaign.action}`;
  return task.campaign.action.replace(/_/g, " ");
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

export default function TaskListClient({ justCreated, searchQuery }: { justCreated: boolean; searchQuery?: string }) {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [rewardType, setRewardType] = useState("all");
  const [claimingId, setClaimingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
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
    let result = tasks.filter((task) => {
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

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.campaign?.brief || "").toLowerCase().includes(q) ||
          (t.campaign?.requesterName || "").toLowerCase().includes(q)
      );
    }

    if (rewardType === "token") {
      result = result.filter((t) => t.campaign?.platform !== "real_world");
    } else if (rewardType === "social") {
      result = result.filter((t) => t.campaign?.platform === "x");
    }

    if (sort === "newest") {
      result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === "reward") {
      result = [...result].sort((a, b) => parseReward(b.budget) - parseReward(a.budget));
    }

    return result;
  }, [tasks, filter, sort, rewardType, auth, searchQuery]);

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
          Earn by completing tasks across social and real-world execution. Connect a wallet, claim, and submit proof for onchain settlement.
        </p>
      </header>

      {justCreated ? <div className={styles.success}>Task created and added to the live board.</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.alert}>{error}</div> : null}

      <div className={styles.questSortRow}>
        <div className={styles.questSortTabs}>
          {[
            { key: "newest", label: "Newest" },
            { key: "reward", label: "Top Reward" }
          ].map((tab) => (
            <button
              key={tab.key}
              className={`${styles.questSortTab} ${sort === tab.key ? styles.questSortTabActive : ""}`}
              onClick={() => setSort(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.questFilterPills}>
          {[
            { key: "all", label: "All" },
            { key: "token", label: "Token" },
            { key: "social", label: "Social" }
          ].map((pill) => (
            <button
              key={pill.key}
              className={`${styles.questPill} ${rewardType === pill.key ? styles.questPillActive : ""}`}
              onClick={() => setRewardType(pill.key)}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className={styles.questStatusFilter}>
          {[
            { key: "available", label: "Available" },
            { key: "mine", label: "My Tasks" }
          ].map((opt) => (
            <button
              key={opt.key}
              className={`${styles.questStatusBtn} ${filter === opt.key ? styles.questStatusBtnActive : ""}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className={styles.placeholderCard}><p>Loading live tasks...</p></div> : null}
      {!loading && filtered.length === 0 ? (
        <div className={styles.placeholderCard}>
          <h1>No tasks found</h1>
          <p>Create a campaign task or switch the board filter.</p>
        </div>
      ) : null}

      <div className={styles.tasksGrid}>
        {filtered.map((task) => {
          const claimedByMe = isClaimedByCurrentUser(task, auth);
          const claimable = canClaim(task, auth);
          return (
            <article key={task.id} className={styles.questCard}>
              <Link href={`/tasks/${task.id}`} className={styles.questCardLink}>
                <div className={styles.questCardBody}>
                  <div className={styles.questCardMeta}>
                    <img className={styles.questLogo} src="/icon.png" alt="" />
                    <span className={styles.questRequester}>
                      {task.campaign?.requesterName || "Official"}
                    </span>
                    <span className={styles.questBadge}>{actionLabel(task)}</span>
                  </div>
                  <h3 className={styles.questTitle}>{task.title}</h3>
                </div>
              </Link>
              <div className={styles.questCardFooter}>
                <div className={styles.questRewardBlock}>
                  <span className={styles.questRewardBadge}>
                    {task.rewardDistribution?.totalPool ?? formatBudgetLabel(task.budget)}
                  </span>
                  {task.rewardDistribution && task.rewardDistribution.maxWinners && task.rewardDistribution.maxWinners > 1 ? (
                    <span className={styles.questWinners}>
                      · {task.rewardDistribution.maxWinners} winners
                    </span>
                  ) : null}
                </div>
                <div className={styles.footerRight}>
                  {claimable ? (
                    <button
                      type="button"
                      className={styles.questClaimBtn}
                      disabled={claimingId === task.id}
                      onClick={() => claimTask(task)}
                    >
                      {claimingId === task.id ? "..." : "Claim"}
                    </button>
                  ) : claimedByMe ? (
                    <span className={styles.questClaimedBadge}>Yours</span>
                  ) : (
                    <span className={styles.questStatusMini}>{statusLabels[task.status]}</span>
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
