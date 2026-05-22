"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { loadAuthWithPrivySession } from "../../../lib/clientPrivySession";
import styles from "../../market.module.css";

type TwitterTaskType = "follow" | "like" | "retweet" | "comment";

type TwitterTask = {
  id: string;
  type: TwitterTaskType;
  platform: "x";
  title: string;
  description: string;
  targetUsername?: string;
  targetTweetId?: string;
  targetUrl?: string;
  reward: string;
  currency: string;
  status: "available" | "verifying" | "success" | "failed" | "cooldown";
  cooldownHours?: number;
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

const TWITTER_ICONS: Record<TwitterTaskType, string> = {
  follow: "🐦",
  like: "❤️",
  retweet: "🔁",
  comment: "💬"
};

const ACTION_LABELS: Record<TwitterTaskType, string> = {
  follow: "Follow",
  like: "Like",
  retweet: "Repost",
  comment: "Comment"
};

function TwitterTaskCard({
  task,
  auth,
  onVerify
}: {
  task: TwitterTask;
  auth: AuthPayload | null;
  onVerify: (taskId: string) => void;
}) {
  const [userTaskStatus, setUserTaskStatus] = useState<"available" | "verifying" | "success" | "failed" | "cooldown">(task.status);
  const [cooldownRemaining, setCooldownRemaining] = useState<string>("");

  useEffect(() => {
    if (userTaskStatus === "cooldown") {
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (!prev) return "";
          const match = prev.match(/(\d+)\s*hours?\s*(\d+)\s*mins?/);
          if (match) {
            const hours = parseInt(match[1]);
            const mins = parseInt(match[2]);
            const totalMins = hours * 60 + mins - 1;
            if (totalMins <= 0) {
              setUserTaskStatus("available");
              return "";
            }
            return `${Math.floor(totalMins / 60)} hours ${totalMins % 60} mins`;
          }
          return prev;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [userTaskStatus]);

  const handleGoToX = () => {
    if (task.targetUrl) {
      window.open(task.targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isVerifying = userTaskStatus === "verifying";
  const isSuccess = userTaskStatus === "success";
  const isFailed = userTaskStatus === "failed";
  const isCooldown = userTaskStatus === "cooldown";
  const isAvailable = userTaskStatus === "available";

  return (
    <div className={styles.twitterTaskCard}>
      <div className={styles.twitterTaskHeader}>
        <span className={styles.twitterTaskIcon}>{TWITTER_ICONS[task.type]}</span>
        <div className={styles.twitterTaskInfo}>
          <h3 className={styles.twitterTaskTitle}>{task.title}</h3>
          <p className={styles.twitterTaskDesc}>{task.description}</p>
        </div>
        <div className={styles.twitterTaskReward}>
          <span className={styles.rewardBadge}>+{task.reward} USDC</span>
        </div>
      </div>

      <div className={styles.twitterTaskActions}>
        {isAvailable || isFailed ? (
          <>
            <button
              type="button"
              className={styles.twitterGoButton}
              onClick={handleGoToX}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Go to X
            </button>
            <button
              type="button"
              className={styles.twitterVerifyButton}
              onClick={() => onVerify(task.id)}
              disabled={!auth?.human?.id || !auth?.user?.walletAddress}
            >
              Verify
            </button>
          </>
        ) : isVerifying ? (
          <div className={styles.twitterVerifying}>
            <div className={styles.spinner} />
            <span>Verifying...</span>
          </div>
        ) : isSuccess ? (
          <div className={styles.twitterSuccess}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Verified!</span>
          </div>
        ) : isCooldown ? (
          <div className={styles.twitterCooldown}>
            <span>Cooldown: {cooldownRemaining}</span>
          </div>
        ) : null}
      </div>

      {!auth?.human?.id && (
        <p className={styles.twitterConnectHint}>Connect wallet and complete profile to earn</p>
      )}
    </div>
  );
}

export default function TwitterTasksClient() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const [tasks, setTasks] = useState<TwitterTask[]>([]);
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<{ taskId: string; message: string; success: boolean; payment?: Record<string, unknown> } | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "available" | "completed">("available");

  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  async function loadTasks() {
    try {
      const response = await fetch("/api/verify/twitter", { cache: "no-store" });
      const payload = (await response.json().catch(() => [])) as TwitterTask[];
      setTasks(payload);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuth() {
    const payload = await loadAuthWithPrivySession<AuthPayload>({
      authenticated,
      getAccessToken,
      walletAddress: connectedWallet
    });
    if (payload) {
      setAuth(payload);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) {
      setAuth(null);
      return;
    }
    loadAuth();
  }, [ready, authenticated, getAccessToken, connectedWallet]);

  async function handleVerify(taskId: string) {
    if (!auth?.human?.id || !auth?.user?.walletAddress) {
      return;
    }

    setVerifyingTaskId(taskId);
    setResultMessage(null);

    // Optimistically update UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "verifying" as const } : t))
    );

    try {
      const response = await fetch("/api/verify/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          taskId,
          humanId: auth.human.id,
          walletAddress: auth.user.walletAddress
        })
      });

      const payload = (await response.json()) as {
        success: boolean;
        verified: boolean;
        message: string;
        payment?: Record<string, unknown>;
        cooldownUntil?: string;
        status?: string;
      };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: payload.success ? "success" : "failed",
                cooldownHours: payload.cooldownUntil ? 24 : undefined
              }
            : t
        )
      );

      if (payload.status === "cooldown") {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "cooldown" as const } : t
          )
        );
      }

      setResultMessage({
        taskId,
        message: payload.message,
        success: payload.success,
        payment: payload.payment
      });
    } catch (error) {
      console.error("Verification failed", error);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "failed" as const } : t
        )
      );
    } finally {
      setVerifyingTaskId(null);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === "available") {
      return task.status === "available";
    }
    if (activeFilter === "completed") {
      return task.status === "success" || task.status === "cooldown";
    }
    return true;
  });

  const stats = {
    total: tasks.length,
    available: tasks.filter((t) => t.status === "available").length,
    completed: tasks.filter((t) => t.status === "success" || t.status === "cooldown").length
  };

  return (
    <section>
      <header className={styles.pageHeader}>
        <h1>🐦 Twitter Tasks</h1>
        <p className={styles.pageLead}>
          Complete simple Twitter actions and earn USDC. Tasks auto-verify and settle onchain instantly.
        </p>
      </header>

      {/* Stats */}
      <div className={styles.twitterStatsRow}>
        <div className={styles.twitterStatCard}>
          <span className={styles.twitterStatNumber}>{stats.total}</span>
          <span className={styles.twitterStatLabel}>Total Tasks</span>
        </div>
        <div className={styles.twitterStatCard}>
          <span className={styles.twitterStatNumber}>{stats.available}</span>
          <span className={styles.twitterStatLabel}>Available</span>
        </div>
        <div className={styles.twitterStatCard}>
          <span className={styles.twitterStatNumber}>{stats.completed}</span>
          <span className={styles.twitterStatLabel}>Completed</span>
        </div>
      </div>

      {/* Result message */}
      {resultMessage && (
        <div className={resultMessage.success ? styles.success : styles.alert}>
          <p>{resultMessage.message}</p>
          {resultMessage.payment && resultMessage.success && (
            <div className={styles.settlementInfo}>
              {resultMessage.payment.txHash ? (
                <a
                  href={resultMessage.payment.explorerUrl as string}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.explorerLink}
                >
                  View transaction →
                </a>
              ) : (
                <span className={styles.demoNote}>Settlement recorded (demo mode)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.twitterFilterTabs}>
        {(["available", "completed", "all"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`${styles.twitterFilterTab} ${activeFilter === filter ? styles.twitterFilterTabActive : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className={styles.placeholderCard}>
          <p>Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={styles.placeholderCard}>
          <h1>No tasks found</h1>
          <p>Try switching to a different filter or check back later.</p>
        </div>
      ) : (
        <div className={styles.twitterTasksGrid}>
          {filteredTasks.map((task) => (
            <TwitterTaskCard
              key={task.id}
              task={task}
              auth={auth}
              onVerify={handleVerify}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className={styles.howItWorks}>
        <h2>How it works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3>Pick a Task</h3>
            <p>Browse available Twitter tasks and find ones you can complete.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3>Go to X</h3>
            <p>Click &quot;Go to X&quot; and complete the action: follow, like, repost, or comment.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3>Verify</h3>
            <p>Click &quot;Verify&quot; and wait 2-3 seconds while we confirm your action.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <h3>Get Paid</h3>
            <p>USDC is sent directly to your wallet — no manual payout, no waiting.</p>
          </div>
        </div>
      </div>
    </section>
  );
}