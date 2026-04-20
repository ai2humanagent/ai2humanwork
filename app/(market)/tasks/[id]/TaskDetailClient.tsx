"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  getTaskEvidenceFields,
  getTaskSubmissionFields,
  getTaskVerificationStatus
} from "../../../lib/officialCampaignTasks.js";
import {
  DEFAULT_SETTLEMENT_TOKEN_SYMBOL,
  formatBudgetLabel
} from "../../../lib/assetLabels.js";
import {
  fetchWithPrivySessionRetry,
  loadAuthWithPrivySession
} from "../../../lib/clientPrivySession";
import styles from "./detail.module.css";

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
    verificationChecks?: string[];
    submissionFields?: string[];
  };
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
  evidence: EvidenceItem[];
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

type PaymentResult = {
  id?: string;
  amount: string;
  receiver?: string;
  receiverAddress?: string;
  payerAddress?: string;
  method?: string;
  network?: string;
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  source?: string;
  createdAt?: string;
  txHash?: string;
  explorerUrl?: string;
};

type AlternateClaimTask = {
  id: string;
  deadline: string;
  status: "created" | "ai_failed";
};

type VerificationCheck = {
  id: string;
  label: string;
  passed: boolean;
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

function actionLabel(task: Task) {
  if (!task.campaign) return "fallback";
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

function shortValue(value: string, start = 8, end = 6) {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function settlementExplorerLabel(payment: PaymentResult) {
  const network = String(payment.network || "").toLowerCase();
  if (network.includes("bnb")) return "View BNB transaction on BscScan";
  if (network.includes("xlayer")) return "View X Layer transaction";
  if (network.includes("solana")) return "View Solana transaction";
  return "View onchain transaction";
}

function getCachedPayment(taskId: string): PaymentResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`ai2human:task-payment:${taskId}`);
    return raw ? (JSON.parse(raw) as PaymentResult) : null;
  } catch {
    return null;
  }
}

function cachePayment(taskId: string, payment: PaymentResult) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`ai2human:task-payment:${taskId}`, JSON.stringify(payment));
  } catch {
    // Ignore storage failures; the live response still renders the receipt.
  }
}

