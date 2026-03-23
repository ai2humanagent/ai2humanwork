"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  getTaskEvidenceFields,
  getTaskVerificationStatus
} from "../../../lib/officialCampaignTasks.js";
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
    action: "post" | "quote" | "reply" | "repost";
    targetUrl?: string;
    proofPhrase?: string;
    brief?: string;
    proofRequirements: string[];
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
  amount: string;
  receiver?: string;
  receiverAddress?: string;
  method?: string;
  tokenSymbol?: string;
  txHash?: string;
  explorerUrl?: string;
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
  return `x ${task.campaign.action}`;
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

export default function TaskDetailClient({ initialTask }: { initialTask: Task }) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [task, setTask] = useState(initialTask);
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
  const [proofPhrase, setProofPhrase] = useState(initialTask.campaign?.proofPhrase || "");
  const [summary, setSummary] = useState("");

  async function loadTask() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${initialTask.id}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => ({}))) as Task & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load task.");
      }
      setTask(payload);
      if (payload.campaign?.proofPhrase) {
        setProofPhrase((current) => current || payload.campaign?.proofPhrase || "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load task.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAuth() {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) {
      setAuth(null);
      return;
    }
    const payload = (await response.json()) as AuthPayload;
    setAuth(payload);
    if (payload.human?.handle) {
      setExecutorHandle((current) => current || `@${payload.human?.handle}`);
    }
  }

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadAuth();
  }, [ready, authenticated]);

  const evidenceFields = useMemo(() => getTaskEvidenceFields(task), [task]);
  const claimedByMe = useMemo(() => isClaimedByCurrentUser(task, auth), [task, auth]);
  const claimable = useMemo(() => canClaim(task, auth), [task, auth]);
  const verificationStatus = useMemo(() => getTaskVerificationStatus(task), [task]);
  const requiresProfileUrl = task.campaign?.action === "repost";
  const requiresPostUrl = task.campaign?.action !== "repost";
  const canEditProof =
    claimedByMe && (task.status === "human_assigned" || task.status === "human_done");

  useEffect(() => {
    const values = evidenceFields.values || {};
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
      const response = await fetch(`/api/tasks/${task.id}/claim`, {
        method: "POST",
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to claim task.");
      }
      setMessage(`Claimed "${task.title}" as ${auth.human.name}.`);
      await loadTask();
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
      const response = await fetch(`/api/tasks/${task.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          by: "human",
          executorHandle,
          postUrl: requiresPostUrl ? postUrl : undefined,
          profileUrl: requiresProfileUrl ? profileUrl : profileUrl || undefined,
          screenshotUrl,
          proofPhrase,
          summary
        })
      });
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
        setMessage(
          `Proof verified and ${payload.payment.amount} ${payload.payment.tokenSymbol || "USDT"} sent to ${
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
            <strong>{task.budget}</strong>
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
                  Official link:{" "}
                  <a href={task.campaign.targetUrl} target="_blank" rel="noreferrer">
                    {task.campaign.targetUrl}
                  </a>
                </p>
              ) : null}
              {task.campaign?.proofPhrase ? <p>Required phrase: {task.campaign.proofPhrase}</p> : null}
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
          <article className={styles.card}>
            <h2>Take task</h2>
            {!authenticated ? (
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

                  <div className={styles.field}>
                    <label htmlFor="profileUrl">{requiresProfileUrl ? "Profile URL" : "Optional Profile URL"}</label>
                    <input
                      id="profileUrl"
                      className={styles.input}
                      value={profileUrl}
                      onChange={(event) => setProfileUrl(event.target.value)}
                      placeholder="https://x.com/yourhandle"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="screenshotUrl">Screenshot URL</label>
                  <input
                    id="screenshotUrl"
                    className={styles.input}
                    value={screenshotUrl}
                    onChange={(event) => setScreenshotUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                {task.campaign?.proofPhrase ? (
                  <div className={styles.field}>
                    <label htmlFor="proofPhrase">Required Phrase</label>
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
                    placeholder="One-line summary of what you published and where."
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
