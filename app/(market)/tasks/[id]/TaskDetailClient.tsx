"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  taskType?: "twitter_follow" | "twitter_like" | "twitter_retweet" | "twitter_comment" | "physical";
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
  agentId?: string;
  rewardDistribution?: {
    mode: "fcfs" | "lucky_draw" | "equal";
    totalPool: string;
    perWinner?: string;
    maxWinners: number;
    drawTime?: string;
  };
  taskState?: "open" | "full" | "closed" | "refunded";
};

type AuthPayload = {
  user: {
    id: string;
    walletAddress?: string;
    xAccount?: {
      subject: string;
      username: string;
      name?: string;
      profilePictureUrl?: string;
    };
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

type Quester = {
  wallet: string;
  avatarSeed: number;
  verifiedAt?: string;
};

type QuestersData = {
  count: number;
  claimedCount: number;
  questers: Quester[];
};

function useCountdown(targetDate: string | undefined) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, min: 0, sec: 0, ended: !targetDate });

  useEffect(() => {
    if (!targetDate) {
      setRemaining({ days: 0, hours: 0, min: 0, sec: 0, ended: true });
      return;
    }
    const target = new Date(targetDate).getTime();
    function tick() {
      const diff = Math.max(0, target - Date.now());
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, min: 0, sec: 0, ended: true });
        return;
      }
      const sec = Math.floor(diff / 1000) % 60;
      const min = Math.floor(diff / 60000) % 60;
      const hours = Math.floor(diff / 3600000) % 24;
      const days = Math.floor(diff / 86400000);
      setRemaining({ days, hours, min, sec, ended: false });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return remaining;
}

function distributionModeLabel(mode?: string): string {
  if (mode === "fcfs") return "FCFS";
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "equal") return "Equal Split";
  return "FCFS";
}

