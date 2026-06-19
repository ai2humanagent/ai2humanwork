import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bundledDbSnapshot from "../../data/db.seed.json";
import {
  seedHumans,
  seedServices,
  type Human,
  type HumanService
} from "./humanMarketplace";
import { seedAgents, type AIAgent } from "./agentRegistry";
import type { SettlementMethod, SettlementNetwork } from "./settlementTypes";
import {
  DEFAULT_X_TASK_BUDGET,
  DEFAULT_TARGET_URL,
  DEFAULT_REPLY_TARGET_URL,
  buildOfficialCampaignTask,
  buildRealWorldTask,
  DEFAULT_REAL_WORLD_TASK_BUDGET,
  getOfficialCampaignTemplates,
  getRealWorldTaskTemplates
} from "./officialCampaignTasks.js";
import { formatSettlementBudget } from "./assetLabels.js";
import { supabase, isSupabaseEnabled } from "./supabase";
import { parseArticleReviewAnchor, type ReviewAnchorRecord } from "./reviewAnchor";
import { applyDeadlineAwareTaskState } from "./taskLifecycle.js";

export type TaskType =
  | "twitter_follow"
  | "twitter_like"
  | "twitter_retweet"
  | "twitter_comment"
  | "x_article"
  | "physical";

export type TaskStatus =
  | "created"
  | "ai_running"
  | "ai_failed"
  | "ai_done"
  | "human_assigned"
  | "human_done"
  | "verified"
  | "paid";

/**
 * Task-level state — tracks the overall lifecycle of a task's reward pool.
 *
 * open     — Task is active, escrow has balance, accepting claims
 * full     — All winner slots have been paid (paidCount >= maxWinners)
 * closed   — Task is closed (deadline passed or fully paid)
 * refunded — Remaining escrow balance has been refunded to agent
 *
 * NOTE: paid/verified/etc. are per-human statuses (a specific user's progress).
 *       taskState is the task-level state (the reward pool's overall status).
 */
export type TaskState = "open" | "full" | "closed" | "refunded";

export type EvidenceItem = {
  id: string;
  by: "ai" | "human" | "system";
  type: "log" | "note" | "photo";
  content: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  acceptance: string;
  taskType?: TaskType; // 'twitter_follow' | 'twitter_like' | 'twitter_retweet' | 'twitter_comment' | 'physical'
  campaign?: {
    requesterName: string;
    requesterHandle?: string;
    platform: "x" | "real_world";
    action: string;
    isTest?: boolean;
    environment?: "test" | "production";
    payoutDisabled?: boolean;
    fundingMode?: "test_no_payout" | "unfunded_campaign" | "escrow_deposit" | "prize_pool_contract" | "ai2human_managed_pool";
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
    };
    eligibility?: {
      tokenGate?: {
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
        priceTokenAddress?: string;
        priceChainId?: string | number;
        minBalance?: string;
        minimum?: string;
        holderLabel?: string;
        failureMessage?: string;
        requiredAt?: Array<"article_submit" | "quest_action" | "reward_claim" | "task_claim" | string>;
        rpcUrl?: string;
        explorerUrl?: string;
      };
    };
    tokenGate?: {
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
      priceTokenAddress?: string;
      priceChainId?: string | number;
      minBalance?: string;
      minimum?: string;
      holderLabel?: string;
      failureMessage?: string;
      requiredAt?: Array<"article_submit" | "quest_action" | "reward_claim" | "task_claim" | string>;
      rpcUrl?: string;
      explorerUrl?: string;
    };
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
    verificationChecks: string[];
    submissionFields?: string[];
    reviewTarget?: {
      projectName?: string;
      projectAliases?: string[];
      projectHandles?: string[];
      projectUrls?: string[];
      tokenSymbols?: string[];
      contractAddresses?: string[];
      requiredTopics?: string[];
      thesis?: string;
    };
  };
  agentId?: string;
  rewardDistribution?: RewardDistribution;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
  evidence: EvidenceItem[];
  verifyCooldownHours?: number; // Twitter task cooldown
  escrowDepositId?: string;
  /** Task-level state tracking the reward pool lifecycle (open/full/closed/refunded) */
  taskState?: TaskState;
  /** Deployed PrizePool contract address for on-chain reward campaigns. */
  poolAddress?: string;
  /** Lucky draw result — set after draw is executed (when first winner claims) */
  drawResult?: LuckyDrawResult;
  /** Final review anchor on Base, derived from evidence logs. */
  reviewAnchor?: ReviewAnchorRecord;
};

export type EscrowDepositStatus = "pending" | "active" | "partial_refund" | "refunded" | "failed";

export type EscrowDeposit = {
  id: string;
  taskId: string;
  agentId: string;
  agentWallet: string;
  totalPool: string;        // Total USDC deposited for this task
  amountPaidOut: string;    // Amount already paid to claimers
  amountRefunded: string;   // Amount refunded to agent
  paidCount: number;        // Number of winners who have been paid
  status: EscrowDepositStatus;
  depositTxHash?: string;
  depositExplorerUrl?: string;
  refundTxHash?: string;
  refundExplorerUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type WaitlistEntry = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
};

export type PaymentEntry = {
  id: string;
  taskId?: string;
  fallbackOrderId?: string;
  idempotencyKey?: string;
  amount: string;
  receiver: string;
  receiverAddress?: string;
  payerAddress?: string;
  method: SettlementMethod;
  status: "paid";
  source?: "task" | "fallback_order" | "x402_access" | "twitter_task" | "article_contest";
  network?: SettlementNetwork;
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
};

export type FallbackOrderStatus =
  | "created"
  | "accepted"
  | "in_progress"
  | "delivered"
  | "callback_sent"
  | "callback_failed"
  | "verified"
  | "paid";

export type FallbackSubscription = {
  id: string;
  email: string;
  skills: string[];
  cities: string[];
  active: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
};

export type FallbackOrder = {
  id: string;
  serviceId: string;
  providerId: string;
  agentName: string;
  location: string;
  deadline: string;
  budget: string;
  callbackUrl?: string;
  proofRequirements: string[];
  status: FallbackOrderStatus;
  humanId?: string;
  humanName?: string;
  createdAt: string;
  updatedAt: string;
  evidence: EvidenceItem[];
  callback?: {
    attemptedAt?: string;
    status?: "sent" | "failed";
    code?: number;
    message?: string;
  };
};

export type UserAccount = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  humanId?: string;
  authProvider?: "local" | "privy";
  privyUserId?: string;
  walletAddress?: string;
  contactEmail?: string;
  notificationPreferences?: {
    emailTaskAlerts?: boolean;
    emailRewardAlerts?: boolean;
  };
  xAccount?: {
    subject: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
    linkedAt?: string;
  };
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export type QuestProgressStatus = "pending" | "action_done" | "verified";

export type QuestProgress = {
  id: string;
  walletAddress: string;
  taskId: string;
  subtaskKey: string;
  status: QuestProgressStatus;
  verifiedAt?: string;
  createdAt: string;
};

export type LuckyDrawParticipant = {
  id: string;
  taskId: string;
  walletAddress: string;
  xHandle: string;
  createdAt: string;
};

export type NotificationType = "task_assigned" | "task_reminder" | "task_completed" | "system";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
};

export type LuckyDrawWinner = {
  address: string;
  amount: string; // e.g. "0.5 USDC"
};

export type LuckyDrawResult = {
  winners: LuckyDrawWinner[];
  drawnAt: string;
};

export type RewardPrize = {
  rank: number;
  amount: string;
  slots?: number;
  label?: string;
};

export type RewardDistributionMode = "fcfs" | "lucky_draw" | "equal" | "ranked_article_contest";