export default function TaskDetailClient({
  initialTask,
  initialPayment,
  initialAlternateClaimTask
}: {
  initialTask: Task;
  initialPayment: PaymentResult | null;
  initialAlternateClaimTask: AlternateClaimTask | null;
}) {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const [task, setTask] = useState(initialTask);
  const [latestPayment, setLatestPayment] = useState<PaymentResult | null>(initialPayment);
  const [alternateClaimTask, setAlternateClaimTask] = useState<AlternateClaimTask | null>(
    initialAlternateClaimTask
  );
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [executorHandle, setExecutorHandle] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [timestampNote, setTimestampNote] = useState("");
  const [proofPhrase, setProofPhrase] = useState(initialTask.campaign?.proofPhrase || "");
  const [summary, setSummary] = useState("");
  const connectedWallet =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  async function loadTask() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${initialTask.id}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        task?: Task;
        payment?: PaymentResult | null;
        alternateClaimTask?: AlternateClaimTask | null;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load task.");
      }
      if (!payload.task) {
        throw new Error("Task payload missing.");
      }
      setTask(payload.task);
      setLatestPayment((current) => payload.payment || current || getCachedPayment(initialTask.id));
      setAlternateClaimTask(payload.alternateClaimTask || null);
      if (payload.task.campaign?.proofPhrase) {
        setProofPhrase((current) => current || payload.task?.campaign?.proofPhrase || "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load task.");
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
    if (!payload) {
      setAuth(null);
      return;
    }
    setAuth(payload);
    if (payload.human?.handle) {
      setExecutorHandle((current) => current || `@${payload.human?.handle}`);
    }
  }

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    const cachedPayment = getCachedPayment(initialTask.id);
    if (cachedPayment) {
      setLatestPayment((current) => current || cachedPayment);
    }
  }, [initialTask.id]);

  useEffect(() => {
    loadTask();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadAuth();
  }, [ready, authenticated, getAccessToken, connectedWallet]);

  const evidenceFields = useMemo(() => getTaskEvidenceFields(task), [task]);
  const claimedByMe = useMemo(() => isClaimedByCurrentUser(task, auth), [task, auth]);
  const claimable = useMemo(() => canClaim(task, auth), [task, auth]);
  const verificationStatus = useMemo(() => getTaskVerificationStatus(task), [task]);
  const submissionFields = useMemo(() => getTaskSubmissionFields(task), [task]);
  const rewardLabel = useMemo(() => formatBudgetLabel(task.budget), [task.budget]);
  const requiresExecutorHandle = submissionFields.includes("executorHandle");
  const requiresPostUrl = submissionFields.includes("postUrl");
  const requiresProfileUrl = submissionFields.includes("profileUrl");
  const requiresPhoto = submissionFields.includes("photo");
  const requiresLocationNote = submissionFields.includes("locationNote");
  const requiresTimestampNote = submissionFields.includes("timestampNote");
  const requiresProofPhrase = submissionFields.includes("proofPhrase");
  const targetLabel = task.campaign?.platform === "x"
    ? "Official link"
    : task.campaign?.targetLabel || "Reference";
  const proofPhraseLabel = task.campaign?.platform === "x"
    ? "Required Phrase"
    : "Verification Code / Phrase";
  const photoLabel = task.campaign?.platform === "x" ? "Proof URL or Screenshot URL" : "Proof Photo URL";
  const photoPlaceholder = task.campaign?.platform === "x"
    ? "Leave blank to reuse your live post/profile URL, or paste an image URL"
    : "https://... or /path/to/photo";
  const summaryPlaceholder = task.campaign?.platform === "x"
    ? "One-line summary of what you published and where."
    : "One-line summary of what you checked, picked up, or verified on site.";
  const canEditProof =
    claimedByMe && (task.status === "human_assigned" || task.status === "human_done");
  const isClosedProofRecord = ["human_done", "verified", "paid"].includes(task.status);

  useEffect(() => {
    const values = (evidenceFields.values || {}) as Record<string, string>;
    const firstScreenshot = evidenceFields.screenshots?.[evidenceFields.screenshots.length - 1] || "";

    if (values.executor_handle) {
      setExecutorHandle(values.executor_handle);
    }
    if (values.post_url) {
      setPostUrl(values.post_url);
    }
    if (values.profile_url) {
      setProfileUrl(values.profile_url);
    }
    if (values.location_note) {
      setLocationNote(values.location_note);
    }
    if (values.timestamp_note) {
      setTimestampNote(values.timestamp_note);
    }
    if (values.proof_phrase) {
      setProofPhrase(values.proof_phrase);
    }
    if (values.summary) {
      setSummary(values.summary);
    }
    if (firstScreenshot) {
      setScreenshotUrl(firstScreenshot);
    }
  }, [evidenceFields]);

  async function claimTask() {
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

    setClaiming(true);
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
      await Promise.all([loadTask(), loadAuth()]);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Unable to claim task.");
    } finally {
      setClaiming(false);
    }
  }

  async function submitProof() {
    setError("");
    setMessage("");

    if (!claimedByMe) {
      setError("Claim the task before submitting proof.");
      return;
    }

    setSubmitting(true);
    try {
      const proofArtifactUrl = requiresPhoto
        ? screenshotUrl.trim() || postUrl.trim() || profileUrl.trim() || undefined
        : undefined;
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            by: "human",
            executorHandle: requiresExecutorHandle ? executorHandle : undefined,
            postUrl: requiresPostUrl ? postUrl : undefined,
            profileUrl: requiresProfileUrl ? profileUrl : profileUrl || undefined,
            screenshotUrl: proofArtifactUrl,
            locationNote: requiresLocationNote ? locationNote : undefined,
            timestampNote: requiresTimestampNote ? timestampNote : undefined,
            proofPhrase: requiresProofPhrase ? proofPhrase : undefined,
            summary
          })
        },
        {
          authenticated,
          getAccessToken,
          walletAddress: connectedWallet
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        task?: Task;
        payment?: PaymentResult;
      };
      if (payload.task) {
        setTask(payload.task);
      } else {
        await loadTask();
      }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit proof.");
      }
      if (payload.payment) {
        setLatestPayment(payload.payment);
        cachePayment(task.id, payload.payment);
        setMessage(
          `Proof verified and ${payload.payment.amount} ${
            payload.payment.tokenSymbol || DEFAULT_SETTLEMENT_TOKEN_SYMBOL
          } sent to ${
            payload.payment.receiverAddress || payload.payment.receiver || "the executor"
          }.`
        );
      } else {
        setMessage("Proof submitted and verified.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit proof.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarLinks}>
          <Link href="/tasks">← Back to tasks</Link>
          <Link href="/app/profile">Operator profile</Link>
          <Link href="/reviewer">Reviewer console</Link>
        </div>
        <span>{loading ? "Refreshing..." : `Updated ${new Date(task.updatedAt).toLocaleString()}`}</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroHead}>
          <div>
            <p className={styles.eyebrow}>Task Execution</p>
            <h1 className={styles.title}>{task.title}</h1>
            <p className={styles.lead}>
              {task.campaign?.brief || task.acceptance}
            </p>
          </div>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeAccent}`}>{actionLabel(task)}</span>
            <span className={styles.badge}>{statusLabels[task.status]}</span>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <span>Reward</span>
            <strong>{rewardLabel}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Deadline</span>
            <strong>{task.deadline}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Requester</span>
            <strong>{task.campaign?.requesterHandle || task.campaign?.requesterName || "Official campaign"}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Payout target</span>
            <strong>{task.assignee?.walletAddress || auth?.user?.walletAddress || "Connect wallet first"}</strong>
          </div>
        </div>
      </section>

      {error ? <div className={styles.warning}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <section className={styles.layout}>
        <div className={styles.stack}>
          <article className={styles.card}>
            <h2>Execution brief</h2>
            <div className={styles.mutedList}>
              <p>{task.acceptance}</p>
              {task.campaign?.targetUrl ? (
                <p>
                  {targetLabel}:{" "}
                  <a href={task.campaign.targetUrl} target="_blank" rel="noreferrer">
                    {task.campaign.targetUrl}
                  </a>
                </p>
              ) : null}
              {task.campaign?.proofPhrase ? <p>{proofPhraseLabel}: {task.campaign.proofPhrase}</p> : null}
            </div>
          </article>

          <article className={styles.card}>
            <h2>Proof requirements</h2>
            <ul className={styles.list}>
              {(task.campaign?.proofRequirements || [task.acceptance]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Automated proof check</h2>
            <div className={styles.verificationSummary}>
              <div className={verificationStatus.ok ? styles.success : styles.warning}>
                {verificationStatus.ok
                  ? "The current proof package passes automated checks and is ready for reviewer approval."
                  : "The current proof package is incomplete or inconsistent. Fix the failed items below and resubmit proof."}
              </div>
            </div>
            <div className={styles.checkList}>
              {verificationStatus.checks.map((check: VerificationCheck) => (
                <div key={check.id} className={styles.checkItem}>
                  <span className={check.passed ? styles.checkPassed : styles.checkFailed}>
                    {check.passed ? "Passed" : "Missing"}
                  </span>
                  <strong>{check.label}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <h2>Evidence timeline</h2>
            <div className={styles.timeline}>
              {task.evidence.length === 0 ? <p>No proof submitted yet.</p> : null}
              {task.evidence.map((item) => (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineMeta}>
                    <span>{item.by}</span>
                    <span>{item.type}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className={styles.stack}>
          {latestPayment ? (
            <article className={styles.card}>
              <h2>Settlement proof</h2>
              <div className={styles.settlementGrid}>
                <div className={styles.settlementItem}>
                  <span>Amount</span>
                  <strong>{latestPayment.amount}</strong>
                </div>
                <div className={styles.settlementItem}>
                  <span>Token</span>
                  <strong>{latestPayment.tokenSymbol || DEFAULT_SETTLEMENT_TOKEN_SYMBOL}</strong>
                </div>
                <div className={styles.settlementItem}>
                  <span>Method</span>
                  <strong>{latestPayment.method || "unknown"}</strong>
                </div>
                <div className={styles.settlementItem}>
                  <span>Network</span>
                  <strong>{latestPayment.network || "demo"}</strong>
                </div>
              </div>

              <div className={styles.settlementStack}>
                {latestPayment.payerAddress ? (
                  <div className={styles.settlementRow}>
                    <span>Payer</span>
                    <strong title={latestPayment.payerAddress}>
                      {shortValue(latestPayment.payerAddress)}
                    </strong>
                  </div>
                ) : null}
                {(latestPayment.receiverAddress || latestPayment.receiver) ? (
                  <div className={styles.settlementRow}>
                    <span>Receiver</span>
                    <strong
                      title={latestPayment.receiverAddress || latestPayment.receiver}
                    >
                      {latestPayment.receiverAddress
                        ? shortValue(latestPayment.receiverAddress)
                        : latestPayment.receiver}
                    </strong>
                  </div>
                ) : null}
                {latestPayment.txHash ? (
                  <div className={styles.settlementRow}>
                    <span>Transaction hash</span>
                    <strong className={styles.hashValue} title={latestPayment.txHash}>
                      {latestPayment.txHash}
                    </strong>
                  </div>
                ) : null}
                {latestPayment.explorerUrl ? (
                  <div className={styles.settlementActions}>
                    <a href={latestPayment.explorerUrl} target="_blank" rel="noreferrer">
                      {settlementExplorerLabel(latestPayment)}
                    </a>
                  </div>
                ) : (
                  <div className={styles.notice}>
                    This settlement was recorded without an onchain explorer link.
                  </div>
                )}
              </div>
            </article>
          ) : null}

          <article className={styles.card}>
            <h2>Take task</h2>
            {isClosedProofRecord && alternateClaimTask ? (
              <div className={styles.form}>
                <div className={styles.notice}>
                  This task record is already closed and kept as public proof. To execute the same
                  template with another account, claim a fresh live slot instead.
                </div>
                <Link href={`/tasks/${alternateClaimTask.id}`} className={styles.button}>
                  Claim Another Live Slot ({alternateClaimTask.deadline})
                </Link>
              </div>
            ) : !authenticated ? (
              <div className={styles.form}>
                <div className={styles.notice}>Connect your Privy wallet before claiming the task.</div>
                <button type="button" className={styles.button} onClick={() => login()}>
                  Connect Wallet
                </button>
              </div>
            ) : !auth?.human?.id || !auth?.user?.walletAddress ? (
              <div className={styles.form}>
                <div className={styles.notice}>
                  Finish your operator profile first. Claiming requires both an operator identity and a payout wallet.
                </div>
                <Link href="/app/profile" className={styles.button}>
                  Complete Operator Profile
                </Link>
              </div>
            ) : claimable ? (
              <div className={styles.form}>
                <div className={styles.notice}>
                  You are payout-ready as {auth.human?.name}. Claiming this task will bind settlement to your connected wallet.
                </div>
                <button
                  type="button"
                  className={styles.button}
                  disabled={claiming}
                  onClick={claimTask}
                >
                  {claiming ? "Claiming..." : "Accept Task"}
                </button>
              </div>
            ) : claimedByMe ? (
              <div className={styles.form}>
                <div className={styles.success}>This task is already claimed by you.</div>
                <div className={styles.notice}>Submit proof below. If the proof passes validation, settlement will be released automatically.</div>
              </div>
            ) : task.assignee?.type === "human" ? (
              <div className={styles.form}>
                <div className={styles.notice}>This task is currently assigned to {task.assignee.name}.</div>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.notice}>This task is not claimable in its current state.</div>
              </div>
            )}
          </article>

          <article className={styles.card}>
            <h2>Submit proof</h2>
            {!claimedByMe ? (
              <div className={styles.notice}>Claim this task with your operator account to unlock proof submission.</div>
            ) : !canEditProof ? (
              <div className={styles.notice}>
                Proof editing is closed for this task. Current status: {statusLabels[task.status]}.
              </div>
            ) : (
              <div className={styles.form}>
                {task.status === "human_done" ? (
                  <div className={verificationStatus.ok ? styles.success : styles.warning}>
                    {verificationStatus.ok
                      ? "Proof is already submitted and passes automated checks. You can still resubmit if you need to replace the evidence."
                      : "Proof is already submitted, but the automated check is failing. Update the fields below and resubmit."}
                  </div>
                ) : null}
                {requiresExecutorHandle ? (
                  <div className={styles.field}>
                    <label htmlFor="executorHandle">X Handle</label>
                    <input
                      id="executorHandle"
                      className={styles.input}
                      value={executorHandle}
                      onChange={(event) => setExecutorHandle(event.target.value)}
                      placeholder="@yourhandle"
                    />
                  </div>
                ) : null}

                <div className={styles.row2}>
                  {requiresPostUrl ? (
                    <div className={styles.field}>
                      <label htmlFor="postUrl">Live Post URL</label>
                      <input
                        id="postUrl"
                        className={styles.input}
                        value={postUrl}
                        onChange={(event) => setPostUrl(event.target.value)}
                        placeholder="https://x.com/yourhandle/status/..."
                      />
                    </div>
                  ) : null}

                  {requiresProfileUrl ? (
                    <div className={styles.field}>
                      <label htmlFor="profileUrl">Profile URL</label>
                      <input
                        id="profileUrl"
                        className={styles.input}
                        value={profileUrl}
                        onChange={(event) => setProfileUrl(event.target.value)}
                        placeholder="https://x.com/yourhandle"
                      />
                    </div>
                  ) : null}
                </div>

                {requiresPhoto ? (
                  <div className={styles.field}>
                    <label htmlFor="screenshotUrl">{photoLabel}</label>
                    <input
                      id="screenshotUrl"
                      className={styles.input}
                      value={screenshotUrl}
                      onChange={(event) => setScreenshotUrl(event.target.value)}
                      placeholder={photoPlaceholder}
                    />
                    {task.campaign?.platform === "x" ? (
                      <p className={styles.fieldHelp}>
                        You can reuse the same live X post/profile URL here. A separate image is optional for demo flow.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {requiresLocationNote ? (
                  <div className={styles.field}>
                    <label htmlFor="locationNote">Location Note</label>
                    <input
                      id="locationNote"
                      className={styles.input}
                      value={locationNote}
                      onChange={(event) => setLocationNote(event.target.value)}
                      placeholder="Store name, entrance, desk, or pickup point"
                    />
                  </div>
                ) : null}

                {requiresTimestampNote ? (
                  <div className={styles.field}>
                    <label htmlFor="timestampNote">Timestamp Note</label>
                    <input
                      id="timestampNote"
                      className={styles.input}
                      value={timestampNote}
                      onChange={(event) => setTimestampNote(event.target.value)}
                      placeholder="Checked at 2026-03-23 19:40 local time"
                    />
                  </div>
                ) : null}

                {requiresProofPhrase ? (
                  <div className={styles.field}>
                    <label htmlFor="proofPhrase">{proofPhraseLabel}</label>
                    <input
                      id="proofPhrase"
                      className={styles.input}
                      value={proofPhrase}
                      onChange={(event) => setProofPhrase(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className={styles.field}>
                  <label htmlFor="summary">Execution Summary</label>
                  <textarea
                    id="summary"
                    className={styles.textarea}
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder={summaryPlaceholder}
                  />
                </div>

                <div className={styles.ctaRow}>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={submitting}
                    onClick={submitProof}
                  >
                    {submitting ? "Submitting..." : task.status === "human_done" ? "Resubmit Proof" : "Submit Proof"}
                  </button>
                  <button type="button" className={styles.buttonGhost} onClick={loadTask}>
                    Refresh Task
                  </button>
                </div>
              </div>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}