function avatarColor(seed: number): string {
  const hue = seed % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

function shortWallet(wallet: string): string {
  if (wallet.length <= 8) return wallet;
  return `${wallet.slice(0, 4)}..${wallet.slice(-3)}`;
}

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

function shortValue(value: string, start = 8, end = 6) {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function settlementExplorerLabel(payment: PaymentResult) {
  const network = String(payment.network || "").toLowerCase();
  if (network.includes("base")) return "View Base transaction on Basescan";
  if (network.includes("bnb")) return "View BNB transaction on BscScan";
  if (network.includes("xlayer")) return "View X Layer transaction";
  if (network.includes("solana")) return "View Solana transaction";
  return "View onchain transaction";
}

function isLocalMockPayment(payment: PaymentResult) {
  return payment.method === "mock_x402" || !payment.txHash || !payment.explorerUrl;
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
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  // CAPTCHA state for bot protection
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [signingInProgress, setSigningInProgress] = useState(false);
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
  // Per-task interaction state for QuestN-style task list
  type TaskItemState = { actionClicked: boolean; verifying: boolean; verified: boolean };
  const [taskStates, setTaskStates] = useState<Record<string, TaskItemState>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({ "0": true });
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimResult, setClaimResult] = useState<PaymentResult | null>(null);
  const [xHandle, setXHandle] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`ai2human:xhandle:${initialTask.id}`);
      if (cached) return cached;
    }
    return "";
  });
  const [questProgressLoaded, setQuestProgressLoaded] = useState(false);
  const [questersData, setQuestersData] = useState<QuestersData>({ count: 0, claimedCount: 0, questers: [] });
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  // Prioritize external wallet (MetaMask etc.) over Privy embedded wallet
  const rawWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;
  // Only trust wallet address if user is actually authenticated
  const connectedWallet = (ready && authenticated) ? rawWallet : undefined;

  const isTwitterTask = ["twitter_follow", "twitter_like", "twitter_retweet", "twitter_comment"].includes(task.taskType || "");

  // Countdown for reward card
  const dist = task.rewardDistribution;
  const countdownTarget = dist?.drawTime || task.deadline || undefined;
  const countdown = useCountdown(countdownTarget);
  const distMode = distributionModeLabel(dist?.mode);
  const maxWinners = dist?.maxWinners || 1;
  const boundXAccount = auth?.user.xAccount;
  const hasBoundXAccount = Boolean(boundXAccount?.username);

  function cacheXHandle(handle: string) {
    setXHandle(handle);
    if (typeof window !== "undefined") {
      localStorage.setItem(`ai2human:xhandle:${initialTask.id}`, handle);
    }
  }

  function requireBoundXAccount() {
    if (!connectedWallet) {
      login();
      return false;
    }
    if (!hasBoundXAccount) {
      setError("Bind your X account from Profile before doing tasks.");
      router.push("/app/profile");
      return false;
    }
    return true;
  }

  // Load quest progress from API
  async function loadQuestProgress(wallet: string) {
    try {
      const res = await fetch(
        `/api/tasks/${initialTask.id}/quest-progress?wallet=${encodeURIComponent(wallet.toLowerCase())}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const subtasks = data.subtasks as Record<string, string> | undefined;
      if (subtasks) {
        const newStates: Record<string, TaskItemState> = {};
        for (const key of ["0", "1", "2", "3", "4"]) {
          const status = subtasks[key] || "pending";
          newStates[key] = {
            actionClicked: status === "action_done" || status === "verified",
            verifying: false,
            verified: status === "verified"
          };
        }
        setTaskStates(newStates);
        const restoredXHandle = data.xAccount?.username || data.xHandle;
        if (restoredXHandle) {
          cacheXHandle(restoredXHandle);
        }
      }
      if (data.claimed && data.payment) {
        setClaimResult(data.payment);
      }
      setQuestProgressLoaded(true);
    } catch {
      // Silently fail; user can still interact
    }
  }

  // Per-task action click handler — persists to DB
  async function handleTaskAction(taskKey: string) {
    const walletAddress = connectedWallet;
    if (!requireBoundXAccount() || !walletAddress) return;
    try {
      const res = await fetch(`/api/tasks/${initialTask.id}/quest-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ wallet: walletAddress.toLowerCase(), subtaskKey: taskKey, action: "action" })
      });
      const data = await res.json();
      if (data.status === "action_done" || data.status === "verified") {
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...(prev[taskKey] || { actionClicked: false, verifying: false, verified: false }), actionClicked: true }
        }));
      }
    } catch {
      // Best-effort — still enable button so user can retry
      setTaskStates((prev) => ({
        ...prev,
        [taskKey]: { ...(prev[taskKey] || { actionClicked: false, verifying: false, verified: false }), actionClicked: true }
      }));
    }
  }

  // Per-task verify handler — simple DB write, no wallet signature needed
  async function handleTaskVerify(taskKey: string) {
    const walletAddress = connectedWallet;
    if (!requireBoundXAccount() || !walletAddress) return;
    const state = taskStates[taskKey];
    // For task 4, the bound X account itself is the verification payload.
    if (taskKey === "4" && hasBoundXAccount && !state?.verified) {
      // First transition to action_done if needed, then verify in one step
      setTaskStates((prev) => ({
        ...prev,
        ["4"]: { actionClicked: true, verifying: true, verified: false }
      }));
      // Fall through to the API call below
    } else if (!state?.actionClicked || state.verifying || state.verified) {
      return;
    }
    setTaskStates((prev) => ({
      ...prev,
      [taskKey]: { ...prev[taskKey], verifying: true }
    }));
    try {
      const body: Record<string, string> = {
        wallet: walletAddress.toLowerCase(),
        subtaskKey: taskKey,
        action: "verify"
      };
      if (taskKey === "4" && boundXAccount?.username) {
        body.xHandle = boundXAccount.username;
      }
      const res = await fetch(`/api/tasks/${initialTask.id}/quest-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.status === "verified") {
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], verifying: false, verified: true }
        }));
      } else {
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], verifying: false }
        }));
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      setTaskStates((prev) => ({
        ...prev,
        [taskKey]: { ...prev[taskKey], verifying: false }
      }));
      setError(err instanceof Error ? err.message : "Verification failed.");
    }
  }

  // Build the claim message (must match server-side)
  function buildClaimMessage(taskId: string, wallet: string): string {
    return [
      "ai2human Reward Claim",
      `Task: ${taskId}`,
      `Wallet: ${wallet.toLowerCase()}`,
      "I am claiming my lucky draw reward."
    ].join("\n");
  }

  // Render Google reCAPTCHA v2 checkbox widget
  function renderRecaptcha() {
    if (typeof window === "undefined") return;
    const grecaptcha = (window as unknown as { grecaptcha?: { render: (element: HTMLElement | string, opts: object) => number; getResponse: (widgetId: number) => string } }).grecaptcha;
    if (!grecaptcha || !recaptchaContainerRef.current) return;
    if (recaptchaWidgetId !== null) return;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      setError("reCAPTCHA not configured. Contact support.");
      return;
    }
    recaptchaContainerRef.current.innerHTML = "";
    const widgetId = grecaptcha.render(recaptchaContainerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: onRecaptchaVerify,
      "expired-callback": () => {
        setError("reCAPTCHA expired. Please try again.");
        setRecaptchaWidgetId(null);
      },
      "error-callback": () => {
        setError("reCAPTCHA error. Please refresh and try again.");
        setRecaptchaWidgetId(null);
      }
    });
    setRecaptchaWidgetId(widgetId);
  }

  // Called when Google reCAPTCHA is successfully verified
  async function onRecaptchaVerify(token: string) {
    setShowRecaptcha(false);
    if (!connectedWallet) return;
    setSigningInProgress(true);
    setError("");
    const wallet = wallets.find((w) => w.address?.toLowerCase() === connectedWallet.toLowerCase());
    if (!wallet) {
      setError("Wallet not found. Please reconnect.");
      setSigningInProgress(false);
      return;
    }
    let signature: string;
    try {
      const provider = await wallet.getEthereumProvider();
      const message = buildClaimMessage(initialTask.id, connectedWallet);
      const hexMessage = "0x" + Buffer.from(message, "utf8").toString("hex");
      signature = await provider.request({
        method: "personal_sign",
        params: [hexMessage, wallet.address]
      }) as string;
    } catch {
      setError("Signature rejected or failed. Please try again.");
      setSigningInProgress(false);
      return;
    }
    setClaimingReward(true);
    try {
      const res = await fetch(`/api/tasks/${initialTask.id}/claim-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          wallet: connectedWallet.toLowerCase(),
          xHandle: boundXAccount?.username || xHandle,
          signature,
          captchaToken: token
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Claim failed");
      }
      if (data.payment) {
        setClaimResult(data.payment);
        cachePayment(initialTask.id, data.payment);
        const localMockPayment = isLocalMockPayment(data.payment);
        setMessage(
          data.alreadyClaimed
            ? "Reward already claimed!"
            : localMockPayment
              ? `${data.payment.amount} ${data.payment.tokenSymbol || "USDC"} recorded locally. No onchain transaction was created.`
              : `${data.payment.amount} ${data.payment.tokenSymbol || "USDC"} sent to your wallet!`
        );
      }
      setCaptchaToken("");
      setRecaptchaWidgetId(null);
      if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.innerHTML = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaimingReward(false);
      setSigningInProgress(false);
    }
  }

  // Claim reward — triggers Google reCAPTCHA first
  async function handleClaimReward() {
    if (!requireBoundXAccount()) return;
    if (!boundXAccount?.username) {
      setError("Bind your X account from Profile before claiming.");
      return;
    }
    cacheXHandle(boundXAccount.username);
    setError("");
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      // No reCAPTCHA configured — skip captcha, go straight to sign & claim
      await onRecaptchaVerify("dev-token");
      return;
    }
    const grecaptcha = (window as unknown as { grecaptcha?: { getResponse: (id: number) => string } }).grecaptcha;
    if (recaptchaWidgetId !== null && grecaptcha) {
      const existingToken = grecaptcha.getResponse(recaptchaWidgetId);
      if (existingToken) {
        await onRecaptchaVerify(existingToken);
        return;
      }
    }
    setShowRecaptcha(true);
    setSigningInProgress(false);
    setTimeout(() => {
      renderRecaptcha();
    }, 100);
  }

  // Toggle task expand/collapse
  function toggleTask(taskKey: string) {
    setExpandedTasks((prev) => ({ ...prev, [taskKey]: !prev[taskKey] }));
  }

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
    if (payload.user.xAccount?.username) {
      cacheXHandle(payload.user.xAccount.username);
    }
    if (payload.human?.handle) {
      setExecutorHandle((current) => current || `@${payload.human?.handle}`);
    }
  }

  useEffect(() => {
    loadAuth();
  }, []);

  // Load Google reCAPTCHA v2 script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) return; // Skip if not configured
    if (document.getElementById("google-recaptcha-script")) return;
    const script = document.createElement("script");
    script.id = "google-recaptcha-script";
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;
    (window as unknown as { onRecaptchaLoad?: () => void }).onRecaptchaLoad = () => {
      console.log("Google reCAPTCHA loaded");
    };
    document.head.appendChild(script);
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

  // Load quest progress when wallet is available
  useEffect(() => {
    if (connectedWallet && !questProgressLoaded) {
      loadQuestProgress(connectedWallet);
    }
  }, [connectedWallet, questProgressLoaded]);

  // Load questers data for Twitter tasks
  useEffect(() => {
    if (!isTwitterTask) return;
    fetch(`/api/tasks/${initialTask.id}/questers`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setQuestersData(data);
      })
      .catch(() => {});
  }, [isTwitterTask, initialTask.id]);

  // Load related tasks from API
  useEffect(() => {
    fetch("/api/tasks", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Task[] | null) => {
        if (!data) return;
        // Show up to 3 other tasks, excluding current one
        const others = data.filter((t) => t.id !== initialTask.id).slice(0, 3);
        setRelatedTasks(others);
      })
      .catch(() => {});
  }, [initialTask.id]);

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

  // ===== QuestN Layout (all tasks) =====
  {
    const allTasksVerified = ["0","1","2","3","4"].every(k => taskStates[k]?.verified);
    // For quest/twitter tasks, "done" means the current user has claimed, not the global task status
    // Also treat taskState as ended when pool is exhausted
    const isDone = !!claimResult || task.taskState === "full" || task.taskState === "closed" || task.taskState === "refunded";
    // Tag label: show "Ended" only when task pool is exhausted (all winners claimed / refunded / closed)
    // Otherwise show "Completed" if current user claimed, "Ongoing" if not
    const isGloballyEnded = task.taskState === "full" || task.taskState === "closed" || task.taskState === "refunded";

    // Twitter SVG icon
    const twitterSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );

    // Task type icons
    const followSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    );
    const likeSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    );
    const retweetSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    );
    const joinSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    );
    const userSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    );
    const commentSvg = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );

    // Check icon for completed
    const checkSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );

    // Share icon
    const shareSvg = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    );

    // Globe icon for footer
    const globeSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    );

    // Document icon for footer
    const docSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    );

    function getTaskActionLabel(taskType: string): string {
      if (taskType === "twitter_follow") return "Follow";
      if (taskType === "twitter_like") return "Like";
      if (taskType === "twitter_retweet") return "Repost";
      if (taskType === "twitter_comment") return "Comment";
      return "Join";
    }

    function buildTwitterIntentUrl(taskType: string, campaign?: Task["campaign"]): string {
      const DEFAULT_HANDLE = "ai2humanwork";
      const DEFAULT_TWEET_URL = "https://x.com/ai2humanwork/status/2057669148281651651";

      const handle = campaign?.requesterHandle?.replace("@", "") || DEFAULT_HANDLE;
      if (taskType === "twitter_follow") {
        return `https://x.com/intent/follow?screen_name=${handle}`;
      }

      // Extract tweet ID from targetUrl (e.g. https://x.com/ai2humanwork/status/123456789)
      const targetUrl = campaign?.targetUrl || DEFAULT_TWEET_URL;
      const tweetIdMatch = targetUrl.match(/status\/(\d+)/);
      const tweetId = tweetIdMatch ? tweetIdMatch[1] : "";

      if (taskType === "twitter_like" && tweetId) {
        return `https://x.com/intent/like?tweet_id=${tweetId}`;
      }
      if (taskType === "twitter_retweet" && tweetId) {
        return `https://x.com/intent/retweet?tweet_id=${tweetId}`;
      }
      if (taskType === "twitter_comment" && tweetId) {
        const text = encodeURIComponent(campaign?.label || "Check this out!");
        const url = encodeURIComponent(targetUrl);
        return `https://x.com/intent/tweet?text=${text}&url=${url}`;
      }
      // Fallback for like/retweet without tweetId — open the tweet directly
      return targetUrl;
    }

    function getTaskDisplayLabel(taskType: string, requesterHandle?: string): string {
      const handle = requesterHandle?.replace("@", "") || "ai2humanwork";
      if (taskType === "twitter_follow") return `Follow @${handle} on X`;
      if (taskType === "twitter_like") return `Like a post by @${handle} on X`;
      if (taskType === "twitter_retweet") return `Repost @${handle} on X`;
      if (taskType === "twitter_comment") return `Comment on @${handle}'s post`;
      return `Complete task on X`;
    }

    function getDeadlineDisplay() {
      const deadline = task.deadline;
      if (!deadline) return "No deadline";
      try {
        const d = new Date(deadline);
        const start = new Date(d);
        start.setDate(start.getDate() - 7);
        const fmt = (date: Date) =>
          `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        return `${fmt(start)} ~ ${fmt(d)} (UTC+08:00)`;
      } catch {
        return deadline;
      }
    }

    // relatedTasks now comes from API state

    return (
      <main className={styles.page}>
        <div className={styles.qnOuter}>
          {/* Back link */}
          <Link href="/tasks" className={styles.backLink}>← Back to tasks</Link>

          {/* Error / Success messages */}
          {error ? <div className={styles.noticeMsg}>{error}</div> : null}
          {message && !isDone ? <div className={styles.successMsg}>{message}</div> : null}

          {/* Two-column grid */}
          <div className={styles.qnSection}>
            {/* ===== Left Column ===== */}
            <div className={styles.qnMain}>

              {/* Detail Card: community + title + tasks + warning */}
              <div className={styles.qnDetail}>
                {/* Community Header */}
                <div className={styles.qnCommunityBox}>
                  <div className={styles.qnCommunity}>
                    <div className={styles.qnLogo}>
                      <img src="/brand/ai2human-dual-arrow-256.png" alt="AI2Human" />
                    </div>
                    <span className={styles.qnName}>
                      {task.campaign?.requesterHandle || "@ai2humanwork"}
                    </span>
                  </div>
                  {/* Share button - 3D style */}
                  <div className={`${styles.btn3d} ${styles.btn3dGhost}`}>
                    <div className={styles.btn3dInner}>
                      <button type="button" className={styles.btn3dFace}>
                        {shareSvg}
                        Share
                      </button>
                      <span className={styles.btn3dShadow} />
                    </div>
                  </div>
                </div>

                {/* Title + Tags */}
                <div className={styles.qnTitleWrap}>
                  <h1 className={styles.qnTitle}>{task.title}</h1>
                  <div className={styles.qnTagBox}>
                    <span className={`${styles.qnTag} ${isDone ? styles.qnTagCompleted : styles.qnTagOngoing}`}>
                      {!isDone && <span className={styles.qnStatusDot} />}
                      {isGloballyEnded ? "Ended" : isDone ? "Completed" : "Ongoing"}
                    </span>
                    <span className={styles.qnTag}>{getDeadlineDisplay()}</span>
                  </div>
                </div>

                {/* Task List */}
                <div className={styles.qnTaskList}>
                  {[
                    { key: "0", icon: followSvg, label: task.campaign?.label || getTaskDisplayLabel("twitter_follow", task.campaign?.requesterHandle), actionLabel: getTaskActionLabel("twitter_follow"), intentUrl: "https://x.com/intent/follow?screen_name=ai2humanwork" },
                    { key: "1", icon: joinSvg, label: "Join Telegram Group", actionLabel: "Join", intentUrl: "https://t.me/+G3U4loFH5H0zMmU1" },
                    { key: "2", icon: retweetSvg, label: "Repost announcement tweet", actionLabel: "Repost", intentUrl: "https://x.com/intent/retweet?tweet_id=2057437770902372396" },
                    { key: "3", icon: likeSvg, label: "Like announcement tweet", actionLabel: "Like", intentUrl: "https://x.com/intent/like?tweet_id=2058166798005248452" },
                    { key: "4", icon: userSvg, label: "Confirm bound X account", actionLabel: "Confirm" },
                  ].map((item) => {
                    const state = taskStates[item.key] || { actionClicked: false, verifying: false, verified: false };
                    const isExpanded = expandedTasks[item.key] || false;
                    return (
                      <div key={item.key} className={styles.qnTaskItem}>
                        <div className={styles.qnTaskExpanded}>
                          {/* Title bar — click to expand/collapse */}
                          <div className={styles.qnTaskHead} onClick={() => toggleTask(item.key)} role="button" tabIndex={0}>
                            <div className={state.verified ? `${styles.qnTaskIcon} ${styles.qnTaskIconDone}` : styles.qnTaskIcon}>
                              {item.icon}
                            </div>
                            <span className={styles.qnTaskLabel}>{item.label}</span>
                            <div className={state.verified ? `${styles.qnTaskArrow} ${styles.qnTaskArrowDone}` : styles.qnTaskArrow}>
                              {state.verified ? checkSvg : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Task body with action + verify buttons */}
                          {isExpanded && (
                            <div className={styles.qnTaskBody}>
                              {!connectedWallet ? (
                                <div className={styles.qnTaskButtons}>
                                  <div className={`${styles.btn3d} ${styles.btn3dCyan}`}>
                                    <div className={styles.btn3dInner}>
                                      <button
                                        type="button"
                                        className={styles.btn3dFace}
                                        onClick={() => login()}
                                      >
                                        Connect Wallet
                                      </button>
                                      <span className={styles.btn3dShadow} />
                                    </div>
                                  </div>
                                </div>
                              ) : item.key === "4" ? (
                                <div className={styles.qnTaskButtons}>
                                  <div className={styles.qnBoundXPanel}>
                                    <div className={styles.qnBoundXInfo}>
                                      <span>{hasBoundXAccount ? "Bound X account" : "X account required"}</span>
                                      <strong>{hasBoundXAccount ? `@${boundXAccount?.username}` : "Bind from Profile before starting"}</strong>
                                    </div>
                                    <div
                                      className={`${styles.btn3d} ${hasBoundXAccount ? styles.btn3dGreen : styles.btn3dCyan}`}
                                      style={{ flex: "0 0 auto" }}
                                    >
                                      <div className={styles.btn3dInner}>
                                        <button
                                          type="button"
                                          className={styles.btn3dFace}
                                          onClick={() => {
                                            if (!hasBoundXAccount) {
                                              setError("Bind your X account from Profile before doing tasks.");
                                              router.push("/app/profile");
                                              return;
                                            }
                                            handleTaskVerify("4");
                                          }}
                                        >
                                          {hasBoundXAccount ? "Confirm" : "Bind X"}
                                        </button>
                                        <span className={styles.btn3dShadow} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : state.verified ? (
                                <div className={styles.qnTaskDoneInline}>
                                  {checkSvg}
                                  <span>Task completed successfully</span>
                                </div>
                              ) : (
                                <div className={styles.qnTaskButtons}>
                                  {/* Action button - 3D Black */}
                                  <div className={`${styles.btn3d} ${styles.btn3dBlack}`}>
                                    <div className={styles.btn3dInner}>
                                      <button
                                        type="button"
                                        className={styles.btn3dFace}
                                        onClick={() => {
                                          if (!requireBoundXAccount()) return;
                                          window.open(item.intentUrl, "_blank", "width=600,height=400,toolbar=no,menubar=no");
                                          handleTaskAction(item.key);
                                        }}
                                      >
                                        {item.icon}
                                        {item.actionLabel}
                                      </button>
                                      <span className={styles.btn3dShadow} />
                                    </div>
                                  </div>
                                  {/* Verify button - 3D Green (disabled until action clicked) */}
                                  <div className={`${styles.btn3d} ${styles.btn3dGreen} ${!state.actionClicked ? styles.btn3dDisabled : ""}`}>
                                    <div className={styles.btn3dInner}>
                                      <button
                                        type="button"
                                        className={styles.btn3dFace}
                                        disabled={!state.actionClicked || state.verifying}
                                        onClick={() => handleTaskVerify(item.key)}
                                      >
                                        {state.verifying ? "Verifying..." : "Verify"}
                                      </button>
                                      <span className={styles.btn3dShadow} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Warning notice */}
                <div className={styles.qnWarning}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Be careful with links. Always check before you click.
                </div>
              </div>

              {/* Profile reminder */}
              {!auth?.human?.id && !isDone && (
                <div className={styles.qnProfileNotice}>
                  Complete your operator profile to start earning.
                  <a href="/app/profile">→ Complete Profile</a>
                </div>
              )}

              {connectedWallet && auth && !hasBoundXAccount && !isDone && (
                <div className={styles.qnProfileNotice}>
                  Bind your X account before doing tasks.
                  <a href="/app/profile">→ Bind X Account</a>
                </div>
              )}

              {/* Description */}
              <div className={styles.qnDesc}>
                <p className={styles.qnDescTitle}>Description</p>
                <div className={styles.qnDescContent}>
                  <p>{task.campaign?.brief || task.acceptance}</p>
                  {task.campaign?.targetUrl && (
                    <p>Target: <a href={task.campaign.targetUrl} target="_blank" rel="noreferrer">{task.campaign.targetUrl}</a></p>
                  )}
                </div>
              </div>

              {/* For You */}
              <div className={styles.qnForYou}>
                <div className={styles.qnForYouHead}>
                  <h3 className={styles.qnForYouTitle}>For You</h3>
                </div>
                <div className={styles.qnForYouGrid}>
                  {relatedTasks.length === 0 ? (
                    <p className={styles.qnEmptyRelated}>No other tasks available yet.</p>
                  ) : (
                    relatedTasks.map((item) => (
                      <a key={item.id} href={`/tasks/${item.id}`} className={styles.qnQuestCard}>
                        <div className={styles.qnQuestCardBg} />
                        <div className={styles.qnQuestCardBody}>
                          <div className={styles.qnQuestCardTop}>
                            <img className={styles.questLogo} src="/icon.png" alt="" style={{ width: 14, height: 14, borderRadius: "50%" }} />
                            <span className={styles.qnQuestCardName}>
                              {item.campaign?.requesterName || "AI Executor"}
                            </span>
                          </div>
                          <p className={styles.qnQuestCardTitle}>{item.title}</p>
                          <div className={styles.qnQuestCardReward}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v12M6 12h12"/>
                            </svg>
                            {item.rewardDistribution?.totalPool ?? item.budget}
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
                {/* Explore More button */}
                <div className={`${styles.qnExplore} ${styles.btn3d} ${styles.btn3dGhost}`}>
                  <div className={styles.btn3dInner}>
                    <a href="/tasks" className={styles.btn3dFace}>Explore More</a>
                    <span className={styles.btn3dShadow} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={styles.qnFooter}>
                <div className={styles.qnFooterLinks}>
                  <a href="https://ai2human.work" target="_blank" rel="noreferrer" className={styles.qnFooterLink}>
                    {globeSvg}
                    Official Website
                  </a>
                  <a href="https://ai2human.work/whitepaper" target="_blank" rel="noreferrer" className={styles.qnFooterLink}>
                    {docSvg}
                    Docs
                  </a>
                </div>
                <div className={styles.qnFooterSocials}>
                  <a href="https://x.com/ai2humanwork" target="_blank" rel="noreferrer" className={styles.qnFooterSocialIcon}>
                    {twitterSvg}
                  </a>
                </div>
              </div>
            </div>

            {/* ===== Right Column (Sidebar) ===== */}
            <div className={styles.qnSidebar}>
              {/* Reward Card */}
              <div className={styles.qnRewardCard}>
                <div className={styles.qnRewardHeader}>
                  <h3 className={styles.qnRewardH3}>Reward</h3>
                  <span className={styles.qnRewardBadge}>{distMode}</span>
                </div>

                {/* Key reward stats */}
                <div className={styles.qnRewardStats}>
                  <div className={styles.qnStatItem}>
                    <span className={styles.qnStatValue}>
                      {dist?.mode === "lucky_draw"
                        ? (() => {
                            const poolStr = dist?.totalPool || task.budget;
                            const pool = parseFloat(String(poolStr).replace(/[^\d.]/g, ""));
                            const winners = maxWinners || 1;
                            const avg = pool / winners;
                            const max = Math.round(avg * 2 * 100) / 100;
                            return `${avg.toFixed(1)}~${max} USDC`;
                          })()
                        : (dist?.perWinner || task.budget)}
                    </span>
                    <span className={styles.qnStatLabel}>Per Winner</span>
                  </div>
                  <div className={styles.qnStatDivider} />
                  <div className={styles.qnStatItem}>
                    <span className={styles.qnStatValue}>{maxWinners}</span>
                    <span className={styles.qnStatLabel}>Winners</span>
                  </div>
                  {dist?.totalPool && maxWinners > 1 && (
                    <>
                      <div className={styles.qnStatDivider} />
                      <div className={styles.qnStatItem}>
                        <span className={styles.qnStatValue}>{dist.totalPool}</span>
                        <span className={styles.qnStatLabel}>Total Pool</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Deadline / Countdown */}
                <div className={styles.qnCountdown}>
                  {countdown.ended || task.taskState === "full" || task.taskState === "closed" || task.taskState === "refunded" ? (
                    <div className={styles.qnCountdownLabel}>Ended</div>
                  ) : countdownTarget ? (
                    <>
                      <div className={styles.qnCountdownLabel}>Ends in</div>
                      <div className={styles.qnTimerRow}>
                        <div className={styles.qnTimerItem}>
                          <span className={styles.qnTimerNum}>{String(countdown.days).padStart(2, "0")}</span>
                          <span className={styles.qnTimerUnit}>Days</span>
                        </div>
                        <div className={styles.qnTimerItem}>
                          <span className={styles.qnTimerNum}>{String(countdown.hours).padStart(2, "0")}</span>
                          <span className={styles.qnTimerUnit}>Hours</span>
                        </div>
                        <div className={styles.qnTimerItem}>
                          <span className={styles.qnTimerNum}>{String(countdown.min).padStart(2, "0")}</span>
                          <span className={styles.qnTimerUnit}>Min</span>
                        </div>
                        <div className={styles.qnTimerItem}>
                          <span className={styles.qnTimerNum}>{String(countdown.sec).padStart(2, "0")}</span>
                          <span className={styles.qnTimerUnit}>Sec</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.qnCountdownLabel}>
                      Deadline: {task.deadline || "No deadline"}
                    </div>
                  )}
                </div>

                {/* Chain */}
                <div className={styles.qnRewardInfo}>
                  <div className={styles.qnChainRow}>
                    <div className={styles.qnChainIcon}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </div>
                    <span className={styles.qnChainName}>Base · USDC</span>
                  </div>
                </div>

                {/* Claim Button */}
                {claimResult ? (
                  <div className={styles.qnClaimDone}>
                    {checkSvg}
                    {claimResult.amount || task.budget} {claimResult.tokenSymbol || "USDC"}{" "}
                    {isLocalMockPayment(claimResult) ? "Recorded locally" : "Claimed"}
                    {claimResult.explorerUrl && (
                      <a
                        href={claimResult.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.qnClaimTxLink}
                      >
                        View transaction →
                      </a>
                    )}
                  </div>
                ) : !connectedWallet ? (
                  <div className={`${styles.qnClaimWrap} ${styles.btn3d} ${styles.btn3dGhost}`}>
                    <div className={styles.btn3dInner}>
                      <button
                        type="button"
                        className={styles.btn3dFace}
                        onClick={() => login()}
                      >
                        Connect Wallet
                      </button>
                      <span className={styles.btn3dShadow} />
                    </div>
                  </div>
                ) : isGloballyEnded ? (
                  <div className={`${styles.qnClaimWrap} ${styles.btn3d} ${styles.btn3dDisabled}`}>
                    <div className={styles.btn3dInner}>
                      <button type="button" className={styles.btn3dFace} disabled>
                        Ended
                      </button>
                      <span className={styles.btn3dShadow} />
                    </div>
                  </div>
                ) : allTasksVerified ? (
                  <div className={`${styles.qnClaimWrap} ${styles.btn3d} ${styles.btn3dGreen}`}>
                    <div className={styles.btn3dInner}>
                      <button
                        type="button"
                        className={styles.btn3dFace}
                        disabled={claimingReward || !hasBoundXAccount}
                        onClick={handleClaimReward}
                      >
                        {claimingReward ? "Claiming..." : "Claim Reward"}
                      </button>
                      <span className={styles.btn3dShadow} />
                    </div>
                  </div>
                ) : (
                  <div className={`${styles.qnClaimWrap} ${styles.btn3d} ${styles.btn3dGreen} ${styles.btn3dDisabled}`}>
                    <div className={styles.btn3dInner}>
                      <button
                        type="button"
                        className={styles.btn3dFace}
                        disabled
                      >
                        Claim Reward
                      </button>
                      <span className={styles.btn3dShadow} />
                    </div>
                  </div>
                )}

                {!connectedWallet && (
                  <p className={styles.qnClaimTips}>Connect wallet to start earning</p>
                )}
                {connectedWallet && !hasBoundXAccount && !claimResult && (
                  <p className={styles.qnClaimTips}>Bind your X account from Profile before doing tasks</p>
                )}
                {connectedWallet && hasBoundXAccount && !allTasksVerified && !claimResult && (
                  <p className={styles.qnClaimTips}>Complete all tasks to claim</p>
                )}
              </div>

              {/* Participants Card */}
              <div className={styles.qnQuestersCard}>
                <div className={styles.qnQuestersHeader}>
                  <h3 className={styles.qnQuestersH3}>Participants</h3>
                  <span className={styles.qnQuestersNum}>{questersData.count}</span>
                </div>
                <div className={styles.qnAvatarList}>
                  {questersData.questers.slice(0, 6).map((q) => (
                    <div
                      key={q.wallet}
                      className={styles.qnAvatar}
                      style={{ backgroundColor: avatarColor(q.avatarSeed) }}
                      title={shortWallet(q.wallet)}
                    >
                      {q.wallet.slice(2, 4).toUpperCase()}
                    </div>
                  ))}
                  {questersData.count > 6 && (
                    <div className={styles.qnAvatar}>+{questersData.count - 6}</div>
                  )}
                  {questersData.count === 0 && (
                    <div className={styles.qnAvatar} style={{ opacity: 0.4 }}>—</div>
                  )}
                </div>
                <div className={`${styles.qnShowMore} ${styles.btn3d} ${styles.btn3dGhost}`}>
                  <div className={styles.btn3dInner}>
                    <button type="button" className={styles.btn3dFace} onClick={() => loadTask()}>
                      Show More
                    </button>
                    <span className={styles.btn3dShadow} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google reCAPTCHA Modal */}
        {showRecaptcha && (
          <div className={styles.captchaOverlay} onClick={() => { if (!signingInProgress) { setShowRecaptcha(false); setRecaptchaWidgetId(null); } }}>
            <div className={styles.captchaModal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.captchaTitle}>Verify you're human</h2>
              <p className={styles.captchaSubtitle}>Complete the reCAPTCHA to claim your reward</p>
              <div ref={recaptchaContainerRef} className={styles.recaptchaContainer} />
              {error && <p className={styles.captchaError}>{error}</p>}
              <div className={styles.captchaActions}>
                <button
                  type="button"
                  className={styles.captchaCancelBtn}
                  onClick={() => { setShowRecaptcha(false); setRecaptchaWidgetId(null); if (recaptchaContainerRef.current) recaptchaContainerRef.current.innerHTML = ""; }}
                  disabled={signingInProgress}
                >
                  Cancel
                </button>
              </div>
              <p className={styles.captchaNote}>
                Your wallet will sign a message to verify ownership. No transaction gas fees required.
              </p>
            </div>
          </div>
        )}
      </main>
    );
  }
}