export type RewardDistribution = {
  mode: RewardDistributionMode;
  totalPool: string;
  perWinner?: string;
  maxWinners: number;
  drawTime?: string;
  reviewAfter?: string;
  minimumWinnerScore?: number;
  prizes?: RewardPrize[];
};

export type ArticleSubmissionStatus =
  | "submitted"
  | "invalid"
  | "reviewed"
  | "winner"
  | "paid"
  | "rejected";

export type ArticleReviewAudit = {
  contentSource?: "x_live" | "snapshot_fallback";
  fetchSource?: "fxtwitter_thread" | "fxtwitter_status" | "x_api_thread" | "x_api" | "syndication" | "oembed" | "html" | "snapshot_fallback";
  fetchAttempts?: string[];
  xFetchError?: string;
  relevanceGate?: boolean;
  relevanceSignals?: string[];
  reviewTargetProject?: string;
  prizeIneligible?: boolean;
  prizeIneligibleReason?: string;
  copyRisk?: "possible" | "high";
  copyRiskReason?: string;
  copyMatchedSubmissionId?: string;
  copySimilarity?: number;
  reviewedTextExcerpt?: string;
  reviewedTextLength?: number;
  model?: string;
  provider?: "ai" | "ai_error" | "multi_model";
  latencyMs?: number;
  minimumWinnerScore?: number;
  aggregateStrategy?: "weighted_consensus";
  activeModelCount?: number;
  skippedModelCount?: number;
  contentScore?: number;
  engagementWeight?: number;
  engagementScore?: number;
  finalScore?: number;
  finalScoreFormula?: string;
  engagementMetrics?: {
    source?: "fxtwitter_status" | "x_api" | "unavailable";
    attempts?: string[];
    likes?: number;
    reposts?: number;
    replies?: number;
    quotes?: number;
    bookmarks?: number;
    views?: number;
    rawScore?: number;
    normalizedScore?: number;
    error?: string;
  };
  modelReviews?: Array<{
    providerId: string;
    providerLabel: string;
    model?: string;
    weight: number;
    status: "scored" | "failed" | "skipped";
    score?: number;
    review?: string;
    rubric?: {
      relevance?: number;
      originality?: number;
      clarity?: number;
      evidence?: number;
      narrative?: number;
    };
    latencyMs?: number;
    error?: string;
  }>;
};

export type ArticleReviewRubric = {
  relevance?: number;
  originality?: number;
  clarity?: number;
  evidence?: number;
  narrative?: number;
  audit?: ArticleReviewAudit;
};

export type ArticleSubmission = {
  id: string;
  taskId: string;
  walletAddress: string;
  userId?: string;
  xHandle: string;
  articleUrl: string;
  articleId?: string;
  authorHandle: string;
  title: string;
  contentSnapshot: string;
  status: ArticleSubmissionStatus;
  aiScore?: number;
  aiReview?: string;
  aiRubric?: ArticleReviewRubric;
  rank?: number;
  prizeAmount?: string;
  paymentTxHash?: string;
  paymentExplorerUrl?: string;
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
};

export type Db = {
  tasks: Task[];
  waitlist: WaitlistEntry[];
  payments: PaymentEntry[];
  humans: Human[];
  services: HumanService[];
  agents: AIAgent[];
  fallbackOrders: FallbackOrder[];
  fallbackSubscriptions: FallbackSubscription[];
  users: UserAccount[];
  sessions: AuthSession[];
  questProgress: QuestProgress[];
  notifications: Notification[];
  escrowDeposits: EscrowDeposit[];
  luckyDrawParticipants: LuckyDrawParticipant[];
  articleSubmissions: ArticleSubmission[];
};

type ProfileWriteSet<T> = {
  result: T;
  user?: UserAccount | null;
  human?: Human | null;
  task?: Task | null;
  notifications?: Notification[];
};

