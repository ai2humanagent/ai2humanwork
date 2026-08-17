"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useSigners, useWallets } from "@privy-io/react-auth";
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
import { formatCampaignWindowUtc8, formatTaskWindowUtc8 } from "../../../lib/dateTime";
import { normalizeTaskBrief, normalizeTaskDisplayTitle } from "../../../lib/taskInput.js";
import { normalizeExpectedPlace, upgradeCustomTaskSpec } from "../../../lib/customTaskSpec.js";
import { getCustomProofAttemptState } from "../../../lib/customProofAttempts.js";
import { buildTaskExperience } from "../../../application/tasks/taskExperience.js";
import { TaskRoomStatus } from "../../../ui/task-room/TaskRoomStatus";
import styles from "./detail.module.css";

const privySignerId = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID || "";
const privyPolicyId = process.env.NEXT_PUBLIC_PRIVY_POLICY_ID || "";

type EvidenceItem = {
  id: string;
  by: "ai" | "human" | "system";
  type: "log" | "note" | "photo" | "video" | "link";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

type Task = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  acceptance: string;
  taskType?: "twitter_follow" | "twitter_like" | "twitter_retweet" | "twitter_comment" | "x_article" | "physical";
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
  campaign?: {
    requesterName: string;
    requesterHandle?: string;
    platform: "x" | "real_world" | "research";
    action: string;
    isTest?: boolean;
    environment?: "test" | "production";
    payoutDisabled?: boolean;
    reviewPolicy?: "ai_auto" | "publisher_approval";
    fundingMode?: "test_no_payout" | "unfunded_campaign" | "escrow_deposit" | "prize_pool_contract" | "ai2human_managed_pool";
    source?: {
      requesterUserId?: string;
      requesterWallet?: string;
    };
    agentLifecycle?: {
      status?: "draft" | "preflight_passed" | "published" | "closed" | "reviewed" | "paying" | "completed" | "refunded";
      readyToCreate?: boolean;
      readyToPublish?: boolean;
      createdBy?: "agent" | "admin" | "user";
      createdVia?: string;
      publishedAt?: string;
      fundingPlan?: Record<string, unknown>;
      contractPreflight?: Record<string, unknown>;
      winnerDistribution?: Record<string, unknown>;
      missingInputs?: string[];
      nextQuestions?: Array<{ field: string; question: string }>;
      workflowState?: string;
      fundingState?: string;
      settlementState?: string;
    };
    eligibility?: {
      tokenGate?: TokenGateConfig;
    };
    tokenGate?: TokenGateConfig;
    requiresImage?: boolean;
    requiredMentions?: string[];
    requiredHashtags?: string[];
    label?: string;
    targetUrl?: string;
    poolAddress?: string;
    targetLabel?: string;
    proofPhrase?: string;
    brief?: string;
    campaignLinks?: {
      followHandle?: string;
      telegramUrl?: string;
      repostUrl?: string;
      likeUrl?: string;
    };
    proofRequirements: string[];
    verificationChecks?: string[];
    submissionFields?: string[];
    customTaskSpec?: {
      version: "custom-task-spec/v1";
      kind: "real_world_custom" | "research_evidence";
      compiler?: string;
      compilerReason?: string;
      brief: string;
      operatorInstructions: string[];
      evidenceRequirements: Array<{
        id: string;
        label: string;
        instruction: string;
        kind: "image" | "video" | "link" | "text";
        required: boolean;
        minCount?: number;
      }>;
      verificationRules: Array<{
        id: string;
        label: string;
        instruction: string;
        method: string;
        severity: "required" | "advisory";
      }>;
      locationPolicy: {
        mode: "optional" | "required" | "not_needed";
        expectedPlace?: string;
      };
      submission: {
        allowedKinds: Array<"image" | "video" | "link" | "text">;
        summaryRequired: boolean;
        maxArtifacts: number;
      };
      settlementPolicy?: {
        resubmissionAllowed?: boolean;
        maxSubmissionAttempts?: number;
      };
    };
  };
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
  evidence: EvidenceItem[];
  agentId?: string;
  rewardDistribution?: {
    mode: "fcfs" | "lucky_draw" | "equal" | "ranked_article_contest";
    totalPool: string;
    perWinner?: string;
    maxWinners: number;
    drawTime?: string;
    reviewAfter?: string;
    prizes?: Array<{
      rank: number;
      amount: string;
      slots?: number;
      label?: string;
    }>;
  };
  taskState?: "open" | "full" | "closed" | "refunded";
};

type TokenGateConfig = {
  enabled?: boolean;
  network?: string;
  chainId?: number;
  contractAddress?: string;
  tokenAddress?: string;
  symbol?: string;
  tokenSymbol?: string;
  decimals?: number;
  minimumBalance?: string;
  minimumUsdValue?: string;
  minUsdValue?: string;
  minimumUsd?: string;
  priceUsd?: string;
  tokenPriceUsd?: string;
  priceSource?: string;
  minBalance?: string;
  minimum?: string;
  holderLabel?: string;
  failureMessage?: string;
  requiredAt?: string[];
};

type AuthPayload = {
  user: {
    id: string;
    email?: string;
    walletAddress?: string;
    contactEmail?: string;
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
  confidence?: number;
  reason?: string;
  severity?: "required" | "advisory";
  method?: string;
};

type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedMps?: number;
  capturedAt: string;
};

type ProofArtifact = {
  id: string;
  kind: "image" | "video" | "link";
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  accessUrl?: string;
  uri: string;
};

type PublisherProof = {
  id: string;
  summary: string;
  artifacts: ProofArtifact[];
  location?: { latitude: number; longitude: number; accuracyMeters?: number; capturedAt?: string };
  locationNote?: string;
  clientTimestamp?: string;
  serverReceivedAt: string;
  integrityHash: string;
  deviceProof?: {
    filePreparation?: EvidenceFilePreparation[];
  };
};

type EvidenceFilePreparation = {
  name: string;
  originalBytes: number;
  uploadedBytes: number;
  originalLastModified: string;
  optimized: boolean;
};

const MAX_CUSTOM_EVIDENCE_REQUEST_BYTES = 3_600_000;

function formatFileSize(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function EvidenceFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className={styles.evidencePreview}>
      {file.type.startsWith("video/") ? (
        <video src={url} controls preload="metadata" />
      ) : (
        <img src={url} alt={`Selected evidence: ${file.name}`} />
      )}
      <span>{file.name}</span>
    </div>
  );
}

