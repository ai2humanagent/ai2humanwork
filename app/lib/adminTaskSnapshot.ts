import type {
  ArticleSubmission,
  ArticleReviewRubric,
  EscrowDeposit,
  LuckyDrawParticipant,
  PaymentEntry,
  QuestProgress,
  Task
} from "./store";
import { supportsArticleSubmissionsTable } from "./store";
import { supabase } from "./supabase";

type AdminTaskSnapshot = {
  tasks: Task[];
  payments: PaymentEntry[];
  questProgress: QuestProgress[];
  luckyDrawParticipants: LuckyDrawParticipant[];
  articleSubmissions: ArticleSubmission[];
  escrowDeposits: EscrowDeposit[];
  source: "supabase-direct";
};

type PaymentRow = {
  id: string;
  task_id: string | null;
  fallback_order_id?: string | null;
  idempotency_key?: string | null;
  amount: string;
  receiver: string;
  receiver_address: string | null;
  payer_address: string | null;
  method: PaymentEntry["method"];
  status: PaymentEntry["status"];
  source: PaymentEntry["source"] | null;
  network: PaymentEntry["network"] | null;
  chain_id: number | null;
  token_symbol: string | null;
  token_address: string | null;
  tx_hash: string | null;
  explorer_url: string | null;
  created_at: string;
};

type QuestProgressRow = {
  id: string;
  wallet_address: string;
  task_id: string;
  subtask_key: string;
  status: QuestProgress["status"];
  verified_at: string | null;
  created_at: string;
};

type LuckyDrawParticipantRow = {
  id: string;
  task_id: string;
  wallet_address: string;
  x_handle: string | null;
  created_at: string;
};

type ArticleSubmissionRow = {
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
  status: ArticleSubmission["status"];
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
};

type EscrowDepositRow = {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  agent_wallet: string | null;
  total_pool: string | null;
  amount_paid_out: string | null;
  amount_refunded: string | null;
  paid_count: number | null;
  status: EscrowDeposit["status"];
  deposit_tx_hash: string | null;
  deposit_explorer_url: string | null;
  refund_tx_hash: string | null;
  refund_explorer_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  budget: string;
  deadline: string | null;
  acceptance: string;
  task_type: string | null;
  status: string;
  task_state: string;
  evidence: unknown[] | null;
  agent_id: string | null;
  reward_distribution: unknown;
  escrow_deposit_id: string | null;
  assignee: unknown;
  draw_result: unknown;
  campaign: unknown;
  verify_cooldown_hours: number | null;
  created_at: string;
  updated_at: string;
};

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

function readPoolAddressFromCampaign(campaign: unknown): string | undefined {
  if (!campaign || typeof campaign !== "object") return undefined;
  const value = (campaign as Record<string, unknown>).poolAddress;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    budget: row.budget,
    deadline: row.deadline || "",
    acceptance: row.acceptance,
    taskType: (row.task_type || undefined) as Task["taskType"],
    status: row.status as Task["status"],
    taskState: row.task_state as Task["taskState"],
    evidence: (row.evidence || []) as Task["evidence"],
    agentId: row.agent_id || undefined,
    rewardDistribution: (row.reward_distribution || undefined) as Task["rewardDistribution"],
    escrowDepositId: row.escrow_deposit_id || undefined,
    assignee: (row.assignee || undefined) as Task["assignee"],
    drawResult: (row.draw_result || undefined) as Task["drawResult"],
    campaign: (row.campaign || undefined) as Task["campaign"],
    poolAddress: readPoolAddressFromCampaign(row.campaign),
    verifyCooldownHours: row.verify_cooldown_hours ?? 24,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function paymentFromRow(row: PaymentRow): PaymentEntry {
  return {
    id: row.id,
    taskId: row.task_id || undefined,
    fallbackOrderId: row.fallback_order_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    amount: row.amount,
    receiver: row.receiver,
    receiverAddress: row.receiver_address || undefined,
    payerAddress: row.payer_address || undefined,
    method: row.method,
    status: row.status,
    source: row.source || undefined,
    network: row.network || undefined,
    chainId: row.chain_id || undefined,
    tokenSymbol: row.token_symbol || undefined,
    tokenAddress: row.token_address || undefined,
    txHash: row.tx_hash || undefined,
    explorerUrl: row.explorer_url || undefined,
    createdAt: row.created_at
  };
}

function questProgressFromRow(row: QuestProgressRow): QuestProgress {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    taskId: row.task_id,
    subtaskKey: row.subtask_key,
    status: row.status,
    verifiedAt: row.verified_at || undefined,
    createdAt: row.created_at
  };
}

function luckyDrawParticipantFromRow(row: LuckyDrawParticipantRow): LuckyDrawParticipant {
  return {
    id: row.id,
    taskId: row.task_id,
    walletAddress: row.wallet_address,
    xHandle: row.x_handle || "",
    createdAt: row.created_at
  };
}