export function makeSeedTasks(count: number): Task[] {
  const xTemplates = getOfficialCampaignTemplates().map((template) => ({
    kind: "x" as const,
    template
  }));
  const realWorldTemplates = getRealWorldTaskTemplates().map((template) => ({
    kind: "real_world" as const,
    template
  }));
  const templates = [...realWorldTemplates, ...xTemplates];
  const realWorldBudgets = [
    formatSettlementBudget("18"),
    formatSettlementBudget("24"),
    formatSettlementBudget("35"),
    formatSettlementBudget("48"),
    formatSettlementBudget("60"),
    formatSettlementBudget("80"),
    formatSettlementBudget("95")
  ];
  const deadlines = ["2h", "4h", "6h", "12h", "24h", "48h", "72h"];
  const humanWallets = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444"
  ];
  const targetUrls = [DEFAULT_TARGET_URL, DEFAULT_REPLY_TARGET_URL];
  const proofAssets = [
    "/freelance-hero.jpg",
    "/freelance-desk.jpg",
    "/freelance-team.jpg",
    "/brand/ai2human-promo-1.png",
    "/brand/ai2human-promo-2.png",
    "/brand/ai2human-promo-3.png"
  ];
  const locationNotes = [
    "Blue Bottle Coffee, Market Street storefront",
    "Midtown 7-Eleven beverage shelf",
    "WeWork front desk handoff counter",
    "Lobby package locker C12",
    "Lunch counter menu board",
    "South Hall main entrance queue"
  ];
  const requesterNames = [
    "Retail Ops Desk",
    "Local Verification Desk",
    "Field Logistics Agent",
    "Partner Success Ops",
    "Store Audit Desk",
    "Event Access Agent"
  ];

  const statuses: TaskStatus[] = [
    "created",
    "created",
    "created",
    "ai_running",
    "ai_failed",
    "ai_done",
    "human_assigned",
    "human_done",
    "verified",
    "paid"
  ];

  const now = Date.now();
  const tasks: Task[] = [];

  for (let i = 0; i < count; i += 1) {
    const status = statuses[i % statuses.length];
    const createdAt = new Date(now - i * 1000 * 60 * 17).toISOString();
    const updatedAt = new Date(now - i * 1000 * 60 * 5).toISOString();
    const id = crypto.randomUUID();
    const scenario = templates[i % templates.length];
    const template = scenario.template;
    const campaignTask =
      scenario.kind === "x"
        ? buildOfficialCampaignTask({
            templateId: template.id,
            requesterName: "AI2Human Official",
            requesterHandle: "@ai2humanwork",
            targetUrl: targetUrls[i % targetUrls.length],
            budget: DEFAULT_X_TASK_BUDGET,
            deadline: deadlines[i % deadlines.length],
            brief:
              template.action === "repost"
                ? "Make the repost visible on your timeline so the reviewer can verify it quickly."
                : "Use your own X account, keep the post live, and include the requested campaign CTA."
          })
        : buildRealWorldTask({
            templateId: template.id,
            requesterName: requesterNames[i % requesterNames.length],
            budget:
              realWorldBudgets[i % realWorldBudgets.length] || DEFAULT_REAL_WORLD_TASK_BUDGET,
            deadline: deadlines[i % deadlines.length],
            brief: template.defaultBrief
          });
    const proofPhrase = campaignTask.campaign?.proofPhrase;
    const executorHandle = `@operator${(i % 8) + 1}`;
    const postUrl = `https://x.com/${executorHandle.slice(1)}/status/${1902000000000000000 + i}`;
    const profileUrl = `https://x.com/${executorHandle.slice(1)}`;
    const locationNote = locationNotes[i % locationNotes.length];
    const timestampNote = `Checked at ${new Date(now - i * 1000 * 60 * 3).toLocaleString("en-US", {
      hour12: false
    })}`;
    const proofAsset = proofAssets[i % proofAssets.length];

    const evidence: EvidenceItem[] = [];
    const addEvidence = (by: EvidenceItem["by"], type: EvidenceItem["type"], content: string) => {
      evidence.push({
        id: crypto.randomUUID(),
        by,
        type,
        content,
        createdAt: updatedAt
      });
    };

    if (status === "ai_running") {
      addEvidence(
        "ai",
        "log",
        scenario.kind === "x"
          ? "AI running: querying Wallet API, Market API, and Trade API to decide whether this X task can stay autonomous"
          : "AI running: querying Wallet API, Market API, and Trade API to decide whether this task can stay autonomous"
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: onchainos_precheck | Checking wallet, market, and trade routes before escalation."
      );
    }
    if (status === "ai_failed") {
      addEvidence(
        "ai",
        "log",
        scenario.kind === "x"
          ? "AI failed: Wallet, Market, and Trade prechecks cleared settlement, but a human-owned X identity and live post are still required"
          : "AI failed: Wallet, Market, and Trade prechecks cleared settlement, but an on-site human is still required for proof collection"
      );
      addEvidence(
        "ai",
        "note",
        scenario.kind === "x"
          ? "agent_event: onchainos_precheck | Queried wallet, market, and trade routes, but a human-owned X identity and live post are still required."
          : "agent_event: onchainos_precheck | Queried wallet, market, and trade routes, but the task still requires an on-site check, signature, pickup, or physical proof collection."
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: planner_agent | Escalated to the dispatcher after Wallet API, Market API, and Trade API checks still hit a real-world or compliance blocker."
      );
    }
    if (status === "ai_done") {
      addEvidence(
        "ai",
        "note",
        scenario.kind === "x"
          ? `AI note: campaign brief prepared for ${campaignTask.campaign?.requesterHandle || "@official"} after autonomous planner prechecks cleared.`
          : `AI note: visit brief prepared for ${campaignTask.campaign?.requesterName || "ops desk"} after autonomous planner prechecks cleared.`
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: onchainos_precheck | Queried wallet, market, and trade routes and cleared the task for autonomous execution."
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: planner_agent | Kept the task on the autonomous onchain path after Wallet API, Market API, and Trade API checks cleared."
      );
    }
    if (status === "human_assigned") {
      addEvidence(
        "system",
        "log",
        `Human assigned: ${scenario.kind === "x" ? executorHandle : `field-operator-${(i % 6) + 1}`}`
      );
      addEvidence(
        "system",
        "note",
        `agent_event: dispatcher_agent | Routed the task to ${
          scenario.kind === "x" ? executorHandle : `field-operator-${(i % 6) + 1}`
        } with a payout-ready wallet.`
      );
    }
    if (status === "human_done" || status === "verified" || status === "paid") {
      if (scenario.kind === "x") {
        addEvidence("human", "note", `executor_handle: ${executorHandle}`);
        if (campaignTask.campaign?.action === "repost") {
          addEvidence("human", "note", `profile_url: ${profileUrl}`);
        } else {
          addEvidence("human", "note", `post_url: ${postUrl}`);
        }
        addEvidence("human", "photo", `/brand/ai2human-social-${(i % 3) + 1}.png`);
        if (proofPhrase) {
          addEvidence("human", "note", `proof_phrase: ${proofPhrase}`);
        }
        addEvidence(
          "human",
          "note",
          `summary: Completed ${campaignTask.campaign?.action || "campaign"} task for ${campaignTask.campaign?.requesterHandle || "@official"} and kept the result live for review.`
        );
      } else {
        addEvidence("human", "photo", proofAsset);
        addEvidence("human", "note", `location_note: ${locationNote}`);
        addEvidence("human", "note", `timestamp_note: ${timestampNote}`);
        if (proofPhrase) {
          addEvidence("human", "note", `proof_phrase: ${proofPhrase}`);
        }
        addEvidence(
          "human",
          "note",
          `summary: Completed the ${campaignTask.campaign?.label || "field"} task on-site and returned the requested proof package for reviewer approval.`
        );
      }
    }
    if (status === "verified") addEvidence("system", "log", "Verification checklist passed");
    if (status === "paid") {
      addEvidence("system", "log", "Verification checklist passed");
      addEvidence("system", "log", "Payment settled in demo mode");
    }

    const assignee =
      status === "human_assigned" || status === "human_done"
        ? {
            type: "human" as const,
            name: scenario.kind === "x" ? "Growth Operator" : "Field Operator",
            walletAddress: humanWallets[i % humanWallets.length]
          }
        : status === "ai_running" || status === "ai_done" || status === "ai_failed"
          ? { type: "ai" as const, name: "Demo Agent" }
          : undefined;

    tasks.push({
      id,
      title: campaignTask.title,
      budget: campaignTask.budget,
      deadline: campaignTask.deadline,
      acceptance: campaignTask.acceptance,
      campaign: campaignTask.campaign as Task["campaign"],
      status,
      createdAt,
      updatedAt,
      assignee,
      evidence
    });
  }

  return tasks;
}

export function makeSeedFallbackOrders(count: number): FallbackOrder[] {
  const now = Date.now();
  const statuses: FallbackOrderStatus[] = [
    "created",
    "accepted",
    "delivered",
    "callback_sent",
    "callback_failed",
    "verified",
    "paid"
  ];
  const budgets = ["55", "75", "120", "150", "220"].map((value) => formatSettlementBudget(value));
  const deadlines = ["1h", "2h", "4h", "6h", "12h"];
  const locations = ["Shanghai", "Austin", "Berlin", "Singapore", "Tokyo"];

  const serviceByIndex = seedServices.slice(0, Math.max(1, Math.min(seedServices.length, count)));
  const humansById = new Map(seedHumans.map((human) => [human.id, human] as const));
  const orders: FallbackOrder[] = [];

  for (let i = 0; i < count; i += 1) {
    const service = serviceByIndex[i % serviceByIndex.length];
    const provider = humansById.get(service.providerId);
    if (!provider) continue;

    const status = statuses[i % statuses.length];
    const createdAt = new Date(now - i * 1000 * 60 * 13).toISOString();
    const updatedAt = new Date(now - i * 1000 * 60 * 4).toISOString();
    const order: FallbackOrder = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      providerId: provider.id,
      agentName: `Agent-${(i % 5) + 1}`,
      location: locations[i % locations.length],
      deadline: deadlines[i % deadlines.length],
      budget: budgets[i % budgets.length],
      proofRequirements: ["photo", "timestamp"],
      status,
      humanId: status === "created" ? undefined : provider.id,
      humanName: status === "created" ? undefined : provider.name,
      createdAt,
      updatedAt,
      evidence: []
    };

    if (status !== "created") {
      order.evidence.push({
        id: crypto.randomUUID(),
        by: "human",
        type: "log",
        content: `Order accepted by ${provider.name}`,
        createdAt: updatedAt
      });
    }
    if (status === "delivered" || status === "callback_sent" || status === "callback_failed") {
      order.evidence.push({
        id: crypto.randomUUID(),
        by: "human",
        type: "photo",
        content: "https://example.com/campaign-proof.jpg",
        createdAt: updatedAt
      });
    }
    if (
      status === "callback_sent" ||
      status === "callback_failed" ||
      status === "verified" ||
      status === "paid"
    ) {
      order.callback = {
        attemptedAt: updatedAt,
        status: status === "callback_failed" ? "failed" : "sent",
        code: status === "callback_failed" ? 500 : 200,
        message: status === "callback_failed" ? "Callback failed." : "Callback sent."
      };
    }

    orders.push(order);
  }

  return orders;
}

// ============================================================
// Supabase-backed storage (production: Vercel deployment)
// ============================================================
// When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, all
// reads and writes go through Supabase. Otherwise falls back
// to the local JSON file for local development.
// ============================================================