async function compressImageToBudget(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error(`Unable to prepare ${file.name}. Choose a smaller JPEG, PNG, or WebP image.`));
      candidate.src = objectUrl;
    });
    let scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    let bestBlob: Blob | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the selected image.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob) continue;
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= maxBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "evidence";
          return new File([blob], `${baseName}-optimized.jpg`, {
            type: "image/jpeg",
            lastModified: file.lastModified
          });
        }
      }
      scale *= 0.78;
    }
    if (bestBlob && bestBlob.size <= maxBytes) {
      return new File([bestBlob], `${file.name.replace(/\.[^.]+$/, "") || "evidence"}-optimized.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified
      });
    }
    throw new Error(`${file.name} is still too large after optimization. Choose one photo or use an evidence link.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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

type ArticleSubmission = {
  id: string;
  taskId: string;
  walletAddress: string;
  xHandle: string;
  articleUrl: string;
  articleId?: string;
  authorHandle: string;
  title: string;
  contentSnapshot: string;
  status: "submitted" | "invalid" | "reviewed" | "winner" | "paid" | "rejected";
  aiScore?: number;
  aiReview?: string;
  rank?: number;
  prizeAmount?: string;
  paymentTxHash?: string;
  paymentExplorerUrl?: string;
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
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

function distributionModeLabel(mode?: string, action?: string, requiresImage?: boolean): string {
  if (mode === "fcfs") return "FCFS";
  if (mode === "lucky_draw") return "Lucky Draw";
  if (mode === "equal") return "Equal Split";
  if (mode === "ranked_article_contest") {
    if (action === "banner_image_contest") return "Banner Contest";
    if (requiresImage) return "Image Post Contest";
    return "Ranked Article";
  }
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

function isTestRewardTask(task: Task) {
  return Boolean(task.campaign?.isTest || task.campaign?.environment === "test" || task.campaign?.payoutDisabled);
}

function canClaim(task: Task, auth: AuthPayload | null) {
  if (task.rewardDistribution?.mode === "ranked_article_contest" || task.taskType === "x_article" || task.campaign?.action === "x_article_contest") return false;
  if (isTestRewardTask(task)) return false;
  if (!["created", "ai_failed"].includes(task.status)) return false;
  if (!auth?.human?.id || !auth?.user?.walletAddress) return false;
  if (!hasUsableEmail(auth.user.contactEmail) && !hasUsableEmail(auth.user.email)) return false;
  if (!auth.user.xAccount?.username) return false;
  return true;
}

function hasUsableEmail(email?: string) {
  const value = String(email || "").trim().toLowerCase();
  if (!value || value.endsWith("@privy.local")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getTokenGateNotice(task: Task) {
  const gate = task.campaign?.eligibility?.tokenGate || task.campaign?.tokenGate;
  if (!gate || gate.enabled === false) return null;
  const symbol = String(gate.symbol || gate.tokenSymbol || "TOKEN").replace(/^\$/, "");
  const minimumUsd = String(gate.minimumUsdValue || gate.minUsdValue || gate.minimumUsd || "").trim();
  const minimum = String(gate.minimumBalance || gate.minBalance || gate.minimum || "1");
  const network = String(gate.network || (gate.chainId === 8453 ? "Base" : "EVM")).replace(/^base$/i, "Base");
  const requirement = minimumUsd ? `around ${minimumUsd} USDC worth of $${symbol}` : `${minimum} $${symbol}`;
  return {
    symbol,
    minimum,
    minimumUsd,
    network,
    label: gate.holderLabel || `$${symbol} holder`,
    text: `Hold at least ${requirement} on ${network} to participate.`
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function buildQuestProgressError(data: unknown, fallback: string) {
  const payload = readRecord(data);
  const gate = readRecord(payload?.tokenGate);
  if (gate) {
    const symbol = String(gate.symbol || "TOKEN").replace(/^\$/, "");
    const network = String(gate.network || "Base").replace(/^base$/i, "Base");
    const minimumBalance = String(gate.minimumBalance || "").trim();
    const balance = String(gate.balance || "").trim();
    const reason = String(gate.reason || "").trim();
    if (reason === "insufficient_balance") {
      const requirement = minimumBalance ? `${minimumBalance} $${symbol}` : `$${symbol}`;
      const current = balance ? ` Current balance: ${balance} $${symbol}.` : "";
      return `This campaign requires at least ${requirement} on ${network} before you can complete tasks.${current}`;
    }
    if (reason === "price_unavailable" || reason === "rpc_unavailable") {
      return `We could not check $${symbol} holder access on ${network} right now. Please try again in a minute.`;
    }
  }
  const error = typeof payload?.error === "string" ? payload.error.trim() : "";
  return error || fallback;
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
  initialAlternateClaimTask,
  justCreated = false
}: {
  initialTask: Task;
  initialPayment: PaymentResult | null;
  initialAlternateClaimTask: AlternateClaimTask | null;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const { addSigners, removeSigners } = useSigners();
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
  const [takingPublisherAction, setTakingPublisherAction] = useState(false);
  const [refundingPool, setRefundingPool] = useState(false);
  const [fundingAuthorizationRequired, setFundingAuthorizationRequired] = useState(false);
  const [fundingShortfall, setFundingShortfall] = useState<{
    required: string;
    usdcBalance: string;
    a2hRequired?: string;
    a2hBalance?: string;
  } | null>(null);
  const [fundingGasRequired, setFundingGasRequired] = useState(false);
  const [fundingProviderIssue, setFundingProviderIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [executorHandle, setExecutorHandle] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceFilePreparation, setEvidenceFilePreparation] = useState<EvidenceFilePreparation[]>([]);
  const [preparingEvidence, setPreparingEvidence] = useState(false);
  const [proofError, setProofError] = useState("");
  const [publisherProof, setPublisherProof] = useState<PublisherProof | null>(null);
  const [publisherProofLoading, setPublisherProofLoading] = useState(false);
  const [publisherProofError, setPublisherProofError] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [browserLocation, setBrowserLocation] = useState<BrowserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const proofNonceRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  const automaticFundingAttemptRef = useRef(false);
  const [locationNote, setLocationNote] = useState("");
  const [timestampNote, setTimestampNote] = useState("");
  const [proofPhrase, setProofPhrase] = useState(initialTask.campaign?.proofPhrase || "");
  const [summary, setSummary] = useState("");
  // Per-task interaction state for QuestN-style task list
  type TaskItemState = { actionClicked: boolean; acting?: boolean; verifying: boolean; verified: boolean; error?: string };
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
  const [articleSubmission, setArticleSubmission] = useState<ArticleSubmission | null>(null);
  const [articleSubmissionLoaded, setArticleSubmissionLoaded] = useState(false);
  const [articleSubmitting, setArticleSubmitting] = useState(false);
  const [articleSubmitStatus, setArticleSubmitStatus] = useState("");
  const [articleErrorModal, setArticleErrorModal] = useState("");
  const [articleUpdateLocked, setArticleUpdateLocked] = useState(false);
  const [articleUrl, setArticleUrl] = useState("");
  const [articleContent, setArticleContent] = useState("");
  // Prioritize external wallet (MetaMask etc.) over Privy embedded wallet
  const rawWallet =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;
  // Only trust wallet address if user is actually authenticated
  const connectedWallet = (ready && authenticated) ? rawWallet : undefined;

  const isTwitterTask = ["twitter_follow", "twitter_like", "twitter_retweet", "twitter_comment"].includes(task.taskType || "");
  const isQuestCampaign =
    isTwitterTask ||
    task.rewardDistribution?.mode === "lucky_draw" ||
    Boolean(task.campaign?.campaignLinks);
  const isArticleContest = task.rewardDistribution?.mode === "ranked_article_contest";
  const isBannerImageContest = isArticleContest && task.campaign?.action === "banner_image_contest";
  const requiresAttachedImage = isArticleContest && !isBannerImageContest && Boolean(task.campaign?.requiresImage);

  // Countdown for reward card
  const dist = task.rewardDistribution;
  const countdownTarget = dist?.drawTime || task.deadline || undefined;
  const countdown = useCountdown(countdownTarget);
  const distMode = distributionModeLabel(dist?.mode, task.campaign?.action, task.campaign?.requiresImage);
  const maxWinners = dist?.maxWinners || 1;
  const boundXAccount = auth?.user.xAccount;
  const hasBoundXAccount = Boolean(boundXAccount?.username);
  const hasContactEmail = hasUsableEmail(auth?.user.contactEmail) || hasUsableEmail(auth?.user.email);
  const isTestArticleContest = isArticleContest && task.id.startsWith("x-article-contest-test-");
  const articleWallet = connectedWallet;
  const tokenGateNotice = getTokenGateNotice(task);

  function cacheXHandle(handle: string) {
    setXHandle(handle);
    if (typeof window !== "undefined") {
      localStorage.setItem(`ai2human:xhandle:${initialTask.id}`, handle);
    }
  }

  function requireTaskAccess(action: "do tasks" | "claim rewards" | "submit an article" = "do tasks") {
    if (!connectedWallet) {
      login();
      return false;
    }
    if (action === "submit an article" && (isTestArticleContest || isBannerImageContest)) {
      if (!hasContactEmail) {
        setError(`Add a contact email from Profile before you ${isBannerImageContest ? "submit a banner" : "submit an article"}.`);
        router.push("/app/profile");
        return false;
      }
      return true;
    }
    if (!hasContactEmail && !hasBoundXAccount) {
      setError(`Add a contact email and bind your X account from Profile before you ${action}.`);
      router.push("/app/profile");
      return false;
    }
    if (!hasContactEmail) {
      setError(`Add a contact email from Profile before you ${action}.`);
      router.push("/app/profile");
      return false;
    }
    if (!hasBoundXAccount) {
      setError(`Bind your X account from Profile before you ${action}.`);
      router.push("/app/profile");
      return false;
    }
    return true;
  }

  async function refreshAndCheckTaskAccess(action: "do tasks" | "claim rewards" | "submit an article") {
    const latestAuth = await loadAuth();
    if (!latestAuth) {
      return false;
    }
    const latestHasContactEmail = hasUsableEmail(latestAuth.user.contactEmail) || hasUsableEmail(latestAuth.user.email);
    const latestHasBoundXAccount = Boolean(latestAuth.user.xAccount?.username);
    if (action === "submit an article" && (isTestArticleContest || isBannerImageContest)) {
      return latestHasContactEmail;
    }
    return latestHasContactEmail && latestHasBoundXAccount;
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
        for (const key of ["0", "1", "2", "3"]) {
          const status = subtasks[key] || "pending";
          newStates[key] = {
            actionClicked: status === "action_done" || status === "verified",
            acting: false,
            verifying: false,
            verified: status === "verified",
            error: ""
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

  async function loadArticleSubmission(wallet: string) {
    try {
      const res = await fetch(
        `/api/tasks/${initialTask.id}/article-submissions?wallet=${encodeURIComponent(wallet.toLowerCase())}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const submission = data.submission as ArticleSubmission | null;
      setArticleUpdateLocked(Boolean(data.updateLocked));
      if (submission) {
        setArticleSubmission(submission);
        setArticleUrl(submission.articleUrl);
        setArticleContent(submission.contentSnapshot);
      }
      setArticleSubmissionLoaded(true);
    } catch {
      setArticleSubmissionLoaded(true);
    }
  }

  // Per-task action click handler — persists to DB
  async function handleTaskAction(taskKey: string, intentUrl?: string) {
    const walletAddress = connectedWallet;
    if (!walletAddress) {
      login();
      return;
    }
    if (!intentUrl) {
      setError("This task is missing its requester-provided action link. Ask the requester to update the campaign links.");
      return;
    }
    setError("");
    setTaskStates((prev) => ({
      ...prev,
      [taskKey]: { ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }), acting: true, error: "" }
    }));
    const popup = intentUrl && typeof window !== "undefined"
      ? window.open("about:blank", "_blank", "width=600,height=400,toolbar=no,menubar=no")
      : null;
    const hasLatestAccess = await refreshAndCheckTaskAccess("do tasks");
    if (!hasLatestAccess) {
      popup?.close();
      if (!requireTaskAccess("do tasks")) return;
      return;
    }
    if (popup && intentUrl) {
      popup.location.href = intentUrl;
    }
    try {
      const res = await fetch(`/api/tasks/${initialTask.id}/quest-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ wallet: walletAddress.toLowerCase(), subtaskKey: taskKey, action: "action" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage = buildQuestProgressError(data, "We could not save this action. Please check your eligibility and try again.");
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: {
            ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }),
            actionClicked: false,
            acting: false,
            verifying: false,
            error: errorMessage
          }
        }));
        setError(errorMessage);
        return;
      }
      if (data.status === "action_done" || data.status === "verified") {
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: {
            ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }),
            actionClicked: true,
            acting: false,
            error: ""
          }
        }));
      } else {
        const errorMessage = buildQuestProgressError(data, "We could not confirm this action. Please try again.");
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: {
            ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }),
            actionClicked: false,
            acting: false,
            verifying: false,
            error: errorMessage
          }
        }));
        setError(errorMessage);
      }
    } catch {
      const errorMessage = "We could not save this action. Please try again.";
      setTaskStates((prev) => ({
        ...prev,
        [taskKey]: {
          ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }),
          actionClicked: false,
          acting: false,
          verifying: false,
          error: errorMessage
        }
      }));
      setError(errorMessage);
    }
  }

  // Per-task verify handler — simple DB write, no wallet signature needed
  async function handleTaskVerify(taskKey: string) {
    const walletAddress = connectedWallet;
    if (!walletAddress) {
      login();
      return;
    }
    const hasLatestAccess = await refreshAndCheckTaskAccess("do tasks");
    if (!hasLatestAccess) {
      if (!requireTaskAccess("do tasks")) return;
      return;
    }
    const state = taskStates[taskKey];
    if (!state?.actionClicked || state.verifying || state.verified) {
      if (!state?.actionClicked && !state?.verified) {
        const errorMessage = "Open the task link first. Once AI2Human records that step, Verify will turn on.";
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: {
            ...(prev[taskKey] || { actionClicked: false, acting: false, verifying: false, verified: false }),
            error: errorMessage
          }
        }));
      }
      return;
    }
    setTaskStates((prev) => ({
      ...prev,
      [taskKey]: { ...prev[taskKey], verifying: true, error: "" }
    }));
    try {
      const body: Record<string, string> = {
        wallet: walletAddress.toLowerCase(),
        subtaskKey: taskKey,
        action: "verify"
      };
      const res = await fetch(`/api/tasks/${initialTask.id}/quest-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMessage = buildQuestProgressError(data, "Verification failed. Please try again.");
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], verifying: false, error: errorMessage }
        }));
        setError(errorMessage);
        return;
      }
      if (data.status === "verified") {
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], verifying: false, verified: true, error: "" }
        }));
      } else {
        const errorMessage = buildQuestProgressError(data, "Verification failed. Please try again.");
        setTaskStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], verifying: false, error: errorMessage }
        }));
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed.";
      setTaskStates((prev) => ({
        ...prev,
        [taskKey]: { ...prev[taskKey], verifying: false, error: errorMessage }
      }));
      setError(errorMessage);
    }
  }

  // Build the claim message (must match server-side)
  function buildClaimMessage(taskId: string, wallet: string): string {
    return [
      "AI2Human Reward Claim",
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
      await loadQuesters();
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
    if (!requireTaskAccess("claim rewards")) return;
    if (!boundXAccount?.username) return;
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
      setTask((current) => {
        const currentTime = +new Date(current.updatedAt || 0);
        const nextTime = +new Date(payload.task?.updatedAt || 0);
        return nextTime >= currentTime ? payload.task! : current;
      });
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

  async function takePublisherAction(action: "confirm_task") {
    setTakingPublisherAction(true);
    setError("");
    setMessage("");
    setFundingShortfall(null);
    setFundingGasRequired(false);
    setFundingProviderIssue(false);
    try {
      const response = await fetchWithPrivySessionRetry(`/api/v1/tasks/${task.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${action}:${task.id}:${Date.now()}`
        },
        body: JSON.stringify({ action })
      }, { authenticated, getAccessToken });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to update task.");
      setMessage("Task confirmed. Next, fund the reward before publishing.");
      await loadTask();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update task.");
    } finally {
      setTakingPublisherAction(false);
    }
  }

  async function refundPoolTask() {
    setError("");
    setMessage("");
    setRefundingPool(true);
    try {
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/refund-pool`,
        {
          method: "POST",
          credentials: "same-origin"
        },
        {
          authenticated,
          getAccessToken
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        status?: string;
        amount?: string;
        asset?: string;
        poolTxHash?: string;
        returnTxHash?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to refund the reward pool.");
      }
      setMessage(
        `Refund ${payload.amount ? `${payload.amount} ${payload.asset || ""}`.trim() : ""} submitted. ` +
        (payload.poolTxHash
          ? `Pool tx: ${payload.poolTxHash.slice(0, 10)}… `
          : "") +
        (payload.returnTxHash
          ? `Return tx: ${payload.returnTxHash.slice(0, 10)}… `
          : "") +
        "The remaining pool is returned to the original requester wallet."
      );
      await loadTask();
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "Unable to refund the reward pool.");
    } finally {
      setRefundingPool(false);
    }
  }

  async function reviewPublisherProof(decision: "approve" | "revision") {
    setTakingPublisherAction(true);
    setError("");
    setMessage("");
    try {
      const response = await fetchWithPrivySessionRetry(`/api/tasks/${task.id}/${decision === "approve" ? "verify" : "reject"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(decision === "revision" ? { reason: "Publisher requested clearer or corrected proof." } : {})
      }, { authenticated, getAccessToken });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || payload.message || "Unable to review proof.");
      setMessage(decision === "approve" ? "Proof approved. Settlement is now authorized." : "Revision requested. The executor can submit corrected proof.");
      await loadTask();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review proof.");
    } finally {
      setTakingPublisherAction(false);
    }
  }

  async function fundAndPublishTask() {
    setTakingPublisherAction(true);
    setError("");
    setMessage("");
    try {
      const response = await fetchWithPrivySessionRetry(`/api/v1/tasks/${task.id}/fund-and-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, { authenticated, getAccessToken });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        code?: string;
        status?: string;
        required?: string;
        balance?: string;
        a2hRequired?: string;
        a2hBalance?: string;
      };
      if (!response.ok) {
        if (payload.code === "needs_automation") {
          setFundingAuthorizationRequired(true);
          return;
        }
        if (response.status === 402) {
          setFundingShortfall({
            required: payload.required || task.budget,
            usdcBalance: payload.balance || "0",
            a2hRequired: payload.a2hRequired,
            a2hBalance: payload.a2hBalance
          });
          return;
        }
        if (/add .*eth on base|network fee/i.test(payload.error || "")) {
          setFundingGasRequired(true);
          return;
        }
        if (/wallet provider|privy|transaction simulation|wallet policy/i.test(payload.error || "")) {
          setFundingProviderIssue(true);
          setError(payload.error || "The wallet provider rejected this publishing attempt.");
          return;
        }
        throw new Error(payload.error || "Unable to fund and publish task.");
      }
      setMessage("Reward funded from your embedded wallet. The task is now live.");
      setFundingAuthorizationRequired(false);
      setFundingShortfall(null);
      setFundingGasRequired(false);
      setFundingProviderIssue(false);
      await loadTask();
    } catch (fundingError) {
      setError(fundingError instanceof Error ? fundingError.message : "Unable to fund and publish task.");
    } finally {
      setTakingPublisherAction(false);
    }
  }

  async function authorizeTaskFunding() {
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address);
    if (!embeddedWallet?.address) {
      setError("Your Privy embedded wallet is not ready. Sign out and sign in again, then retry.");
      return;
    }
    if (!privySignerId || !privyPolicyId) {
      setError("Task funding authorization is not configured. Contact AI2Human support.");
      return;
    }
    setTakingPublisherAction(true);
    setError("");
    try {
      try {
        await addSigners({ address: embeddedWallet.address, signers: [{ signerId: privySignerId, policyIds: [privyPolicyId] }] });
      } catch (authorizationError) {
        const authorizationMessage = authorizationError instanceof Error ? authorizationError.message : "";
        if (!authorizationMessage.toLowerCase().includes("duplicate signer")) throw authorizationError;
        await removeSigners({ address: embeddedWallet.address });
        await addSigners({ address: embeddedWallet.address, signers: [{ signerId: privySignerId, policyIds: [privyPolicyId] }] });
      }
      setFundingAuthorizationRequired(false);
      setMessage("Wallet authorized once for AI2Human task funding. Future tasks will not ask again unless this permission is revoked.");
      await fundAndPublishTask();
    } catch (authorizationError) {
      setError("We could not update the wallet permission. Your task and funds are safe. Please try once more.");
      setTakingPublisherAction(false);
    }
  }

  async function loadQuesters() {
    try {
      const res = await fetch(`/api/tasks/${initialTask.id}/questers`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as QuestersData | null;
      if (res.ok && data) {
        setQuestersData(data);
      }
    } catch {
      // Community stats are non-blocking; keep the task usable if this refresh fails.
    }
  }

  async function loadAuth(): Promise<AuthPayload | null> {
    const payload = await loadAuthWithPrivySession<AuthPayload>({
      authenticated,
      getAccessToken
    });
    if (!payload) {
      setAuth(null);
      return null;
    }
    setAuth(payload);
    if (payload.user.xAccount?.username) {
      cacheXHandle(payload.user.xAccount.username);
    }
    if (payload.human?.handle) {
      setExecutorHandle((current) => current || `@${payload.human?.handle}`);
    }
    return payload;
  }

  useEffect(() => {
    if (!ready) return;
    void loadAuth();
  }, [ready, authenticated]);

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

  useEffect(() => {
    if (!isArticleContest) return;
    if (articleWallet && !articleSubmissionLoaded) {
      loadArticleSubmission(articleWallet);
    }
  }, [articleWallet, isArticleContest, articleSubmissionLoaded]);

  // Load questers data for X/lucky-draw campaigns
  useEffect(() => {
    if (!isQuestCampaign) return;
    loadQuesters();
  }, [isQuestCampaign, initialTask.id]);

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
  const verificationReviewReasons = useMemo(() => {
    const reasons: string[] = [];
    const addReason = (reason: unknown) => {
      const normalized = String(reason || "").trim();
      if (normalized && !reasons.includes(normalized)) reasons.push(normalized);
    };
    const taskCreatedEpoch = Date.parse(task.createdAt);
    const selectedFilesPredatingTask = (publisherProof?.deviceProof?.filePreparation || []).filter((file) => {
      const selectedFileEpoch = Date.parse(file.originalLastModified);
      return Number.isFinite(taskCreatedEpoch)
        && Number.isFinite(selectedFileEpoch)
        && selectedFileEpoch < taskCreatedEpoch - 5 * 60_000;
    });
    if (selectedFilesPredatingTask.length) {
      addReason(
        `The browser reports that ${selectedFilesPredatingTask.map((file) => `${file.name} was last modified on ${new Date(file.originalLastModified).toLocaleString()}`).join(", ")}, before this task was created on ${new Date(task.createdAt).toLocaleString()}. The photo may be older than the task, so its freshness needs reviewer confirmation or a new capture.`
      );
    }
    verificationStatus.checks
      .filter((check: VerificationCheck) => !check.passed || (
        Number.isFinite(Number(check.confidence))
        && Number(check.confidence) > 0
        && Number(check.confidence) < 0.72
      ))
      .forEach((check: VerificationCheck) => addReason(check.reason || check.label));
    if (verificationStatus.providerDiagnostic?.code === "ensemble_degraded") {
      addReason("One of the configured image verifiers did not return a usable result, so the automated model ensemble was incomplete.");
    } else if (verificationStatus.reviewCause === "provider_unavailable") {
      addReason("The configured image verifier did not return a usable result. This is a system condition, not evidence rejection.");
    }
    if (!reasons.length) addReason(verificationStatus.reason);
    return reasons.slice(0, 5);
  }, [publisherProof, task.createdAt, verificationStatus]);
  const submissionFields = useMemo(() => getTaskSubmissionFields(task), [task]);
  const rewardLabel = useMemo(() => {
    const plan = task.campaign?.agentLifecycle?.fundingPlan;
    const settlementAsset = plan?.settlementAsset && typeof plan.settlementAsset === "object"
      ? plan.settlementAsset as Record<string, unknown>
      : null;
    const approximateUsd = Number(settlementAsset?.approximateUsd);
    const label = formatBudgetLabel(task.budget);
    return /\bA2H\b/i.test(label) && Number.isFinite(approximateUsd) && approximateUsd > 0
      ? `${label} (≈ ${approximateUsd < 0.01 ? approximateUsd.toFixed(4) : approximateUsd.toFixed(2)} USDC)`
      : label;
  }, [task.budget, task.campaign?.agentLifecycle?.fundingPlan]);
  const requiresExecutorHandle = submissionFields.includes("executorHandle");
  const requiresPostUrl = submissionFields.includes("postUrl");
  const requiresProfileUrl = submissionFields.includes("profileUrl");
  const requiresPhoto = submissionFields.includes("photo");
  const requiresLocationNote = submissionFields.includes("locationNote");
  const requiresTimestampNote = submissionFields.includes("timestampNote");
  const requiresProofPhrase = submissionFields.includes("proofPhrase");
  const isCustomRealWorldTask = task.campaign?.customTaskSpec?.version === "custom-task-spec/v1";
  const isResearchEvidenceTask = task.campaign?.platform === "research";
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
    : isResearchEvidenceTask
      ? "State the artifact checked, access result, bounded verdict, and limitation."
    : "One-line summary of what you checked, picked up, or verified on site.";
  const customProofAttemptState = useMemo(
    () => getCustomProofAttemptState(task, verificationStatus),
    [task, verificationStatus]
  );
  const canEditProof = claimedByMe && (
    isCustomRealWorldTask
      ? customProofAttemptState.allowed
      : task.status === "human_assigned"
        || (task.status === "human_done" && verificationStatus.verdict === "resubmit")
  );
  const isClosedProofRecord = ["human_done", "verified", "paid"].includes(task.status);
  const isTaskPublisher = Boolean(auth?.user.id && task.campaign?.source?.requesterUserId === auth.user.id);
  useEffect(() => {
    if (!isTaskPublisher || !authenticated || !ready) return;
    if (buildTaskExperience(task).workflow !== "awaiting_funding") return;
    if (automaticFundingAttemptRef.current) return;
    automaticFundingAttemptRef.current = true;
    void fundAndPublishTask();
  }, [authenticated, isTaskPublisher, ready, task]);

  const loadPublisherProof = useCallback(async () => {
    setPublisherProofLoading(true);
    setPublisherProofError("");
    try {
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/proof`,
        { cache: "no-store", credentials: "same-origin" },
        { authenticated, getAccessToken }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to open submitted evidence.");
      setPublisherProof(payload?.proofBundle || null);
    } catch (cause) {
      setPublisherProofError(cause instanceof Error ? cause.message : "Unable to open submitted evidence.");
    } finally {
      setPublisherProofLoading(false);
    }
  }, [task.id, authenticated, getAccessToken, connectedWallet]);

  useEffect(() => {
    if (!isClosedProofRecord || (!isTaskPublisher && !claimedByMe)) return;
    void loadPublisherProof();
  }, [isClosedProofRecord, isTaskPublisher, claimedByMe, loadPublisherProof]);

  function captureOptionalLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("This browser does not support location capture. You can still submit without GPS unless this task explicitly requires it.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBrowserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          altitudeMeters: position.coords.altitude ?? undefined,
          headingDegrees: position.coords.heading ?? undefined,
          speedMps: position.coords.speed ?? undefined,
          capturedAt: new Date(position.timestamp).toISOString()
        });
        setLocating(false);
      },
      (locationError) => {
        setLocating(false);
        setError(`Location was not attached (${locationError.message}). You may continue if GPS is optional.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function copyTaskLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setMessage("Task link copied. Share it with the intended executor or your team.");
    } catch {
      setError("The task link could not be copied. Copy it from your browser address bar.");
    }
  }

  async function prepareEvidenceFiles(selectedFiles: File[]) {
    setProofError("");
    setError("");
    setPreparingEvidence(true);
    try {
      const selected = selectedFiles.slice(0, 4);
      const prepared: File[] = [];
      const preparation: EvidenceFilePreparation[] = [];
      let remainingBytes = MAX_CUSTOM_EVIDENCE_REQUEST_BYTES;

      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const remainingFiles = selected.length - index;
        const fileBudget = Math.max(450_000, Math.floor(remainingBytes / remainingFiles));
        if (file.type.startsWith("video/")) {
          if (file.size > fileBudget) {
            throw new Error(`${file.name} is too large for direct upload. Use a shorter video or paste an evidence link.`);
          }
          prepared.push(file);
          preparation.push({
            name: file.name,
            originalBytes: file.size,
            uploadedBytes: file.size,
            originalLastModified: new Date(file.lastModified).toISOString(),
            optimized: false
          });
          remainingBytes -= file.size;
          continue;
        }
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not a supported image or short video.`);
        }
        const optimized = await compressImageToBudget(file, fileBudget);
        prepared.push(optimized);
        preparation.push({
          name: file.name,
          originalBytes: file.size,
          uploadedBytes: optimized.size,
          originalLastModified: new Date(file.lastModified).toISOString(),
          optimized: optimized !== file
        });
        remainingBytes -= optimized.size;
      }

      if (prepared.reduce((sum, file) => sum + file.size, 0) > MAX_CUSTOM_EVIDENCE_REQUEST_BYTES) {
        throw new Error("The selected evidence is still too large. Submit one clear photo or use an evidence link.");
      }
      setEvidenceFiles(prepared);
      setEvidenceFilePreparation(preparation);
    } catch (preparationError) {
      setEvidenceFiles([]);
      setEvidenceFilePreparation([]);
      setProofError(preparationError instanceof Error ? preparationError.message : "Unable to prepare evidence.");
    } finally {
      setPreparingEvidence(false);
    }
  }

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

    setClaiming(true);
    try {
      // Privy authentication becomes ready before our server profile snapshot
      // on a cold task-page load. Refresh once instead of treating that brief
      // loading state as a missing operator profile and redirecting the user.
      const claimAuth = auth?.user.walletAddress
        ? auth
        : await loadAuth();
      if (!claimAuth) {
        throw new Error("Unable to verify your AI2Human profile. Refresh the page and try again.");
      }
      if (!claimAuth.user.walletAddress) {
        setError("Connect a payout wallet before claiming tasks.");
        router.push("/app/profile");
        return;
      }
      const claimWallet = connectedWallet || claimAuth.user.walletAddress;
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/claim`,
        {
          method: "POST",
          credentials: "same-origin"
        },
        {
          authenticated,
          getAccessToken
        }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to claim task.");
      }
      setMessage(`Claimed "${task.title}". You now hold this execution slot.`);
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
    setProofError("");

    if (!claimedByMe) {
      setError("Claim the task before submitting proof.");
      return;
    }

    setSubmitting(true);
    try {
      const totalEvidenceBytes = evidenceFiles.reduce((sum, file) => sum + file.size, 0);
      if (isCustomRealWorldTask && totalEvidenceBytes > MAX_CUSTOM_EVIDENCE_REQUEST_BYTES) {
        throw new Error("The selected evidence is too large. Re-select it so the page can optimize the upload.");
      }
      const proofArtifactUrl = requiresPhoto
        ? screenshotUrl.trim() || postUrl.trim() || profileUrl.trim() || undefined
        : undefined;
      let requestBody: BodyInit;
      let requestHeaders: HeadersInit | undefined = { "Content-Type": "application/json" };
      if (isCustomRealWorldTask) {
        const form = new FormData();
        const clientCapturedAt = new Date().toISOString();
        evidenceFiles.slice(0, 4).forEach((file) => form.append("artifacts", file));
        if (evidenceUrl.trim()) form.append("evidenceUrl", evidenceUrl.trim());
        form.append("by", "human");
        form.append("summary", summary.trim());
        form.append("clientTimestamp", clientCapturedAt);
        if (locationNote.trim()) form.append("locationNote", locationNote.trim());
        if (browserLocation) form.append("location", JSON.stringify(browserLocation));
        form.append("deviceProof", JSON.stringify({
          captureMethod: evidenceFiles.length ? "file_picker" : evidenceUrl.trim() ? "link" : undefined,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
          clientCapturedAt,
          clientNonce: proofNonceRef.current,
          filePreparation: evidenceFilePreparation
        }));
        requestBody = form;
        requestHeaders = undefined;
      } else {
        requestBody = JSON.stringify({
          by: "human",
          executorHandle: requiresExecutorHandle ? executorHandle : undefined,
          postUrl: requiresPostUrl ? postUrl : undefined,
          profileUrl: requiresProfileUrl ? profileUrl : profileUrl || undefined,
          screenshotUrl: proofArtifactUrl,
          locationNote: requiresLocationNote ? locationNote : undefined,
          timestampNote: requiresTimestampNote ? timestampNote : undefined,
          proofPhrase: requiresProofPhrase ? proofPhrase : undefined,
          summary
        });
      }
      const response = await fetchWithPrivySessionRetry(
        `/api/tasks/${task.id}/evidence`,
        {
          method: "POST",
          headers: requestHeaders,
          credentials: "same-origin",
          body: requestBody
        },
        {
          authenticated,
          getAccessToken
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        task?: Task;
        payment?: PaymentResult;
        message?: string;
        status?: "pass" | "resubmit" | "manual_review";
        attempt?: {
          used?: number;
          remaining?: number;
          max?: number;
        };
      };
      if (payload.task) {
        setTask(payload.task);
      } else {
        await loadTask();
      }
      const storedForAnotherAttempt = Boolean(
        payload.task
        && (payload.status === "manual_review" || payload.status === "resubmit")
      );
      if (!response.ok && !storedForAnotherAttempt) {
        throw new Error(payload.error || "Unable to submit proof.");
      }
      setEvidenceFiles([]);
      setEvidenceFilePreparation([]);
      setEvidenceUrl("");
      setSummary("");
      proofNonceRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      if (isCustomRealWorldTask) {
        void loadPublisherProof();
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
      } else if (payload.status === "manual_review" || payload.status === "resubmit") {
        const attemptUsed = Number(payload.attempt?.used || 0);
        const attemptsRemaining = Number(payload.attempt?.remaining || 0);
        setMessage(
          `Attempt ${attemptUsed || "saved"} was received. ${
            attemptsRemaining > 0
              ? `You can upload ${attemptsRemaining} more replacement${attemptsRemaining === 1 ? "" : "s"}.`
              : "No replacement attempts remain; the stored proof now needs reviewer action."
          }`
        );
      } else {
        setMessage(payload.message || "Proof submitted and verified.");
      }
    } catch (submitError) {
      setProofError(submitError instanceof Error ? submitError.message : "Unable to submit proof.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitArticle() {
    setError("");
    setMessage("");
    setArticleErrorModal("");
    setArticleSubmitStatus("Preparing submission...");
    const walletAddress = articleWallet;
    if (!walletAddress) {
      setArticleSubmitStatus("");
      login();
      return;
    }

    setArticleSubmitting(true);
    const latestAuth = await loadAuth();
    if (!latestAuth) {
      setArticleSubmitting(false);
      setArticleSubmitStatus("");
      login();
      return;
    }
    setArticleSubmitStatus("Checking profile requirements...");
    const latestHasContactEmail = hasUsableEmail(latestAuth.user.contactEmail) || hasUsableEmail(latestAuth.user.email);
    const latestHasBoundXAccount = Boolean(latestAuth.user.xAccount?.username);
    if (isTestArticleContest || isBannerImageContest) {
      if (!latestHasContactEmail) {
        setArticleSubmitting(false);
        setArticleSubmitStatus("");
        setError(`Add a contact email from Profile before you ${isBannerImageContest ? "submit a banner" : "submit an article"}.`);
        router.push("/app/profile");
        return;
      }
    } else {
      if (!latestHasContactEmail && !latestHasBoundXAccount) {
        setArticleSubmitting(false);
        setArticleSubmitStatus("");
        setError("Add a contact email and bind your X account from Profile before you submit an article.");
        router.push("/app/profile");
        return;
      }
      if (!latestHasContactEmail) {
        setArticleSubmitting(false);
        setArticleSubmitStatus("");
        setError("Add a contact email from Profile before you submit an article.");
        router.push("/app/profile");
        return;
      }
      if (!latestHasBoundXAccount) {
        setArticleSubmitting(false);
        setArticleSubmitStatus("");
        setError("Bind your X account from Profile before you submit an article.");
        router.push("/app/profile");
        return;
      }
    }

    try {
      setArticleSubmitStatus(
        isBannerImageContest
          ? "Checking banner image URL. This can take a few seconds..."
          : "Checking live X link. This can take a few seconds..."
      );
      const response = await fetch(`/api/tasks/${task.id}/article-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          wallet: walletAddress.toLowerCase(),
          articleUrl,
          contentSnapshot: articleContent
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        submission?: ArticleSubmission;
        updateLocked?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit article.");
      }
      if (payload.submission) {
        setArticleSubmission(payload.submission);
        setArticleUrl(payload.submission.articleUrl);
        setArticleContent(payload.submission.contentSnapshot);
      }
      setArticleSubmitStatus("Saved.");
      setArticleUpdateLocked(Boolean(payload.updateLocked));
      setMessage(
        isBannerImageContest
          ? "Banner submitted. Final scores and ranking will be shown after the contest ends."
          : "Article submitted. Final scores and ranking will be shown after the contest ends."
      );
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : "Unable to submit article.";
      setError(errorMessage);
      setArticleErrorModal(errorMessage);
    } finally {
      setArticleSubmitting(false);
      setArticleSubmitStatus("");
    }
  }

  // ===== QuestN Layout (all tasks) =====
  {
    // For quest/twitter tasks, "done" means the current user has claimed, not the global task status
    // Also treat taskState as ended when pool is exhausted
    const isDone = !!claimResult || task.taskState === "full" || task.taskState === "closed" || task.taskState === "refunded";
    // Tag label: show "Ended" only when task pool is exhausted (all winners claimed / refunded / closed)
    // Otherwise show "Completed" if current user claimed, "Ongoing" if not
    const isGloballyEnded = task.taskState === "full" || task.taskState === "closed" || task.taskState === "refunded";
    const paidSlots = Math.min(
      maxWinners,
      isGloballyEnded && questersData.claimedCount === 0 ? maxWinners : questersData.claimedCount
    );
    const paidProgressPct = maxWinners > 0 ? Math.min(100, Math.round((paidSlots / maxWinners) * 100)) : 0;
    const endedReason =
      task.taskState === "full"
        ? "All reward slots have been paid."
        : task.taskState === "refunded"
          ? "This reward pool has been refunded."
          : "This activity is closed.";

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

    function buildTwitterIntentUrl(taskType: string, campaign?: Task["campaign"]): string {
      const handle = campaign?.campaignLinks?.followHandle?.replace("@", "") || campaign?.requesterHandle?.replace("@", "") || "";
      if (taskType === "twitter_follow") {
        if (!handle) return "";
        return `https://x.com/intent/follow?screen_name=${handle}`;
      }

      // Extract tweet ID from targetUrl (e.g. https://x.com/ai2humannetwork/status/123456789)
      const targetUrl = campaign?.targetUrl || "";
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

    function extractRequirementUrl(campaign: Task["campaign"] | undefined, labels: string[]) {
      const requirements = campaign?.proofRequirements || [];
      const match = requirements.find((requirement) => {
        const normalized = requirement.toLowerCase();
        return labels.some((label) => normalized.startsWith(label.toLowerCase()));
      });
      return match?.match(/https?:\/\/\S+/)?.[0] || "";
    }

    function buildTweetIntentFromUrl(type: "like" | "retweet", targetUrl: string) {
      const tweetId = targetUrl.match(/status\/(\d+)/)?.[1] || "";
      if (!tweetId) return targetUrl;
      return type === "like"
        ? `https://x.com/intent/like?tweet_id=${tweetId}`
        : `https://x.com/intent/retweet?tweet_id=${tweetId}`;
    }

    function getTaskDisplayLabel(taskType: string, requesterHandle?: string): string {
      const handle = requesterHandle?.replace("@", "") || "ai2humannetwork";
      if (taskType === "twitter_follow") return `Follow @${handle} on X`;
      if (taskType === "twitter_like") return `Like a post by @${handle} on X`;
      if (taskType === "twitter_retweet") return `Repost @${handle} on X`;
      if (taskType === "twitter_comment") return `Comment on @${handle}'s post`;
      return `Complete task on X`;
    }

    function getDeadlineDisplay() {
      const deadline = task.deadline;
      if (!deadline) return "No deadline";
      if (isCustomRealWorldTask) return formatTaskWindowUtc8(task.createdAt, deadline);
      return formatCampaignWindowUtc8(deadline);
    }

    const telegramUrl =
      task.campaign?.campaignLinks?.telegramUrl || extractRequirementUrl(task.campaign, ["Join"]);
    const repostUrl =
      task.campaign?.campaignLinks?.repostUrl || extractRequirementUrl(task.campaign, ["Repost", "Retweet"]);
    const likeUrl =
      task.campaign?.campaignLinks?.likeUrl || extractRequirementUrl(task.campaign, ["Like"]);

    // Build the step list from the actual campaign instead of hardcoded actions.
    // Telegram / Repost / Like steps only appear when the campaign supplies those links.
    const campaignAction = task.campaign?.action;
    const mainActionLabel =
      campaignAction === "follow" ? "Follow"
      : campaignAction === "engage" ? "Engage"
      : campaignAction === "quote" ? "Quote"
      : campaignAction === "reply" ? "Reply"
      : campaignAction === "repost" ? "Repost"
      : campaignAction === "post" || campaignAction === "creative_submission" ? "Post"
      : campaignAction === "product_feedback" ? "Try it"
      : campaignAction === "community_proof" ? "Join"
      : campaignAction === "storefront_check" || campaignAction === "human_execution_request" ? "Start"
      : "Open";
    const mainIntentUrl =
      task.campaign?.targetUrl
      || (task.campaign?.platform === "x"
        ? buildTwitterIntentUrl("twitter_follow", task.campaign)
        : "")
      || "";
    const questTaskItems = [
      {
        key: "0",
        icon: followSvg,
        label: task.campaign?.label || getTaskDisplayLabel("twitter_follow", task.campaign?.requesterHandle),
        actionLabel: mainActionLabel,
        intentUrl: mainIntentUrl
      }
    ];
    if (telegramUrl) {
      questTaskItems.push({ key: "1", icon: joinSvg, label: "Join Telegram Group", actionLabel: "Join", intentUrl: telegramUrl });
    }
    if (repostUrl) {
      questTaskItems.push({ key: "2", icon: retweetSvg, label: "Repost announcement tweet", actionLabel: "Repost", intentUrl: buildTweetIntentFromUrl("retweet", repostUrl) });
    }
    if (likeUrl) {
      questTaskItems.push({ key: "3", icon: likeSvg, label: "Like announcement tweet", actionLabel: "Like", intentUrl: buildTweetIntentFromUrl("like", likeUrl) });
    }
    const allTasksVerified = questTaskItems.length > 0 && questTaskItems.every((item) => taskStates[item.key]?.verified);

    if (isCustomRealWorldTask) {
      const spec = upgradeCustomTaskSpec(task.campaign!.customTaskSpec!) as NonNullable<NonNullable<Task["campaign"]>["customTaskSpec"]>;
      const locationRequired = spec.locationPolicy.mode === "required";
      const expectedPlace = normalizeExpectedPlace(spec.locationPolicy.expectedPlace);
      const rawBrief = normalizeTaskBrief(spec.brief || task.campaign?.brief || task.title);
      const displayBrief = normalizeTaskDisplayTitle(rawBrief, 4000) || rawBrief;
      const cleanStoredTitle = normalizeTaskDisplayTitle(task.title);
      const displayTitle = cleanStoredTitle || displayBrief;
      const allowedEvidenceKinds = new Set(spec.submission.allowedKinds);
      const acceptsImages = allowedEvidenceKinds.has("image");
      const acceptsVideos = allowedEvidenceKinds.has("video");
      const acceptsLinks = allowedEvidenceKinds.has("link");
      const acceptsText = allowedEvidenceKinds.has("text");
      const acceptsFiles = acceptsImages || acceptsVideos;
      const fileAccept = [
        ...(acceptsImages ? ["image/*"] : []),
        ...(acceptsVideos ? ["video/mp4", "video/quicktime", "video/webm"] : [])
      ].join(",");
      const fileLabel = acceptsImages && acceptsVideos
        ? "Images or short videos"
        : acceptsVideos
          ? "Short video"
          : "Image evidence";
      const evidenceInstructions = new Set(
        spec.evidenceRequirements.map((requirement) => requirement.instruction.trim().toLowerCase())
      );
      const operatorInstructions = spec.operatorInstructions.filter((instruction) => {
        const normalized = instruction.trim().toLowerCase();
        if (!normalized || /^complete (?:this|the) custom task\s*:/i.test(instruction)) return false;
        if (normalizeTaskBrief(instruction).toLowerCase() === displayBrief.toLowerCase()) return false;
        return !evidenceInstructions.has(normalized);
      });
      const materialCounts = {
        image: evidenceFiles.filter((file) => file.type.startsWith("image/")).length,
        video: evidenceFiles.filter((file) => file.type.startsWith("video/")).length,
        link: evidenceUrl.trim() ? 1 : 0,
        text: summary.trim().length >= 3 ? 1 : 0
      };
      const requiredMaterialsReady = spec.evidenceRequirements
        .filter((requirement) => requirement.required)
        .every((requirement) => materialCounts[requirement.kind] >= Math.max(1, requirement.minCount || 1));
      const missingRequirements = spec.evidenceRequirements
        .filter((requirement) => requirement.required)
        .filter((requirement) => materialCounts[requirement.kind] < Math.max(1, requirement.minCount || 1));
      const requiredFileCount = spec.evidenceRequirements
        .filter((requirement) => requirement.required && (requirement.kind === "image" || requirement.kind === "video"))
        .reduce((sum, requirement) => sum + Math.max(1, requirement.minCount || 1), 0);
      const submitLabel = allowedEvidenceKinds.size > 1
        ? "Submit evidence"
        : acceptsImages
          ? "Submit image"
          : acceptsVideos
            ? "Submit video"
            : acceptsLinks
              ? "Submit link"
              : "Submit answer";
      const canSubmitCustomProof = canEditProof
        && requiredMaterialsReady
        && (!spec.submission.summaryRequired || summary.trim().length >= 3)
        && (!locationRequired || Boolean(browserLocation || locationNote.trim()))
        && !preparingEvidence;
      const needsProofAttention =
        task.status === "human_done"
        && ["manual_review", "resubmit"].includes(String(verificationStatus.verdict || ""));
      const freshnessCheck = verificationStatus.checks.find(
        (check: VerificationCheck) => check.id === "selected_file_recency" && !check.passed
      );
      const primaryAttentionReason =
        freshnessCheck?.reason
        || verificationReviewReasons[0]
        || verificationStatus.reason
        || "The current proof did not clear automatic verification.";
      const selectedFileLooksOlderThanTask =
        Boolean(freshnessCheck)
        || /(?:before this task was created|predate(?:s|d)? the task)/i.test(primaryAttentionReason);
      const supportingAttentionReasons = verificationReviewReasons
        .filter((reason) => reason !== primaryAttentionReason)
        .slice(0, 4);
      const attentionTitle = selectedFileLooksOlderThanTask
        ? "This photo appears older than the task"
        : verificationStatus.reviewCause === "provider_unavailable"
          ? "AI verification could not finish"
          : "Your evidence needs attention";
      const canReplaceProof =
        claimedByMe
        && customProofAttemptState.allowed
        && customProofAttemptState.isResubmission;
      // Custom real-world tasks currently use one exclusive executor slot.
      // A slot is work authorization, not a contest entry: nobody should begin
      // collecting evidence until the claim has been committed.
      const executorSlots = 1;
      const taskExperience = buildTaskExperience(task);
      const workflowState = taskExperience.workflow;
      const awaitingPublication = ["draft", "awaiting_funding"].includes(workflowState);
      const slotAvailable = taskExperience.claimable
        &&
        !isGloballyEnded
        && !task.assignee
        && ["created", "ai_failed"].includes(task.status);
      const availableExecutorSlots = slotAvailable ? 1 : 0;
      const proofSubmitted = ["human_done", "verified", "paid"].includes(task.status);
      const slotStatus = task.status === "paid"
        ? "Reward paid"
        : task.status === "verified"
          ? "Proof verified"
          : task.status === "human_done"
            ? ["manual_review", "resubmit"].includes(String(verificationStatus.verdict || ""))
              ? "Proof needs attention"
              : "Proof submitted"
            : awaitingPublication
              ? "Not published yet"
            : claimedByMe
        ? "Reserved for you"
        : slotAvailable
          ? "1 slot available"
          : task.assignee
            ? "Slot claimed"
            : "No slot available";
      const slotGuidance = task.status === "paid"
        ? "Approved proof has been paid. This task is complete."
        : task.status === "verified"
          ? "Proof passed verification and settlement is being completed."
          : task.status === "human_done"
            ? verificationStatus.reviewCause === "provider_unavailable"
              ? "Proof is safely stored. The image verifier is unavailable, so a reviewer must approve settlement."
              : ["manual_review", "resubmit"].includes(String(verificationStatus.verdict || ""))
                ? customProofAttemptState.attemptsRemaining > 0
                  ? `The proof needs a replacement. The executor has ${customProofAttemptState.attemptsRemaining} attempt${customProofAttemptState.attemptsRemaining === 1 ? "" : "s"} remaining.`
                  : "The proof needs review and all replacement attempts have been used."
                : "Proof is stored and waiting for verification."
            : awaitingPublication
              ? workflowState === "draft"
                ? "The publisher must confirm this task before it can accept an executor."
                : "The reward must be funded and verified before this task can accept an executor."
            : claimedByMe
        ? "You hold the execution slot. Submit the required proof before the deadline."
        : slotAvailable
          ? "First come, first served. Only the confirmed executor should travel or collect evidence."
          : task.assignee
            ? "Another executor holds this slot. Do not begin work for this task."
            : "This task is closed and no longer accepts execution claims.";
      const publisherStage = taskExperience.stage;
      const publisherGuidance = task.status === "paid"
        ? "Settlement is complete. The proof and payment receipt remain available as the task record."
        : task.status === "verified"
          ? "The proof passed verification. Settlement is now the next recorded step."
          : task.status === "human_done"
            ? ["manual_review", "resubmit"].includes(String(verificationStatus.verdict || ""))
              ? "Automatic payment is paused. The reason and replacement status are highlighted below."
              : "The executor submitted proof. Inspect the originals and verification results below."
            : task.status === "human_assigned"
              ? "An executor holds the slot and is collecting the required evidence."
              : taskExperience.publisher;
      const publicStatusLabel = taskExperience.label;
      return (
        <main className={styles.page}>
          <div className={styles.qnOuter}>
            <Link href="/tasks" className={styles.backLink}>← Back to tasks</Link>
            {justCreated && isTaskPublisher ? (
              <section className={styles.creationHandoff} aria-live="polite">
                <span className={styles.creationHandoffCheck}>✓</span>
                <div>
                  <strong>Your task is saved</strong>
                  <p>You are now in its publishing workspace. Complete the highlighted wallet step below; the task becomes public only after its reward is secured.</p>
                </div>
              </section>
            ) : null}
            {error ? <div className={styles.noticeMsg}>{error}</div> : null}
            {message ? <div className={styles.successMsg}>{message}</div> : null}

            {isTaskPublisher ? (
              <section className={styles.publisherPanel} aria-label="Publisher task status">
                <div className={styles.publisherPanelTop}>
                  <div>
                    <span>Publisher workspace</span>
                    <h2>{publicStatusLabel}</h2>
                    <p>{publisherGuidance}</p>
                  </div>
                  <div className={styles.publisherActions}>
                    {task.status === "human_done" && task.campaign?.reviewPolicy === "publisher_approval" ? (
                      <>
                        <button type="button" onClick={() => void reviewPublisherProof("approve")} disabled={takingPublisherAction}>
                          {takingPublisherAction ? "Reviewing…" : "Approve proof"}
                        </button>
                        <button type="button" onClick={() => void reviewPublisherProof("revision")} disabled={takingPublisherAction}>
                          Request revision
                        </button>
                      </>
                    ) : null}
                    {workflowState === "draft" ? (
                      <button type="button" onClick={() => void takePublisherAction("confirm_task")} disabled={takingPublisherAction}>
                        {takingPublisherAction ? "Confirming..." : "Confirm task"}
                      </button>
                    ) : null}
                    {isTaskPublisher &&
                    task.campaign?.fundingMode === "ai2human_managed_pool" &&
                    task.campaign?.poolAddress &&
                    task.taskState !== "refunded" &&
                    ["funded", "refund_pending"].includes(String(task.campaign?.agentLifecycle?.fundingState || "")) &&
                    (countdown.ended || ["expired", "cancelled", "refund_pending"].includes(workflowState)) ? (
                      <button
                        type="button"
                        onClick={() => void refundPoolTask()}
                        disabled={takingPublisherAction || refundingPool}
                        title="Return the remaining pool to the original requester wallet"
                      >
                        {refundingPool ? "Refunding…" : "Refund remaining pool"}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void copyTaskLink()}>Copy task link</button>
                    <Link href="/tasks/mine">All published tasks</Link>
                  </div>
                </div>
                {workflowState === "awaiting_funding" ? (
                  <div className={styles.fundingGuide}>
                    <div className={styles.fundingGuideHeader}>
                      <span>Task saved</span>
                      <strong>{fundingAuthorizationRequired ? "One-time wallet permission required" : fundingShortfall ? "Add funds to publish" : fundingGasRequired ? "Add Base ETH for network fees" : fundingProviderIssue ? "Wallet provider needs another attempt" : "Preparing reward funding"}</strong>
                      <p>
                        {fundingAuthorizationRequired
                          ? "Authorize your Privy embedded wallet once. AI2Human can then fund this and future tasks from that wallet without repeating this step."
                          : fundingShortfall
                            ? `Your task is safe but not public yet. Add at least ${fundingShortfall.required} USDC to the embedded wallet below, then retry publishing.`
                            : fundingGasRequired
                              ? "The reward balance is ready, but this wallet needs a small amount of ETH on Base to pay the network fee. Send Base ETH to the address below, then retry."
                              : fundingProviderIssue
                                ? "Your task and funds are safe. Retry the same publishing operation so AI2Human can capture the wallet provider response; this cannot create a duplicate charge."
                            : "AI2Human is checking your embedded wallet and will publish automatically after the reward is secured."}
                      </p>
                    </div>
                    {fundingAuthorizationRequired ? (
                      <button type="button" onClick={() => void authorizeTaskFunding()} disabled={takingPublisherAction}>
                        {takingPublisherAction ? "Authorizing wallet…" : "Authorize once & continue"}
                      </button>
                    ) : null}
                    {fundingShortfall ? (
                      <div className={styles.fundingBalanceBox}>
                        <div><span>Needed</span><strong>{fundingShortfall.required} USDC</strong></div>
                        <div><span>Available</span><strong>{fundingShortfall.usdcBalance} USDC</strong></div>
                        <div className={styles.fundingWalletAddress}>
                          <span>Deposit USDC on Base to your embedded wallet</span>
                          <strong>{user?.wallet?.address || wallets.find((wallet) => wallet.walletClientType === "privy")?.address || "Wallet unavailable"}</strong>
                        </div>
                        <button type="button" onClick={() => void fundAndPublishTask()} disabled={takingPublisherAction}>
                          {takingPublisherAction ? "Checking balance…" : "I added funds · Retry publish"}
                        </button>
                      </div>
                    ) : null}
                    {fundingGasRequired ? (
                      <div className={styles.fundingBalanceBox}>
                        <div><span>Network</span><strong>Base</strong></div>
                        <div><span>Asset needed</span><strong>ETH for gas</strong></div>
                        <div className={styles.fundingWalletAddress}>
                          <span>Deposit a small amount of ETH on Base to this embedded wallet</span>
                          <strong>{user?.wallet?.address || wallets.find((wallet) => wallet.walletClientType === "privy")?.address || "Wallet unavailable"}</strong>
                        </div>
                        <p>A small Base ETH balance is normally sufficient. If you already funded this wallet, do not keep adding ETH—retry once and report the displayed wallet-provider error.</p>
                        <button type="button" onClick={() => void fundAndPublishTask()} disabled={takingPublisherAction}>
                          {takingPublisherAction ? "Checking Base ETH…" : "I added Base ETH · Retry publish"}
                        </button>
                      </div>
                    ) : null}
                    {fundingProviderIssue ? (
                      <button type="button" onClick={() => void authorizeTaskFunding()} disabled={takingPublisherAction}>
                        {takingPublisherAction ? "Updating wallet permission…" : "Update wallet permission & continue"}
                      </button>
                    ) : null}
                    {!fundingAuthorizationRequired && !fundingShortfall && !fundingGasRequired && !fundingProviderIssue ? (
                      <button type="button" onClick={() => void fundAndPublishTask()} disabled={takingPublisherAction}>
                        {takingPublisherAction ? "Checking wallet…" : "Retry publish"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className={styles.publisherProgress}>
                  {["Task", "Execute", "Proof", "Verify", "Settle"].map((label, index) => (
                    <span className={index <= publisherStage ? styles.publisherProgressDone : ""} key={label}>
                      <i>{index < publisherStage ? "✓" : index + 1}</i>{label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div className={styles.qnSection}>
              <div className={styles.qnMain}>
                <div className={styles.qnDetail}>
                  <div className={styles.qnCommunityBox}>
                    <div className={styles.qnCommunity}>
                      <div className={styles.qnLogo}>
                        <img src="/brand/ai2human-dual-arrow-256.png" alt="AI2Human" />
                      </div>
                      <span className={styles.qnName}>{isResearchEvidenceTask ? "Research evidence review" : "Real-world human execution"}</span>
                    </div>
                    <span className={`${styles.qnTag} ${isDone ? styles.qnTagCompleted : styles.qnTagOngoing}`}>
                      {publicStatusLabel}
                    </span>
                  </div>

                  <div className={styles.qnTitleWrap}>
                    <h1 className={styles.qnTitle}>{displayTitle}</h1>
                    <div className={styles.qnTagBox}>
                      <span className={styles.qnTag}>{rewardLabel}</span>
                      <span className={styles.qnTag}>{getDeadlineDisplay()}</span>
                    </div>
                  </div>
                  <TaskRoomStatus task={task} />

                  <section className={styles.executionPanel} aria-label="Execution availability">
                    <div className={styles.executionStats}>
                      <div className={styles.executionStat}>
                        <span>Execution</span>
                        <strong>{executorSlots} executor needed</strong>
                        <small>Exclusive assignment</small>
                      </div>
                      <div className={`${styles.executionStat} ${slotAvailable ? styles.executionStatAvailable : styles.executionStatUnavailable}`}>
                        <span>Availability</span>
                        <strong>{slotStatus}</strong>
                        <small>{proofSubmitted ? "Execution complete" : slotAvailable ? "First come, first served" : claimedByMe ? "Assigned to your account" : awaitingPublication ? "Waiting for publisher" : "Do not begin work"}</small>
                      </div>
                      <div className={styles.executionStat}>
                        <span>Reward</span>
                        <strong>{rewardLabel}</strong>
                        <small>For approved proof</small>
                      </div>
                    </div>
                    <div className={styles.executionRule}>
                      <span className={styles.executionRuleIcon} aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </span>
                      <div className={styles.executionRuleCopy}>
                        <strong>{proofSubmitted ? slotStatus : claimedByMe ? "This slot is reserved for you" : awaitingPublication ? "Wait for publication" : "Claim before starting work"}</strong>
                        <span>{slotGuidance}</span>
                      </div>
                      {!claimedByMe && slotAvailable ? (
                        <button type="button" className={styles.executionClaimButton} onClick={claimTask} disabled={claiming}>
                          {claiming ? "Claiming..." : authenticated ? "Claim this slot" : "Connect and claim"}
                        </button>
                      ) : null}
                    </div>
                  </section>

                  {needsProofAttention ? (
                    <section className={styles.proofActionCard} role="alert" aria-label="Proof action required">
                      <div className={styles.proofActionIcon} aria-hidden="true">!</div>
                      <div className={styles.proofActionBody}>
                        <div className={styles.proofActionTopline}>
                          <span>Action required</span>
                          <strong>
                            {customProofAttemptState.attemptsUsed}/{customProofAttemptState.maxAttempts} attempts used
                          </strong>
                        </div>
                        <h2>{attentionTitle}</h2>
                        <p>{primaryAttentionReason}</p>
                        {canReplaceProof ? (
                          <div className={styles.proofActionNext}>
                            <strong>Next step</strong>
                            <span>
                              {acceptsImages
                                ? "Take a new photo now, then upload it below. The replacement will be checked again automatically."
                                : "Replace the evidence below. The new submission will be checked again automatically."}
                            </span>
                          </div>
                        ) : customProofAttemptState.attemptsRemaining <= 0 ? (
                          <div className={styles.proofActionNext}>
                            <strong>No retries remaining</strong>
                            <span>The stored proof now needs a reviewer decision. It will not be paid automatically.</span>
                          </div>
                        ) : isTaskPublisher ? (
                          <div className={styles.proofActionNext}>
                            <strong>Publisher view</strong>
                            <span>The executor may replace this proof before using all three attempts.</span>
                          </div>
                        ) : null}
                        <div className={styles.proofActionControls}>
                          {canReplaceProof ? (
                            <button
                              type="button"
                              onClick={() => {
                                const fileInput = document.getElementById("custom-proof-file") as HTMLInputElement | null;
                                if (fileInput) fileInput.click();
                                else document.getElementById("custom-proof-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                            >
                              {acceptsImages ? "Take or upload a new photo" : "Replace evidence"}
                            </button>
                          ) : null}
                          {supportingAttentionReasons.length ? (
                            <details>
                              <summary>Technical details</summary>
                              <ul>
                                {supportingAttentionReasons.map((reason) => <li key={reason}>{reason}</li>)}
                              </ul>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <div className={styles.qnDesc}>
                    <p className={styles.qnDescTitle}>What to do</p>
                    <div className={styles.qnDescContent}>
                      {displayTitle.toLowerCase() !== displayBrief.toLowerCase() ? <p>{displayBrief}</p> : null}
                      {operatorInstructions.length ? (
                        <ol>
                          {operatorInstructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
                        </ol>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.articleRuleGrid}>
                    {spec.evidenceRequirements.map((requirement, index) => (
                      <div className={styles.articleRuleCard} key={requirement.id}>
                        <span className={styles.articleRuleIndex}>{String(index + 1).padStart(2, "0")}</span>
                        <span className={styles.evidenceTypeBadge}>{requirement.kind}{requirement.minCount && requirement.minCount > 1 ? ` × ${requirement.minCount}` : ""}</span>
                        <p className={styles.articleRuleTitle}>{requirement.label}</p>
                        <p>{requirement.instruction}</p>
                      </div>
                    ))}
                    {locationRequired ? (
                      <div className={styles.articleRuleCard}>
                        <span className={styles.articleRuleIndex}>GPS</span>
                        <p className={styles.articleRuleTitle}>Location required</p>
                        <p>Attach browser location or type the place because this task explicitly requires physical presence.</p>
                      </div>
                    ) : null}
                  </div>

                  {canEditProof && (
                    <div className={styles.form} id="custom-proof-form">
                      <div className={styles.notice}>
                        <strong>
                          {customProofAttemptState.isResubmission
                            ? `Replacement attempt ${customProofAttemptState.nextAttempt} of ${customProofAttemptState.maxAttempts}`
                            : `Proof attempt ${customProofAttemptState.nextAttempt} of ${customProofAttemptState.maxAttempts}`}
                        </strong>
                        <p>
                          {customProofAttemptState.isResubmission
                            ? "Choose newly captured evidence that fixes the issue shown above. Your previous proof remains in the audit history."
                            : "Submit only the evidence listed for this task. No watermark is required. Server receipt time is recorded automatically."}
                        </p>
                      </div>

                      {acceptsFiles ? (
                        <div className={styles.field}>
                          <label htmlFor="custom-proof-file">{fileLabel}</label>
                          <input
                            id="custom-proof-file"
                            className={styles.input}
                            type="file"
                            accept={fileAccept}
                            capture="environment"
                            multiple={requiredFileCount > 1}
                            onChange={(event) => void prepareEvidenceFiles(Array.from(event.target.files || []))}
                            disabled={submitting || preparingEvidence}
                          />
                          <p className={styles.fieldHelp}>Up to 4 files. Large phone photos are optimized automatically before upload.</p>
                          {preparingEvidence ? <p className={styles.fieldHelp}>Preparing evidence…</p> : null}
                          {evidenceFilePreparation.map((file) => (
                            <p className={styles.fieldHelp} key={`${file.name}-${file.originalLastModified}`}>
                              ✓ {file.name} · {formatFileSize(file.uploadedBytes)}
                              {file.optimized ? ` · optimized from ${formatFileSize(file.originalBytes)}` : ""}
                            </p>
                          ))}
                          {evidenceFiles.length ? (
                            <div className={styles.evidencePreviewGrid}>
                              {evidenceFiles.map((file) => <EvidenceFilePreview key={`${file.name}-${file.lastModified}`} file={file} />)}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {acceptsLinks ? (
                        <div className={styles.field}>
                          <label htmlFor="custom-proof-link">Evidence link</label>
                          <input
                            id="custom-proof-link"
                            className={styles.input}
                            type="url"
                            value={evidenceUrl}
                            onChange={(event) => setEvidenceUrl(event.target.value)}
                            placeholder="https://..."
                            disabled={submitting}
                          />
                          <p className={styles.fieldHelp}>Submit the direct source URL requested by this task.</p>
                        </div>
                      ) : null}

                      {acceptsText && spec.submission.summaryRequired ? (
                        <div className={styles.field}>
                          <label htmlFor="custom-proof-summary">Written result (required)</label>
                          <textarea
                            id="custom-proof-summary"
                            className={styles.textarea}
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                            placeholder="Enter the written result requested by this task."
                            rows={3}
                            disabled={submitting}
                          />
                        </div>
                      ) : null}

                      {locationRequired ? (
                        <div className={styles.field}>
                          <label htmlFor="custom-location-note">Place (required)</label>
                          <input
                            id="custom-location-note"
                            className={styles.input}
                            value={locationNote}
                            onChange={(event) => setLocationNote(event.target.value)}
                            placeholder={expectedPlace || "Store or venue name"}
                            disabled={submitting}
                          />
                          <div className={styles.ctaRow}>
                            <button type="button" className={styles.buttonGhost} onClick={captureOptionalLocation} disabled={locating || submitting}>
                              {locating ? "Getting location..." : browserLocation ? "✓ Location attached" : "Attach location"}
                            </button>
                            {browserLocation && (
                              <button type="button" className={styles.buttonGhost} onClick={() => setBrowserLocation(null)} disabled={submitting}>
                                Remove location
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className={styles.ctaRow}>
                        <button type="button" className={styles.button} onClick={submitProof} disabled={!canSubmitCustomProof || submitting || preparingEvidence}>
                          {preparingEvidence ? "Preparing evidence..." : submitting ? "Submitting..." : submitLabel}
                        </button>
                      </div>
                      {missingRequirements.length ? (
                        <p className={styles.evidenceMissing}>Still needed: {missingRequirements.map((requirement) => requirement.label).join(", ")}</p>
                      ) : (
                        <p className={styles.evidenceReady}>✓ Required evidence is ready</p>
                      )}
                      {proofError ? <div className={styles.noticeMsg}>{proofError}</div> : null}
                    </div>
                  )}

                  {isClosedProofRecord && (isTaskPublisher || claimedByMe) ? (
                    <section className={styles.submittedProof} aria-label="Submitted evidence">
                      <div className={styles.submittedProofHeader}>
                        <div>
                          <span>{isTaskPublisher ? "Publisher view" : "Your submission"}</span>
                          <h2>Submitted evidence</h2>
                        </div>
                        {publisherProof ? <strong>{publisherProof.artifacts.length} artifact{publisherProof.artifacts.length === 1 ? "" : "s"}</strong> : null}
                      </div>

                      <p className={styles.proofPrivacy}>Private evidence · visible only to the publisher and assigned executor · original links expire automatically.</p>
                      {publisherProofLoading ? <p className={styles.proofState}>Preparing secure evidence links…</p> : null}
                      {publisherProofError ? (
                        <div className={styles.proofErrorRow}>
                          <span>{publisherProofError}</span>
                          <button type="button" onClick={() => void loadPublisherProof()}>Refresh evidence links</button>
                        </div>
                      ) : null}
                      {!publisherProofLoading && !publisherProofError && !publisherProof ? (
                        <p className={styles.proofState}>The proof record is stored, but no viewable proof bundle is attached to this legacy submission.</p>
                      ) : null}
                      {publisherProof ? (
                        <>
                          <div className={styles.submittedArtifactGrid}>
                            {publisherProof.artifacts.map((artifact) => {
                              const artifactUrl = artifact.accessUrl || artifact.uri;
                              return (
                                <article className={styles.submittedArtifact} key={artifact.id}>
                                  {artifact.kind === "video" ? (
                                    <video src={artifactUrl} controls preload="metadata" />
                                  ) : artifact.kind === "image" ? (
                                    <img src={artifactUrl} alt={artifact.originalFilename || "Submitted task evidence"} />
                                  ) : (
                                    <div className={styles.submittedLinkPreview}>↗</div>
                                  )}
                                  <div>
                                    <strong>{artifact.originalFilename || (artifact.kind === "link" ? "Evidence link" : `${artifact.kind} evidence`)}</strong>
                                    <span>{artifact.sizeBytes ? formatFileSize(artifact.sizeBytes) : artifact.kind}</span>
                                    <a href={artifactUrl} target="_blank" rel="noreferrer">Open original ↗</a>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                          <dl className={styles.proofMetadata}>
                            <div><dt>Server received</dt><dd>{new Date(publisherProof.serverReceivedAt).toLocaleString()}</dd></div>
                            {publisherProof.summary ? <div><dt>Written result</dt><dd>{publisherProof.summary}</dd></div> : null}
                            {publisherProof.locationNote ? <div><dt>Venue / location</dt><dd>{publisherProof.locationNote}</dd></div> : null}
                            {publisherProof.location ? (
                              <div>
                                <dt>Captured location</dt>
                                <dd>
                                  <a href={`https://www.google.com/maps?q=${publisherProof.location.latitude},${publisherProof.location.longitude}`} target="_blank" rel="noreferrer">
                                    {publisherProof.location.latitude.toFixed(5)}, {publisherProof.location.longitude.toFixed(5)}
                                  </a>
                                  {publisherProof.location.accuracyMeters ? ` · ±${Math.round(publisherProof.location.accuracyMeters)} m` : ""}
                                </dd>
                              </div>
                            ) : null}
                            <div><dt>Integrity seal</dt><dd className={styles.proofHash}>{publisherProof.integrityHash}</dd></div>
                          </dl>
                        </>
                      ) : null}
                    </section>
                  ) : null}

                  {isClosedProofRecord && (
                    <div className={styles.qnDesc}>
                      <p className={styles.qnDescTitle}>Verification</p>
                      <div className={styles.qnDescContent}>
                        {verificationStatus.reviewCause === "provider_unavailable" ? (
                          <p><strong>System review required.</strong> The proof is stored. Use the action panel above for the available next step.</p>
                        ) : verificationStatus.verdict === "manual_review" ? (
                          <p><strong>Payment paused.</strong> The main reason and replacement action are highlighted above.</p>
                        ) : verificationStatus.verdict === "resubmit" ? (
                          <p><strong>Replacement required.</strong> Follow the action shown above and submit clearer task-specific evidence.</p>
                        ) : null}
                        {verificationStatus.checks.length ? (
                          <details className={styles.verificationDetails}>
                            <summary>View all verification checks</summary>
                            <div>
                              {verificationStatus.checks.map((check: VerificationCheck) => {
                                const lowConfidencePass = check.passed
                                  && Number.isFinite(Number(check.confidence))
                                  && Number(check.confidence) > 0
                                  && Number(check.confidence) < 0.72;
                                return (
                                  <p key={check.id}>
                                    {lowConfidencePass ? "△" : check.passed ? "✓" : "○"} {check.label}
                                    {lowConfidencePass ? " — supporting evidence is incomplete" : ""}
                                  </p>
                                );
                              })}
                            </div>
                          </details>
                        ) : <p>Proof is waiting for verification.</p>}
                        {latestPayment?.explorerUrl && <p><a href={latestPayment.explorerUrl} target="_blank" rel="noreferrer">View settlement</a></p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.qnSidebar}>
                <div className={styles.qnRewardCard}>
                  <div className={styles.qnRewardHeader}>
                    <h3 className={styles.qnRewardH3}>Reward</h3>
                    <span className={styles.qnRewardBadge}>FCFS</span>
                  </div>
                  <div className={styles.qnRewardStats}>
                    <div className={styles.qnStatItem}>
                      <span className={styles.qnStatValue}>{rewardLabel}</span>
                      <span className={styles.qnStatLabel}>For approved proof</span>
                    </div>
                    <div className={styles.qnStatDivider} />
                    <div className={styles.qnStatItem}>
                      <span className={styles.qnStatValue}>{proofSubmitted ? "Filled" : `${availableExecutorSlots}/${executorSlots}`}</span>
                      <span className={styles.qnStatLabel}>{proofSubmitted ? "Slot status" : "Slots available"}</span>
                    </div>
                  </div>
                  <div className={styles.notice}>{task.status === "paid"
                    ? "Approved proof has been paid."
                    : proofSubmitted
                      ? "The execution slot is closed. Payment is released only after the stored proof is approved."
                      : awaitingPublication
                        ? "No execution slot is available until the task is confirmed and funded."
                      : "Claim first. Payment is released only after the required proof passes verification."}</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      );
    }

    if (isArticleContest) {
      const articlePrizes = dist?.prizes?.length
        ? dist.prizes
        : [
            { rank: 1, amount: "50 USDC", slots: 1, label: "1st place" },
            { rank: 2, amount: "20 USDC", slots: 1, label: "2nd place" },
            { rank: 3, amount: "10 USDC", slots: 3, label: "3rd place" }
          ];
      const articleContestCompleted = task.status === "paid" || task.taskState === "full";
      const articleDeadlineEnded = countdown.ended || articleContestCompleted || task.taskState === "closed" || task.taskState === "refunded";
      const articleStatus = articleSubmission?.status || "not submitted";
      const articleBadgeLabel = articleSubmission?.status === "paid"
        ? "Paid"
        : articleSubmission
          ? "Submitted"
          : articleContestCompleted
            ? "Completed"
            : articleDeadlineEnded
              ? "Closed"
              : "Open";
      const articleBadgeComplete = articleBadgeLabel !== "Open";
      const canSubmitArticle = Boolean(
        articleWallet &&
          hasContactEmail &&
          (hasBoundXAccount || isTestArticleContest || isBannerImageContest) &&
          !articleDeadlineEnded &&
          !articleUpdateLocked
      );
      const articleFormLocked = articleUpdateLocked || articleDeadlineEnded || articleSubmission?.status === "paid";

      return (
        <main className={styles.page}>
          <div className={styles.qnOuter}>
            <Link href="/tasks" className={styles.backLink}>← Back to tasks</Link>

            {error ? <div className={styles.noticeMsg}>{error}</div> : null}
            {message ? <div className={styles.successMsg}>{message}</div> : null}

            <div className={styles.qnSection}>
              <div className={styles.qnMain}>
                <div className={styles.qnDetail}>
                  <div className={styles.qnCommunityBox}>
                    <div className={styles.qnCommunity}>
                      <div className={styles.qnLogo}>
                        <img src="/brand/ai2human-dual-arrow-256.png" alt="AI2Human" />
                      </div>
                      <span className={styles.qnName}>
                        {task.campaign?.requesterHandle || "@ai2humannetwork"}
                      </span>
                    </div>
                    <span className={`${styles.qnTag} ${articleBadgeComplete ? styles.qnTagCompleted : styles.qnTagOngoing}`}>
                      {articleBadgeLabel}
                    </span>
                  </div>

                  <div className={styles.qnTitleWrap}>
                    <h1 className={styles.qnTitle}>{task.title}</h1>
                    <div className={styles.qnTagBox}>
                      <span className={styles.qnTag}>{distMode}</span>
                      <span className={styles.qnTag}>{getDeadlineDisplay()}</span>
                    </div>
                  </div>

                  <div className={styles.qnDesc}>
                    <div className={styles.articleBriefHeader}>
                      <span className={styles.articleEyebrow}>{isBannerImageContest ? "Creative contest" : requiresAttachedImage ? "Image post contest" : "Writing contest"}</span>
                      <p className={styles.qnDescTitle}>{isBannerImageContest ? "Submit your banner image" : requiresAttachedImage ? "Submit your X post with image" : "Submit your X article or thread"}</p>
                      <p className={styles.articleBriefLead}>{task.campaign?.brief || task.acceptance}</p>
                      {!isBannerImageContest && (
                      <div className={styles.articleRequiredTags}>
                        <span>Required in your X post</span>
                        <strong>@ai2humannetwork</strong>
                        <strong>#A2H</strong>
                      </div>
                      )}
                    </div>

                    <div className={styles.articleResourcePanel}>
                      <div>
                        <p className={styles.articleMiniTitle}>Reference material</p>
                        <p className={styles.articleMiniCopy}>
                          {isBannerImageContest
                            ? "Use these pages to understand the AI2Human brand before designing. Strong banner submissions should feel sharp, recognizable, and native to our execution-network story."
                            : "Use these pages to understand AI2Human before writing. Strong submissions should explain the loop: task, human execution, proof, verification, and settlement."}
                        </p>
                      </div>
                      <div className={styles.articleResourceLinks}>
                        <Link href="/whitepaper">Whitepaper</Link>
                        <Link href="/protocol">Protocol</Link>
                        <Link href="/livedemo">Live demo</Link>
                        <Link href="/token">$A2H token</Link>
                      </div>
                    </div>

                    <div className={styles.articlePrizePanel}>
                      <div className={styles.articlePrizeHeader}>
                        <div>
                          <span className={styles.articlePrizeEyebrow}>Prize ranking</span>
                          <p>Winners are ranked after final results are locked.</p>
                        </div>
                        <strong>{dist?.totalPool || task.budget}</strong>
                      </div>
                      <div className={styles.articlePrizeGrid}>
                        {articlePrizes.map((prize, index) => (
                          <div key={`${prize.rank}-${index}`} className={styles.articlePrizeCard}>
                            <span>{prize.label || `Rank #${prize.rank}`}</span>
                            <strong>{prize.amount}</strong>
                            {prize.slots && prize.slots > 1 && <p>{prize.slots} slots</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.articleRuleGrid}>
                      <div className={styles.articleRuleCard}>
                        <span className={styles.articleRuleIndex}>01</span>
                        <p className={styles.articleRuleTitle}>{isBannerImageContest ? "Public image URL required" : "X link required"}</p>
                        <p>
                          {isBannerImageContest
                            ? "Submit a direct public image URL for your banner design. Add a contact email first so we can send task and payout updates."
                            : requiresAttachedImage
                            ? `Submit a public X post or thread with at least one attached image. The author must match your bound X account${boundXAccount?.username ? ` (@${boundXAccount.username})` : ""}. The image must fit DexScreener header specs: 3:1 ratio, at least 600px wide, PNG/JPG/WEBP/GIF, and 4.5MB or smaller. Add a contact email first so we can send task and payout updates.`
                            : isTestArticleContest
                            ? "Test mode only requires a contact email. The X URL author will be used for this submission."
                            : `Your X URL author must match your bound X account${boundXAccount?.username ? ` (@${boundXAccount.username})` : ""}.`}
                          {!isBannerImageContest && !requiresAttachedImage && " Add a contact email first so we can send task and payout updates."}
                        </p>
                      </div>
                      <div className={styles.articleRuleCard}>
                        <span className={styles.articleRuleIndex}>02</span>
                        <p className={styles.articleRuleTitle}>One update only</p>
                        <p>
                          Submit carefully. Your {isBannerImageContest ? "image URL and design note" : requiresAttachedImage ? "X link and post text" : "X link and article text"} can only be updated once, then the submission is locked for fair review.
                        </p>
                      </div>
                      <div className={styles.articleRuleCard}>
                        <span className={styles.articleRuleIndex}>03</span>
                        <p className={styles.articleRuleTitle}>Paid after review</p>
                        <p>
                          Winners are selected after final results are locked and paid by AI2Human. There is no manual claim
                          button for this contest.
                        </p>
                      </div>
                      {tokenGateNotice && (
                        <div className={styles.articleRuleCard}>
                          <span className={styles.articleRuleIndex}>04</span>
                          <p className={styles.articleRuleTitle}>{tokenGateNotice.label} access</p>
                          <p>{tokenGateNotice.text} We check the connected wallet onchain before accepting the submission.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!articleWallet && (
                    <div className={styles.qnProfileNotice}>
                      Sign in before submitting.
                      <button type="button" onClick={() => login()}>Sign in</button>
                    </div>
                  )}

                  {articleWallet && (!hasContactEmail || (!hasBoundXAccount && !isTestArticleContest)) && (
                    <div className={styles.qnProfileNotice}>
                      {isBannerImageContest
                        ? "Add a contact email before submitting a banner."
                        : isTestArticleContest
                          ? "Add a contact email before submitting an article."
                          : "Add a contact email and bind your X account before submitting an article."}
                      <a href="/app/profile">→ Complete Profile</a>
                    </div>
                  )}

                  {articleSubmission && (
                    <div className={styles.notice}>
                      <strong>Status:</strong> {articleStatus}
                      {!articleDeadlineEnded && " · Scores and ranking are hidden until the contest ends."}
                      {articleDeadlineEnded && articleSubmission.aiScore != null ? ` · Score: ${articleSubmission.aiScore}/100` : ""}
                      {articleDeadlineEnded && articleSubmission.rank ? ` · Rank: #${articleSubmission.rank}` : ""}
                      {articleDeadlineEnded && articleSubmission.prizeAmount ? ` · Prize: ${articleSubmission.prizeAmount}` : ""}
                      {articleDeadlineEnded && articleSubmission.paymentExplorerUrl && (
                        <>
                          {" · "}
                          <a href={articleSubmission.paymentExplorerUrl} target="_blank" rel="noreferrer">
                            View payout
                          </a>
                        </>
                      )}
                      {articleDeadlineEnded && articleSubmission.aiReview && (
                        <p className={styles.fieldHelp}>{articleSubmission.aiReview}</p>
                      )}
                    </div>
                  )}

                  <div className={styles.form}>
                    <div className={styles.field}>
                      <label htmlFor="article-url">{isBannerImageContest ? "Banner image URL" : requiresAttachedImage ? "X post or thread link" : "X article or thread link"}</label>
                      <input
                        id="article-url"
                        className={styles.input}
                        value={articleUrl}
                        onChange={(event) => setArticleUrl(event.target.value)}
                        placeholder={isBannerImageContest ? "https://.../banner.png" : "https://x.com/yourhandle/status/..."}
                        disabled={articleSubmitting || articleFormLocked}
                      />
                      <p className={styles.fieldHelp}>
                        {isBannerImageContest
                          ? "Use a direct public image URL for your banner design. PNG, JPG, WEBP, GIF, or AVIF all work. This link can only be changed once after submission."
                          : requiresAttachedImage
                            ? "Use the public X URL for the post or the first post of a thread. The X post must include at least one attached image, plus @ai2humannetwork and #A2H. The image must fit DexScreener header specs: 3:1 ratio, at least 600px wide, PNG/JPG/WEBP/GIF, max 4.5MB. This link can only be changed once after submission."
                            : "Use the public X URL for the article, post, or first post of a thread. This link can only be changed once after submission."}
                      </p>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="article-content">{isBannerImageContest ? "Design note" : requiresAttachedImage ? "Post text" : "Article text"}</label>
                      <textarea
                        id="article-content"
                        className={styles.textarea}
                        value={articleContent}
                        onChange={(event) => setArticleContent(event.target.value)}
                        placeholder={isBannerImageContest ? "Explain the concept, style, layout choices, and why this banner fits AI2Human." : requiresAttachedImage ? "Paste the X post text here and include a short banner reason, for example: clean 3:1 layout, AI2Human colors, and readable logo for DexScreener." : "Paste the full article or full thread text here so it can be reviewed after the deadline."}
                        rows={10}
                        disabled={articleSubmitting || articleFormLocked}
                      />
                      <p className={styles.fieldHelp}>
                        {isBannerImageContest
                          ? "AI review uses your banner image first and this note as supporting context. This field can only be updated once."
                          : requiresAttachedImage
                            ? "AI review ranks mainly from the attached image, and uses your short banner reason as supporting context. Longer filler text does not help. We reject images that do not match DexScreener header specs. If X blocks crawling or only returns part of a thread, this text is used as fallback. Keep it brief, ideally one or two sentences. This field can only be updated once."
                            : "We read the X link first. If X blocks crawling or only returns part of a thread, this text is used for review. This field can only be updated once."}
                      </p>
                    </div>

                    <div className={styles.ctaRow}>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={submitArticle}
                        disabled={!canSubmitArticle || articleSubmitting || articleFormLocked}
                      >
                        {articleSubmitting && <span className={styles.buttonSpinner} aria-hidden="true" />}
                        <span>
                          {articleSubmitting
                            ? articleSubmitStatus || "Checking X link..."
                            : articleSubmission
                              ? "Update submission (1x max)"
                              : isBannerImageContest ? "Submit banner" : requiresAttachedImage ? "Submit post" : "Submit article"}
                        </span>
                      </button>
                      {articleSubmission?.articleUrl && (
                        <a
                          href={articleSubmission.articleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.buttonGhost}
                        >
                          {isBannerImageContest ? "Open image" : "Open X link"}
                        </a>
                      )}
                    </div>
                    {articleSubmitting && (
                      <p className={styles.submitProgressHint}>
                        {isBannerImageContest
                          ? "We are validating the image URL and preparing it for AI review. This can take 10-20 seconds if the image host is slow."
                          : requiresAttachedImage
                            ? "We are validating the X URL, checking that the post includes an attached image, and fetching public post/thread text. This can take 10-20 seconds when X is slow."
                            : "We are validating the X URL and fetching public post/thread text. This can take 10-20 seconds when X is slow."}
                      </p>
                    )}
                    {articleUpdateLocked && (
                      <div className={styles.articleLockedNotice}>
                        Submission locked. You already used your one allowed update, so the {isBannerImageContest ? "image URL and design note" : requiresAttachedImage ? "X link and post text" : "X link and article text"} can no longer be changed.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.qnSidebar}>
                <div className={styles.qnRewardCard}>
                  <div className={styles.qnRewardHeader}>
                    <h3 className={styles.qnRewardH3}>Reward</h3>
                    <span className={styles.qnRewardBadge}>{distMode}</span>
                  </div>
                  <div className={styles.qnRewardStats}>
                    <div className={styles.qnStatItem}>
                      <span className={styles.qnStatValue}>{dist?.totalPool || task.budget}</span>
                      <span className={styles.qnStatLabel}>Total Pool</span>
                    </div>
                    <div className={styles.qnStatDivider} />
                    <div className={styles.qnStatItem}>
                      <span className={styles.qnStatValue}>{maxWinners}</span>
                      <span className={styles.qnStatLabel}>Winners</span>
                    </div>
                  </div>
                  <div className={styles.qnCountdown}>
                    {articleDeadlineEnded ? (
                      <div className={styles.qnCountdownLabel}>Submission closed</div>
                    ) : countdownTarget ? (
                      <>
                        <div className={styles.qnCountdownLabel}>Submit before</div>
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
                        </div>
                      </>
                    ) : (
                      <div className={styles.qnCountdownLabel}>No deadline</div>
                    )}
                  </div>
                  <div className={styles.qnRewardInfo}>
                    <div className={styles.qnChainRow}>
                      <div className={styles.qnChainIcon}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      </div>
                      <span className={styles.qnChainName}>Base · USDC after review</span>
                    </div>
                  </div>
                    <div className={styles.notice}>
                    Submit first. Your score is created when you submit or update. After the deadline, admin locks the final ranking from the current scores, then pays winners on-chain.
                    </div>
                </div>
              </div>
            </div>
          </div>

          {articleErrorModal && (
            <div className={styles.articleErrorOverlay} role="dialog" aria-modal="true" aria-labelledby="article-error-title">
              <div className={styles.articleErrorModal}>
                <div className={styles.articleErrorIcon}>!</div>
                <h2 id="article-error-title" className={styles.articleErrorTitle}>Submission blocked</h2>
                <p className={styles.articleErrorMessage}>{articleErrorModal}</p>
                <p className={styles.articleErrorHelp}>
                  We check the submitted X URL before saving. If X/FxTwitter/oEmbed/HTML checks return not found, the
                  submission is rejected so fake links cannot enter the contest.
                </p>
                <div className={styles.articleErrorActions}>
                  <button type="button" className={styles.articleErrorPrimary} onClick={() => setArticleErrorModal("")}>
                    Edit X link
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      );
    }

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
                      {task.campaign?.requesterHandle || "@ai2humannetwork"}
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
                <TaskRoomStatus task={task} />

                {isGloballyEnded && (
                  <div className={styles.qnEndedBanner}>
                    <div>
                      <span className={styles.qnEndedEyebrow}>Activity ended</span>
                      <strong>{endedReason}</strong>
                    </div>
                    <span>{paidSlots}/{maxWinners} paid</span>
                  </div>
                )}

                {/* Task List */}
                <div className={styles.qnTaskList}>
                  {questTaskItems.map((item) => {
                    const state = taskStates[item.key] || { actionClicked: false, acting: false, verifying: false, verified: false };
                    const taskHint = state.error
                      ? state.error
                      : state.acting
                      ? "Opening the task and saving your step..."
                      : !state.actionClicked && !state.verified
                      ? `Click ${item.actionLabel} first. Verify turns on after AI2Human records the step.`
                      : state.verifying
                      ? "Checking this step..."
                      : "";
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
                              {isGloballyEnded ? (
                                <div className={`${styles.qnTaskDoneInline} ${styles.qnTaskEndedInline}`}>
                                  {checkSvg}
                                  <span>{endedReason} New verification is disabled.</span>
                                </div>
                              ) : !connectedWallet ? (
                                <div className={styles.qnTaskButtons}>
                                  <div className={`${styles.btn3d} ${styles.btn3dCyan}`}>
                                    <div className={styles.btn3dInner}>
                                      <button
                                        type="button"
                                        className={styles.btn3dFace}
                                        onClick={() => login()}
                                      >
                                        Sign in
                                      </button>
                                      <span className={styles.btn3dShadow} />
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
                                        disabled={Boolean(state.acting)}
                                        onClick={() => {
                                          handleTaskAction(item.key, item.intentUrl);
                                        }}
                                      >
                                        {state.acting ? <span className={styles.qnMiniSpinner} aria-hidden="true" /> : item.icon}
                                        {state.acting ? "Opening..." : item.actionLabel}
                                      </button>
                                      <span className={styles.btn3dShadow} />
                                    </div>
                                  </div>
                                  {/* Verify button - 3D Green (disabled until action clicked) */}
                                  <div className={`${styles.btn3d} ${styles.btn3dGreen} ${!state.actionClicked || state.acting ? styles.btn3dDisabled : ""}`}>
                                    <div className={styles.btn3dInner}>
                                      <button
                                        type="button"
                                        className={styles.btn3dFace}
                                        disabled={!state.actionClicked || state.acting || state.verifying}
                                        onClick={() => handleTaskVerify(item.key)}
                                      >
                                        {state.verifying ? "Verifying..." : "Verify"}
                                      </button>
                                      <span className={styles.btn3dShadow} />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {taskHint && !state.verified ? (
                                <p className={state.error ? `${styles.qnTaskHint} ${styles.qnTaskHintError}` : styles.qnTaskHint}>
                                  {taskHint}
                                </p>
                              ) : null}
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

              {connectedWallet && auth && (!hasContactEmail || !hasBoundXAccount) && !isDone && (
                <div className={styles.qnProfileNotice}>
                  Add a contact email and bind your X account before doing tasks.
                  <a href="/app/profile">→ Complete Profile</a>
                </div>
              )}

              {tokenGateNotice && !isDone && (
                <div className={styles.qnProfileNotice}>
                  {tokenGateNotice.text} Eligibility is checked onchain from your connected wallet.
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
                  <a href="https://x.com/ai2humannetwork" target="_blank" rel="noreferrer" className={styles.qnFooterSocialIcon}>
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
                  <div className={styles.qnStatDivider} />
                  <div className={styles.qnStatItem}>
                    <span className={styles.qnStatValue}>{paidSlots}/{maxWinners}</span>
                    <span className={styles.qnStatLabel}>Paid</span>
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

                <div className={styles.qnRewardProgress} aria-label={`${paidSlots} of ${maxWinners} reward slots paid`}>
                  <div className={styles.qnRewardProgressTrack}>
                    <span style={{ width: `${paidProgressPct}%` }} />
                  </div>
                  <p>{isGloballyEnded ? endedReason : `${paidSlots} of ${maxWinners} reward slots paid so far.`}</p>
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
                        Sign in
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
                ) : isTestRewardTask(task) ? (
                  <div className={`${styles.qnClaimWrap} ${styles.btn3d} ${styles.btn3dDisabled}`}>
                    <div className={styles.btn3dInner}>
                      <button type="button" className={styles.btn3dFace} disabled>
                        Test payout disabled
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
                        disabled={claimingReward || !hasContactEmail || !hasBoundXAccount}
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
                  <p className={styles.qnClaimTips}>Sign in to start earning</p>
                )}
                {connectedWallet && (!hasContactEmail || !hasBoundXAccount) && !claimResult && (
                  <p className={styles.qnClaimTips}>Add contact email and bind X from Profile before doing tasks</p>
                )}
                {connectedWallet && hasContactEmail && hasBoundXAccount && !allTasksVerified && !claimResult && (
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
                    <button type="button" className={styles.btn3dFace} onClick={() => {
                      loadTask();
                      loadQuesters();
                    }}>
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