function articleSubmissionFromRow(row: ArticleSubmissionRow): ArticleSubmission {
  return {
    id: row.id,
    taskId: row.task_id,
    walletAddress: row.wallet_address,
    userId: row.user_id || undefined,
    xHandle: row.x_handle,
    articleUrl: row.article_url,
    articleId: row.article_id || undefined,
    authorHandle: row.author_handle,
    title: row.title,
    contentSnapshot: row.content_snapshot,
    status: row.status,
    aiScore: row.ai_score ?? undefined,
    aiReview: row.ai_review || undefined,
    aiRubric: row.ai_rubric || undefined,
    rank: row.rank ?? undefined,
    prizeAmount: row.prize_amount || undefined,
    paymentTxHash: row.payment_tx_hash || undefined,
    paymentExplorerUrl: row.payment_explorer_url || undefined,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || undefined,
    updatedAt: row.updated_at
  };
}

function escrowDepositFromRow(row: EscrowDepositRow): EscrowDeposit {
  return {
    id: row.id,
    taskId: row.task_id || "",
    agentId: row.agent_id || "",
    agentWallet: row.agent_wallet || "",
    totalPool: row.total_pool || "0",
    amountPaidOut: row.amount_paid_out || "0",
    amountRefunded: row.amount_refunded || "0",
    paidCount: row.paid_count || 0,
    status: row.status,
    depositTxHash: row.deposit_tx_hash || undefined,
    depositExplorerUrl: row.deposit_explorer_url || undefined,
    refundTxHash: row.refund_tx_hash || undefined,
    refundExplorerUrl: row.refund_explorer_url || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function readAdminTaskSnapshot(taskId?: string): Promise<AdminTaskSnapshot | null> {
  if (!supabase) return null;

  const tasksQuery = supabase.from("tasks").select(TASK_SELECT_COLUMNS).order("created_at", { ascending: false });
  const paymentQuery = supabase.from("payments").select("*").order("created_at", { ascending: true });
  const questProgressQuery = supabase.from("quest_progress").select("*").order("created_at", { ascending: true });
  const luckyDrawParticipantsQuery = supabase.from("lucky_draw_participants").select("*").order("created_at", { ascending: true });
  const includeArticleSubmissions = await supportsArticleSubmissionsTable();
  const articleSubmissionsQuery = includeArticleSubmissions
    ? supabase.from("article_submissions").select("*").order("submitted_at", { ascending: true })
    : null;
  const escrowDepositsQuery = supabase.from("escrow_deposits").select("*").order("created_at", { ascending: true });

  const [tasksRes, paymentsRes, questProgressRes, luckyDrawParticipantsRes, articleSubmissionsRes, escrowDepositsRes] = await Promise.all([
    taskId ? tasksQuery.eq("id", taskId) : tasksQuery,
    taskId ? paymentQuery.eq("task_id", taskId) : paymentQuery,
    taskId ? questProgressQuery.eq("task_id", taskId) : questProgressQuery,
    taskId ? luckyDrawParticipantsQuery.eq("task_id", taskId) : luckyDrawParticipantsQuery,
    articleSubmissionsQuery
      ? taskId ? articleSubmissionsQuery.eq("task_id", taskId) : articleSubmissionsQuery
      : Promise.resolve({ data: [], error: null }),
    taskId ? escrowDepositsQuery.eq("task_id", taskId) : escrowDepositsQuery
  ]);

  const errors = [
    ["tasks", tasksRes.error],
    ["payments", paymentsRes.error],
    ["quest_progress", questProgressRes.error],
    ["lucky_draw_participants", luckyDrawParticipantsRes.error],
    ["article_submissions", articleSubmissionsRes.error],
    ["escrow_deposits", escrowDepositsRes.error]
  ].flatMap(([table, error]) =>
    error && typeof error !== "string"
      ? [{ table: String(table), message: error.message }]
      : []
  );

  if (errors.length > 0) {
    throw new Error(
      `Admin Supabase snapshot failed: ${errors
        .map((error) => `${error.table}: ${error.message || "unknown error"}`)
        .join("; ")}`
    );
  }

  return {
    tasks: ((tasksRes.data || []) as unknown as TaskRow[]).map(taskFromRow),
    payments: ((paymentsRes.data || []) as PaymentRow[]).map(paymentFromRow),
    questProgress: ((questProgressRes.data || []) as QuestProgressRow[]).map(questProgressFromRow),
    luckyDrawParticipants: ((luckyDrawParticipantsRes.data || []) as LuckyDrawParticipantRow[]).map(luckyDrawParticipantFromRow),
    articleSubmissions: ((articleSubmissionsRes.data || []) as ArticleSubmissionRow[]).map(articleSubmissionFromRow),
    escrowDeposits: ((escrowDepositsRes.data || []) as EscrowDepositRow[]).map(escrowDepositFromRow),
    source: "supabase-direct"
  };
}