function getDbPath(): string {
  if (process.env.TRUSTNET_DB_PATH) {
    return process.env.TRUSTNET_DB_PATH;
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "trustnet-db.json");
  }
  return path.join(process.cwd(), "data", "db.json");
}

const DB_PATH = getDbPath();

function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function makeInitialDb(): Db {
  return {
    tasks: makeSeedTasks(60),
    waitlist: [],
    payments: [],
    humans: seedHumans,
    services: seedServices,
    agents: seedAgents.map((a) => ({ ...a })),
    fallbackOrders: makeSeedFallbackOrders(12),
    fallbackSubscriptions: [],
    users: [],
    sessions: [],
    questProgress: [],
    notifications: [],
    escrowDeposits: [],
    luckyDrawParticipants: [],
    articleSubmissions: []
  };
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  if (!primary.length) return [...fallback];
  if (!fallback.length) return [...primary];
  const merged = [...primary];
  const seen = new Set(primary.map((item) => item.id));
  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function getBundledDb(): Db {
  return JSON.parse(JSON.stringify(bundledDbSnapshot)) as Db;
}

async function readFileSnapshot(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as Db;
  } catch {
    return getBundledDb();
  }
}

async function ensureDb(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const initial = getBundledDb();
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

// ---- JSON file fallback (local dev) ----
async function readDbFromFile(): Promise<Db> {
  await ensureDb();
  const parsed = await readFileSnapshot();
  const bundled = getBundledDb();
  const tasks = mergeById(
    Array.isArray(parsed.tasks) ? parsed.tasks : [],
    Array.isArray(bundled?.tasks) ? bundled.tasks : []
  );
  const humans = Array.isArray(parsed.humans) && parsed.humans.length > 0
    ? parsed.humans
    : seedHumans.map((human) => ({ ...human }));
  const services = Array.isArray(parsed.services) && parsed.services.length > 0
    ? parsed.services
    : seedServices.map((service) => ({ ...service }));
  const fallbackOrders = mergeById(
    Array.isArray(parsed.fallbackOrders) ? parsed.fallbackOrders : [],
    Array.isArray(bundled?.fallbackOrders) ? bundled.fallbackOrders : []
  );
  const payments = mergeById(
    Array.isArray(parsed.payments) ? parsed.payments : [],
    Array.isArray(bundled?.payments) ? bundled.payments : []
  );
  return {
    tasks: (tasks.length > 0 ? tasks : makeSeedTasks(60)).map(attachDerivedTaskFields),
    waitlist: parsed.waitlist ?? [],
    payments,
    humans,
    services,
    agents: Array.isArray(parsed.agents) && parsed.agents.length > 0
      ? parsed.agents
      : seedAgents.map((a) => ({ ...a })),
    fallbackOrders: fallbackOrders.length > 0 ? fallbackOrders : makeSeedFallbackOrders(12),
    fallbackSubscriptions: parsed.fallbackSubscriptions ?? [],
    users: parsed.users ?? [],
    sessions: parsed.sessions ?? [],
    questProgress: Array.isArray(parsed.questProgress) ? parsed.questProgress : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    escrowDeposits: Array.isArray(parsed.escrowDeposits) ? parsed.escrowDeposits : [],
    luckyDrawParticipants: Array.isArray(parsed.luckyDrawParticipants) ? parsed.luckyDrawParticipants : [],
    articleSubmissions: Array.isArray(parsed.articleSubmissions) ? parsed.articleSubmissions : []
  };
}

async function writeDbToFile(db: Db): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ---- Supabase-backed storage ----
// Maps snake_case DB columns to camelCase TypeScript fields

type StoredXAccount = (Partial<UserAccount["xAccount"]> & {
  __contactEmail?: string;
  __notificationPreferences?: UserAccount["notificationPreferences"];
}) | null;

interface SbUser {
  id: string;
  email: string | null;
  password_hash?: string | null;
  created_at: string;
  human_id: string | null;
  wallet_address: string | null;
  contact_email?: string | null;
  notification_preferences?: UserAccount["notificationPreferences"] | null;
  auth_provider: string | null;
  privy_user_id?: string | null;
  x_account?: StoredXAccount;
}
interface SbHuman { id: string; name: string; handle: string; role: string; location: string; city: string; country: string; verified: boolean; rating: number; completed_jobs: number; hourly_rate: number; skills: string[]; languages: string[]; avatar_seed: number; avatar_url?: string | null; created_at: string; }
interface SbTask { id: string; title: string; budget: string; deadline: string | null; acceptance: string; task_type: string | null; status: string; task_state: string; evidence: unknown[]; agent_id: string | null; reward_distribution: unknown; escrow_deposit_id: string | null; assignee: unknown; draw_result: unknown; campaign: unknown; pool_address?: string | null; verify_cooldown_hours: number; created_at: string; updated_at: string; }
interface SbQuestProgress { id: string; wallet_address: string; task_id: string; subtask_key: string; status: string; verified_at: string | null; created_at: string; }
interface SbPayment { id: string; task_id: string | null; fallback_order_id?: string | null; idempotency_key?: string | null; amount: string; receiver: string; receiver_address: string; payer_address: string; method: string; status: string; source: string | null; network: string | null; chain_id: number | null; token_symbol: string | null; token_address: string | null; tx_hash: string | null; explorer_url: string | null; created_at: string; }
interface SbNotification { id: string; user_id: string; type: string; title: string; body: string; task_id: string | null; read: boolean; created_at: string; }
interface SbLuckyDrawParticipant { id: string; task_id: string; wallet_address: string; x_handle: string | null; created_at: string; }
interface SbArticleSubmission {
  id: string;
  task_id: string;
  wallet_address: string;
  user_id: string | null;
  x_handle: string;
  article_url: string;
  article_id: string | null;
  author_handle: string;
  title: string;
  content_snapshot: string;
  status: string;
  ai_score: number | null;
  ai_review: string | null;
  ai_rubric: ArticleReviewRubric | null;
  rank: number | null;
  prize_amount: string | null;
  payment_tx_hash: string | null;
  payment_explorer_url: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  updated_at: string;
}
interface SbEscrowDeposit { id: string; task_id: string | null; agent_id: string | null; agent_wallet: string | null; total_pool: string | null; amount_paid_out: string; amount_refunded: string; paid_count: number; status: string; deposit_tx_hash: string | null; deposit_explorer_url: string | null; refund_tx_hash: string | null; refund_explorer_url: string | null; error_message: string | null; created_at: string; updated_at: string; }
interface SbSession { id: string; user_id: string; token: string; created_at: string; expires_at: string; }
interface SbService { id: string; provider_id: string | null; title: string; short_description: string; description: string; category: string; price: number; pricing: string; duration_minutes: number; verified: boolean; rating_count: number; created_at: string; }

const TASK_SELECT_COLUMNS = [
  "id",
  "title",
  "budget",
  "deadline",
  "acceptance",
  "task_type",
  "status",
  "task_state",
  "evidence",
  "agent_id",
  "reward_distribution",
  "escrow_deposit_id",
  "assignee",
  "draw_result",
  "campaign",
  "verify_cooldown_hours",
  "created_at",
  "updated_at"
].join(",");

function readStoredXAccount(value: StoredXAccount | undefined): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function isRealEmail(value: string | null | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.endsWith("@privy.local"));
}

function readContactEmailFromSbUser(s: SbUser): string | undefined {
  const xAccount = readStoredXAccount(s.x_account);
  const embedded = xAccount.__contactEmail;
  if (isRealEmail(s.contact_email)) return s.contact_email;
  if (typeof embedded === "string" && isRealEmail(embedded)) return embedded;
  if (isRealEmail(s.email)) return s.email;
  return undefined;
}

function readNotificationPreferencesFromSbUser(s: SbUser): UserAccount["notificationPreferences"] | undefined {
  const xAccount = readStoredXAccount(s.x_account);
  const embedded = xAccount.__notificationPreferences;
  if (s.notification_preferences) return s.notification_preferences;
  if (embedded && typeof embedded === "object") {
    return {
      emailTaskAlerts: (embedded as UserAccount["notificationPreferences"])?.emailTaskAlerts !== false,
      emailRewardAlerts: (embedded as UserAccount["notificationPreferences"])?.emailRewardAlerts !== false
    };
  }
  return undefined;
}

function readPublicXAccountFromSbUser(s: SbUser): UserAccount["xAccount"] | undefined {
  const xAccount = readStoredXAccount(s.x_account);
  if (typeof xAccount.subject !== "string" || typeof xAccount.username !== "string") {
    return undefined;
  }
  return {
    subject: xAccount.subject,
    username: xAccount.username,
    ...(typeof xAccount.name === "string" ? { name: xAccount.name } : {}),
    ...(typeof xAccount.profilePictureUrl === "string" ? { profilePictureUrl: xAccount.profilePictureUrl } : {}),
    ...(typeof xAccount.linkedAt === "string" ? { linkedAt: xAccount.linkedAt } : {})
  };
}

function sbUserToHuman(s: SbUser): UserAccount {
  return {
    id: s.id,
    email: s.email || "",
    passwordHash: s.password_hash || "",
    createdAt: s.created_at,
    humanId: s.human_id || undefined,
    walletAddress: s.wallet_address || undefined,
    contactEmail: readContactEmailFromSbUser(s),
    notificationPreferences: readNotificationPreferencesFromSbUser(s),
    authProvider: (s.auth_provider || undefined) as "privy" | "local" | undefined,
    privyUserId: s.privy_user_id || undefined,
    xAccount: readPublicXAccountFromSbUser(s)
  };
}
function sbHumanToHuman(s: SbHuman): Human { return { id: s.id, name: s.name, handle: s.handle, role: s.role, location: s.location, city: s.city, country: s.country, verified: s.verified, rating: s.rating, completedJobs: s.completed_jobs, hourlyRate: s.hourly_rate, skills: s.skills, languages: s.languages, avatarSeed: s.avatar_seed, ...(s.avatar_url ? { avatarUrl: s.avatar_url } : {}) }; }
function readPoolAddressFromCampaign(campaign: unknown): string | undefined {
  if (!campaign || typeof campaign !== "object") return undefined;
  const value = (campaign as Record<string, unknown>).poolAddress;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function attachDerivedTaskFields(task: Task): Task {
  const deadlineAwareTask = applyDeadlineAwareTaskState(task) as Task;
  return {
    ...deadlineAwareTask,
    reviewAnchor: parseArticleReviewAnchor(deadlineAwareTask.evidence) || undefined
  };
}

function sbTaskToTask(s: SbTask): Task { return attachDerivedTaskFields({ id: s.id, title: s.title, budget: s.budget, deadline: s.deadline || "", acceptance: s.acceptance, taskType: (s.task_type || undefined) as Task["taskType"], status: s.status as Task["status"], taskState: (s.task_state || undefined) as Task["taskState"], evidence: (s.evidence || []) as Task["evidence"], agentId: s.agent_id || undefined, rewardDistribution: (s.reward_distribution || undefined) as Task["rewardDistribution"], escrowDepositId: s.escrow_deposit_id || undefined, assignee: (s.assignee || undefined) as Task["assignee"], drawResult: (s.draw_result || undefined) as Task["drawResult"], campaign: (s.campaign || undefined) as Task["campaign"], poolAddress: s.pool_address || readPoolAddressFromCampaign(s.campaign), verifyCooldownHours: s.verify_cooldown_hours, createdAt: s.created_at, updatedAt: s.updated_at }); }
function sbQpToQp(s: SbQuestProgress): QuestProgress { return { id: s.id, walletAddress: s.wallet_address, taskId: s.task_id, subtaskKey: s.subtask_key, status: s.status as QuestProgress["status"], verifiedAt: s.verified_at || undefined, createdAt: s.created_at }; }
function sbPaymentToPayment(s: SbPayment): PaymentEntry { return { id: s.id, taskId: s.task_id || undefined, fallbackOrderId: s.fallback_order_id || undefined, idempotencyKey: s.idempotency_key || undefined, amount: s.amount, receiver: s.receiver, receiverAddress: s.receiver_address, payerAddress: s.payer_address, method: s.method as PaymentEntry["method"], status: s.status as PaymentEntry["status"], source: (s.source || undefined) as PaymentEntry["source"] | undefined, network: (s.network || undefined) as SettlementNetwork | undefined, chainId: s.chain_id || undefined, tokenSymbol: s.token_symbol || undefined, tokenAddress: s.token_address || undefined, txHash: s.tx_hash || undefined, explorerUrl: s.explorer_url || undefined, createdAt: s.created_at }; }
function sbNotifToNotif(s: SbNotification): Notification { return { id: s.id, userId: s.user_id, type: s.type as Notification["type"], title: s.title, body: s.body, taskId: s.task_id || undefined, read: s.read, createdAt: s.created_at }; }
function sbLdpToLdp(s: SbLuckyDrawParticipant): LuckyDrawParticipant { return { id: s.id, taskId: s.task_id, walletAddress: s.wallet_address, xHandle: s.x_handle || "", createdAt: s.created_at }; }
function sbArticleSubmissionToArticleSubmission(s: SbArticleSubmission): ArticleSubmission {
  return {
    id: s.id,
    taskId: s.task_id,
    walletAddress: s.wallet_address,
    userId: s.user_id || undefined,
    xHandle: s.x_handle,
    articleUrl: s.article_url,
    articleId: s.article_id || undefined,
    authorHandle: s.author_handle,
    title: s.title,
    contentSnapshot: s.content_snapshot,
    status: (s.status || "submitted") as ArticleSubmissionStatus,
    aiScore: s.ai_score ?? undefined,
    aiReview: s.ai_review || undefined,
    aiRubric: s.ai_rubric || undefined,
    rank: s.rank ?? undefined,
    prizeAmount: s.prize_amount || undefined,
    paymentTxHash: s.payment_tx_hash || undefined,
    paymentExplorerUrl: s.payment_explorer_url || undefined,
    submittedAt: s.submitted_at,
    reviewedAt: s.reviewed_at || undefined,
    updatedAt: s.updated_at
  };
}
function sbSessionToSession(s: SbSession): AuthSession { return { id: s.id, userId: s.user_id, token: s.token, createdAt: s.created_at, expiresAt: s.expires_at }; }
function sbEscrowToEscrow(s: SbEscrowDeposit): EscrowDeposit { return { id: s.id, taskId: s.task_id || "", agentId: s.agent_id || "", agentWallet: s.agent_wallet || "", totalPool: s.total_pool || "0", amountPaidOut: s.amount_paid_out, amountRefunded: s.amount_refunded, paidCount: s.paid_count, status: (s.status || "active") as EscrowDeposit["status"], depositTxHash: s.deposit_tx_hash || undefined, depositExplorerUrl: s.deposit_explorer_url || undefined, refundTxHash: s.refund_tx_hash || undefined, refundExplorerUrl: s.refund_explorer_url || undefined, errorMessage: s.error_message || undefined, createdAt: s.created_at, updatedAt: s.updated_at }; }
function sbServiceToService(s: SbService): HumanService { return { id: s.id, providerId: s.provider_id || "", title: s.title, shortDescription: s.short_description, description: s.description, category: s.category as HumanService["category"], price: s.price, pricing: s.pricing as HumanService["pricing"], durationMinutes: s.duration_minutes, verified: s.verified, ratingCount: s.rating_count }; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function humanToSbUser(h: UserAccount, includeContactColumns = false): any {
  const storedXAccount: Record<string, unknown> = h.xAccount ? { ...h.xAccount } : {};
  if (!includeContactColumns) {
    if (h.contactEmail) {
      storedXAccount.__contactEmail = h.contactEmail;
    }
    if (h.notificationPreferences) {
      storedXAccount.__notificationPreferences = h.notificationPreferences;
    }
  }

  return {
    id: h.id,
    email: h.email,
    password_hash: h.passwordHash || null,
    created_at: h.createdAt,
    human_id: h.humanId ?? null,
    wallet_address: h.walletAddress ?? null,
    ...(includeContactColumns
      ? {
          contact_email: h.contactEmail ?? null,
          notification_preferences: h.notificationPreferences ?? null
        }
      : {}),
    auth_provider: h.authProvider ?? null,
    privy_user_id: h.privyUserId ?? null,
    x_account: Object.keys(storedXAccount).length > 0 ? storedXAccount : null
  };
}

function userToSbProfileUpdate(h: UserAccount, includeContactColumns = false): Record<string, unknown> {
  const storedXAccount: Record<string, unknown> = h.xAccount ? { ...h.xAccount } : {};
  if (!includeContactColumns) {
    if (h.contactEmail) {
      storedXAccount.__contactEmail = h.contactEmail;
    } else {
      delete storedXAccount.__contactEmail;
    }
    if (h.notificationPreferences) {
      storedXAccount.__notificationPreferences = h.notificationPreferences;
    } else {
      delete storedXAccount.__notificationPreferences;
    }
  }

  return {
    human_id: h.humanId ?? null,
    ...(includeContactColumns
      ? {
          contact_email: h.contactEmail ?? null,
          notification_preferences: h.notificationPreferences ?? null
        }
      : {
          x_account: Object.keys(storedXAccount).length > 0 ? storedXAccount : null
        })
  };
}

async function preserveExistingXAccountsForWrite(users: UserAccount[]): Promise<UserAccount[]> {
  if (!supabase || users.length === 0) return users;

  const { data, error } = await supabase
    .from("users")
    .select("id,wallet_address,x_account")
    .not("x_account", "is", null);
  if (error || !data?.length) return users;

  const byId = new Map<string, UserAccount["xAccount"]>();
  const byWallet = new Map<string, UserAccount["xAccount"]>();
  for (const row of data as Array<{ id: string; wallet_address: string | null; x_account: StoredXAccount }>) {
    const xAccount = readPublicXAccountFromSbUser({
      id: row.id,
      email: null,
      created_at: "",
      human_id: null,
      wallet_address: row.wallet_address,
      auth_provider: null,
      x_account: row.x_account
    });
    if (!xAccount) continue;
    byId.set(row.id, xAccount);
    const wallet = String(row.wallet_address || "").trim().toLowerCase();
    if (wallet && !byWallet.has(wallet)) {
      byWallet.set(wallet, xAccount);
    }
  }

  return users.map((user) => {
    if (user.xAccount?.username) return user;
    const wallet = String(user.walletAddress || "").trim().toLowerCase();
    const preserved = byId.get(user.id) || (wallet ? byWallet.get(wallet) : undefined);
    return preserved ? { ...user, xAccount: preserved } : user;
  });
}

function mergeLocalUserMetadata(users: UserAccount[], localUsers: UserAccount[]): UserAccount[] {
  return users.map((user) => {
    const localUser = localUsers.find(
      (item) =>
        item.id === user.id ||
        (item.privyUserId && item.privyUserId === user.privyUserId) ||
        (item.walletAddress && user.walletAddress && item.walletAddress.toLowerCase() === user.walletAddress.toLowerCase())
    );
    return localUser?.xAccount ? { ...user, xAccount: localUser.xAccount } : user;
  });
}

function mergeLocalHumanMetadata(humans: Human[], localHumans: Human[]): Human[] {
  return humans.map((human) => {
    const localHuman = localHumans.find((item) => item.id === human.id);
    return localHuman?.avatarUrl ? { ...human, avatarUrl: localHuman.avatarUrl } : human;
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function humanToSbHuman(h: Human, includeAvatarUrl = false): any { return { id: h.id, name: h.name, handle: h.handle, role: h.role, location: h.location, city: h.city, country: h.country, verified: h.verified, rating: h.rating, completed_jobs: h.completedJobs, hourly_rate: h.hourlyRate, skills: h.skills, languages: h.languages, avatar_seed: h.avatarSeed, ...(includeAvatarUrl ? { avatar_url: h.avatarUrl ?? null } : {}) }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function taskToSbTask(t: Task, includePoolAddress = false): any {
  const campaign =
    t.poolAddress && t.campaign
      ? { ...t.campaign, poolAddress: t.poolAddress }
      : t.poolAddress
        ? { poolAddress: t.poolAddress }
        : t.campaign ?? null;
  return {
    id: t.id,
    title: t.title,
    budget: t.budget,
    deadline: t.deadline || null,
    acceptance: t.acceptance,
    task_type: t.taskType ?? null,
    status: t.status,
    task_state: t.taskState,
    evidence: t.evidence ?? [],
    agent_id: t.agentId ?? null,
    reward_distribution: t.rewardDistribution ?? null,
    escrow_deposit_id: t.escrowDepositId ?? null,
    assignee: t.assignee ?? null,
    draw_result: t.drawResult ?? null,
    campaign,
    ...(includePoolAddress ? { pool_address: t.poolAddress ?? null } : {}),
    verify_cooldown_hours: t.verifyCooldownHours,
    created_at: t.createdAt,
    updated_at: t.updatedAt
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qpToSbQp(qp: QuestProgress): any { return { id: qp.id, wallet_address: qp.walletAddress, task_id: qp.taskId, subtask_key: qp.subtaskKey, status: qp.status, verified_at: qp.verifiedAt ?? null, created_at: qp.createdAt }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paymentToSbPayment(p: PaymentEntry, includeIdempotency = true): any {
  return {
    id: p.id,
    task_id: p.taskId ?? null,
    ...(includeIdempotency
      ? {
          fallback_order_id: p.fallbackOrderId ?? null,
          idempotency_key: p.idempotencyKey ?? null
        }
      : {}),
    amount: p.amount,
    receiver: p.receiver,
    receiver_address: p.receiverAddress,
    payer_address: p.payerAddress,
    method: p.method,
    status: p.status,
    source: p.source ?? null,
    network: p.network ?? null,
    chain_id: p.chainId ?? null,
    token_symbol: p.tokenSymbol ?? null,
    token_address: p.tokenAddress ?? null,
    tx_hash: p.txHash ?? null,
    explorer_url: p.explorerUrl ?? null,
    created_at: p.createdAt
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notifToSbNotif(n: Notification): any { return { id: n.id, user_id: n.userId, type: n.type, title: n.title, body: n.body, task_id: n.taskId ?? null, read: n.read, created_at: n.createdAt }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ldpToSbLdp(ldp: LuckyDrawParticipant): any { return { id: ldp.id, task_id: ldp.taskId, wallet_address: ldp.walletAddress, x_handle: ldp.xHandle ?? null, created_at: ldp.createdAt }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function articleSubmissionToSbArticleSubmission(s: ArticleSubmission): any {
  return {
    id: s.id,
    task_id: s.taskId,
    wallet_address: s.walletAddress,
    user_id: s.userId ?? null,
    x_handle: s.xHandle,
    article_url: s.articleUrl,
    article_id: s.articleId ?? null,
    author_handle: s.authorHandle,
    title: s.title,
    content_snapshot: s.contentSnapshot,
    status: s.status,
    ai_score: s.aiScore ?? null,
    ai_review: s.aiReview ?? null,
    ai_rubric: s.aiRubric ?? null,
    rank: s.rank ?? null,
    prize_amount: s.prizeAmount ?? null,
    payment_tx_hash: s.paymentTxHash ?? null,
    payment_explorer_url: s.paymentExplorerUrl ?? null,
    submitted_at: s.submittedAt,
    reviewed_at: s.reviewedAt ?? null,
    updated_at: s.updatedAt
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sessionToSbSession(s: AuthSession): any { return { id: s.id, user_id: s.userId, token: s.token, created_at: s.createdAt, expires_at: s.expiresAt }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function escrowToSbEscrow(e: EscrowDeposit): any { return { id: e.id, task_id: e.taskId ?? null, agent_id: e.agentId ?? null, agent_wallet: e.agentWallet ?? null, total_pool: e.totalPool ?? null, amount_paid_out: e.amountPaidOut, amount_refunded: e.amountRefunded, paid_count: e.paidCount, status: e.status, deposit_tx_hash: e.depositTxHash ?? null, deposit_explorer_url: e.depositExplorerUrl ?? null, refund_tx_hash: e.refundTxHash ?? null, refund_explorer_url: e.refundExplorerUrl ?? null, error_message: e.errorMessage ?? null, created_at: e.createdAt, updated_at: e.updatedAt }; }

async function readDbFromSupabase(): Promise<Db> {
  if (!supabase) throw new Error("Supabase not configured");
  const includeArticleSubmissions = await supportsArticleSubmissions();
  const results = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("humans").select("*"),
    supabase.from("tasks").select(TASK_SELECT_COLUMNS),
    supabase.from("quest_progress").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("notifications").select("*"),
    supabase.from("lucky_draw_participants").select("*"),
    supabase.from("escrow_deposits").select("*"),
    supabase.from("services").select("*"),
    supabase.from("sessions").select("*"),
    includeArticleSubmissions
      ? supabase.from("article_submissions").select("*").order("submitted_at", { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);
  const [usersRes, humansRes, tasksRes, qpRes, paymentsRes, notifsRes, ldpRes, escrowRes, servicesRes, sessionsRes, articleSubmissionsRes] = results;
  const readErrors = [
    ["users", usersRes.error],
    ["humans", humansRes.error],
    ["tasks", tasksRes.error],
    ["quest_progress", qpRes.error],
    ["payments", paymentsRes.error],
    ["notifications", notifsRes.error],
    ["lucky_draw_participants", ldpRes.error],
    ["escrow_deposits", escrowRes.error],
    ["services", servicesRes.error],
    ["sessions", sessionsRes.error],
    ["article_submissions", articleSubmissionsRes.error]
  ].flatMap(([table, error]) =>
    error && typeof error !== "string"
      ? [{ table: String(table), message: error.message }]
      : []
  );
  if (readErrors.length > 0) {
    throw new Error(
      `Supabase read failed: ${readErrors
        .map((error) => `${error.table}: ${error.message || "unknown error"}`)
        .join("; ")}`
    );
  }
  const bundled = getBundledDb();
  const fileSnapshot = await readFileSnapshot();
  const allowLocalMetadata = !isProductionRuntime();
  const localTaskSnapshot =
    allowLocalMetadata && Array.isArray(fileSnapshot.tasks) ? fileSnapshot.tasks : [];
  const supabaseTaskRows = (tasksRes.data ?? []) as unknown as SbTask[];
  const supabaseTasks = supabaseTaskRows.map(sbTaskToTask);
  const supabaseUsers = usersRes.data?.map(sbUserToHuman) ?? [];
  const supabaseHumans = humansRes.data?.map(sbHumanToHuman) ?? [];
  const localUsers = Array.isArray(fileSnapshot.users) ? fileSnapshot.users : [];
  const localHumans = Array.isArray(fileSnapshot.humans) ? fileSnapshot.humans : [];
  const localSessions =
    allowLocalMetadata && Array.isArray(fileSnapshot.sessions) ? fileSnapshot.sessions : [];
  return {
    users: allowLocalMetadata ? mergeLocalUserMetadata(supabaseUsers, localUsers) : supabaseUsers,
    humans: supabaseHumans.length
      ? allowLocalMetadata
        ? mergeLocalHumanMetadata(supabaseHumans, localHumans)
        : supabaseHumans
      : seedHumans.map(h => ({ ...h })),
    tasks:
      localTaskSnapshot.length > 0
        ? mergeById(localTaskSnapshot, supabaseTasks)
        : supabaseTasks.length > 0
          ? supabaseTasks
          : mergeById([], bundled.tasks),
    questProgress: qpRes.data?.map(sbQpToQp) ?? [],
    payments: paymentsRes.data?.map(sbPaymentToPayment) ?? [],
    notifications: notifsRes.data?.map(sbNotifToNotif) ?? [],
    luckyDrawParticipants: ldpRes.data?.map(sbLdpToLdp) ?? [],
    articleSubmissions: articleSubmissionsRes.data?.map(sbArticleSubmissionToArticleSubmission) ?? [],
    escrowDeposits: escrowRes.data?.map(sbEscrowToEscrow) ?? [],
    services: servicesRes.data?.length ? servicesRes.data : seedServices.map(s => ({ ...s })),
    agents: bundled.agents,
    fallbackOrders: bundled.fallbackOrders,
    fallbackSubscriptions: [],
    waitlist: [],
    sessions: sessionsRes.data?.map(sbSessionToSession) ?? []
  };
}

// Track which collections were modified during an updateDb call
const _modifiedCollections = new Set<string>();
let _supportsHumanAvatarUrl: boolean | null = null;
let _supportsTaskPoolAddress: boolean | null = null;
let _supportsArticleSubmissions: boolean | null = null;
let _supportsPaymentIdempotency: boolean | null = null;
let _supportsUserContactColumns: boolean | null = null;

async function supportsHumanAvatarUrl(): Promise<boolean> {
  if (!supabase) return false;
  if (_supportsHumanAvatarUrl !== null) return _supportsHumanAvatarUrl;
  const { error } = await supabase.from("humans").select("avatar_url").limit(1);
  _supportsHumanAvatarUrl = !error;
  return _supportsHumanAvatarUrl;
}

async function supportsUserContactColumns(): Promise<boolean> {
  if (!supabase) return false;
  if (_supportsUserContactColumns !== null) return _supportsUserContactColumns;
  const { error } = await supabase.from("users").select("contact_email,notification_preferences").limit(1);
  _supportsUserContactColumns = !error;
  return _supportsUserContactColumns;
}

async function supportsTaskPoolAddress(): Promise<boolean> {
  if (!supabase) return false;
  if (_supportsTaskPoolAddress !== null) return _supportsTaskPoolAddress;
  const { error } = await supabase.from("tasks").select("pool_address").limit(1);
  _supportsTaskPoolAddress = !error;
  return _supportsTaskPoolAddress;
}

async function supportsArticleSubmissions(): Promise<boolean> {
  if (!supabase) return false;
  if (_supportsArticleSubmissions !== null) return _supportsArticleSubmissions;
  const { error } = await supabase.from("article_submissions").select("id").limit(1);
  if (error) return false;
  _supportsArticleSubmissions = true;
  return true;
}

export async function supportsArticleSubmissionsTable(): Promise<boolean> {
  return supportsArticleSubmissions();
}

async function supportsPaymentIdempotencyColumns(): Promise<boolean> {
  if (!supabase) return false;
  if (_supportsPaymentIdempotency !== null) return _supportsPaymentIdempotency;
  const { error } = await supabase.from("payments").select("idempotency_key").limit(1);
  _supportsPaymentIdempotency = !error;
  return _supportsPaymentIdempotency;
}

async function writeDbToSupabase(db: Db): Promise<void> {
  if (!supabase) return;
  const includeHumanAvatarUrl = await supportsHumanAvatarUrl();
  const includeTaskPoolAddress = await supportsTaskPoolAddress();
  const includeArticleSubmissions = await supportsArticleSubmissions();
  const includePaymentIdempotency = await supportsPaymentIdempotencyColumns();
  const includeUserContactColumns = await supportsUserContactColumns();
  const usersForWrite = await preserveExistingXAccountsForWrite(db.users);
  const writeRequests = [
    { table: "users", request: supabase.from("users").upsert(usersForWrite.map((user) => humanToSbUser(user, includeUserContactColumns)), { onConflict: "id" }) },
    { table: "humans", request: supabase.from("humans").upsert(db.humans.map((human) => humanToSbHuman(human, includeHumanAvatarUrl)), { onConflict: "id" }) },
    { table: "tasks", request: supabase.from("tasks").upsert(db.tasks.map((task) => taskToSbTask(task, includeTaskPoolAddress)), { onConflict: "id" }) },
    { table: "quest_progress", request: supabase.from("quest_progress").upsert(db.questProgress.map(qpToSbQp), { onConflict: "id" }) },
    { table: "payments", request: supabase.from("payments").upsert(db.payments.map((payment) => paymentToSbPayment(payment, includePaymentIdempotency)), { onConflict: "id" }) },
    { table: "notifications", request: supabase.from("notifications").upsert(db.notifications.map(notifToSbNotif), { onConflict: "id" }) },
    { table: "lucky_draw_participants", request: supabase.from("lucky_draw_participants").upsert(db.luckyDrawParticipants.map(ldpToSbLdp), { onConflict: "id" }) },
    ...(includeArticleSubmissions
      ? [{ table: "article_submissions", request: supabase.from("article_submissions").upsert(db.articleSubmissions.map(articleSubmissionToSbArticleSubmission), { onConflict: "id" }) }]
      : []),
    { table: "escrow_deposits", request: supabase.from("escrow_deposits").upsert(db.escrowDeposits.map(escrowToSbEscrow), { onConflict: "id" }) },
    { table: "services", request: supabase.from("services").upsert(db.services.map((s: HumanService) => ({ id: s.id, provider_id: s.providerId, title: s.title, short_description: s.shortDescription, description: s.description, category: s.category, price: s.price, pricing: s.pricing, duration_minutes: s.durationMinutes, verified: s.verified, rating_count: s.ratingCount, created_at: new Date().toISOString() })), { onConflict: "id" }) },
    { table: "sessions", request: supabase.from("sessions").upsert(db.sessions.map(sessionToSbSession), { onConflict: "id" }) }
  ];
  const writes = await Promise.all(
    writeRequests.map(async ({ table, request }) => [table, await request] as const)
  );
  const writeErrors = writes
    .map(([table, result]) => [table, result.error] as const)
    .filter(([, error]) => error);
  if (writeErrors.length > 0) {
    throw new Error(
      `Supabase write failed: ${writeErrors
        .map(([table, error]) => `${table}: ${error?.message || "unknown error"}`)
        .join("; ")}`
    );
  }
}

async function writeProfileSetToSupabase<T>(writeSet: ProfileWriteSet<T>): Promise<void> {
  if (!supabase) return;

  const includeHumanAvatarUrl = await supportsHumanAvatarUrl();
  const includeTaskPoolAddress = await supportsTaskPoolAddress();
  const includeUserContactColumns = await supportsUserContactColumns();
  const writeRequests = [
    ...(writeSet.user
      ? [{
          table: "users",
          request: supabase
            .from("users")
            .update(userToSbProfileUpdate(writeSet.user, includeUserContactColumns))
            .eq("id", writeSet.user.id)
        }]
      : []),
    ...(writeSet.human
      ? [{ table: "humans", request: supabase.from("humans").upsert([humanToSbHuman(writeSet.human, includeHumanAvatarUrl)], { onConflict: "id" }) }]
      : []),
    ...(writeSet.task
      ? [{ table: "tasks", request: supabase.from("tasks").upsert([taskToSbTask(writeSet.task, includeTaskPoolAddress)], { onConflict: "id" }) }]
      : []),
    ...((writeSet.notifications || []).length > 0
      ? [{ table: "notifications", request: supabase.from("notifications").upsert((writeSet.notifications || []).map(notifToSbNotif), { onConflict: "id" }) }]
      : [])
  ];

  const writes = await Promise.all(
    writeRequests.map(async ({ table, request }) => [table, await request] as const)
  );
  const writeErrors = writes
    .map(([table, result]) => [table, result.error] as const)
    .filter(([, error]) => error);
  if (writeErrors.length > 0) {
    throw new Error(
      `Supabase profile write failed: ${writeErrors
        .map(([table, error]) => `${table}: ${error?.message || "unknown error"}`)
        .join("; ")}`
    );
  }
}

// ---- Public API ----

export async function readDb(): Promise<Db> {
  if (isSupabaseEnabled) {
    try {
      return await readDbFromSupabase();
    } catch (err) {
      if (isProductionRuntime()) {
        throw err;
      }
      console.error("[Supabase] readDb failed, falling back to file:", err);
    }
  }
  if (isProductionRuntime()) {
    throw new Error("Supabase is required in production.");
  }
  return readDbFromFile();
}

export async function writeDb(db: Db): Promise<void> {
  if (isSupabaseEnabled) {
    try {
      await writeDbToSupabase(db);
      if (!isProductionRuntime()) {
        await writeDbToFile(db);
      }
      return;
    } catch (err) {
      if (isProductionRuntime()) {
        throw err;
      }
      console.error("[Supabase] writeDb failed, falling back to file:", err);
    }
  }
  if (isProductionRuntime()) {
    throw new Error("Supabase is required in production.");
  }
  await writeDbToFile(db);
}

// Simple in-process mutex to prevent concurrent updates
let _dbLock: Promise<void> = Promise.resolve();

export async function updateDb<T>(
  updater: (db: Db) => T | Promise<T>
): Promise<T> {
  let resolve: () => void;
  const prev = _dbLock;
  _dbLock = new Promise<void>((r) => { resolve = r; });
  await prev;
  try {
    const db = await readDb();
    const result = await updater(db);
    await writeDb(db);
    return result;
  } finally {
    resolve!();
  }
}

export async function updateProfileDb<T>(
  updater: (db: Db) => ProfileWriteSet<T> | Promise<ProfileWriteSet<T>>
): Promise<T> {
  let resolve: () => void;
  const prev = _dbLock;
  _dbLock = new Promise<void>((r) => { resolve = r; });
  await prev;
  try {
    const db = await readDb();
    const writeSet = await updater(db);
    if (isSupabaseEnabled) {
      try {
        await writeProfileSetToSupabase(writeSet);
        if (!isProductionRuntime()) {
          await writeDbToFile(db);
        }
        return writeSet.result;
      } catch (err) {
        if (isProductionRuntime()) {
          throw err;
        }
        console.error("[Supabase] profile write failed, falling back to file:", err);
      }
    }
    if (isProductionRuntime()) {
      throw new Error("Supabase is required in production.");
    }
    await writeDbToFile(db);
    return writeSet.result;
  } finally {
    resolve!();
  }
}
