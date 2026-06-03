import type {
  EscrowDeposit,
  LuckyDrawParticipant,
  PaymentEntry,
  QuestProgress
} from "./store";
import { supabase } from "./supabase";

type AdminTaskSnapshot = {
  payments: PaymentEntry[];
  questProgress: QuestProgress[];
  luckyDrawParticipants: LuckyDrawParticipant[];
  escrowDeposits: EscrowDeposit[];
  source: "supabase-direct";
};

type PaymentRow = {
  id: string;
  task_id: string | null;
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

function paymentFromRow(row: PaymentRow): PaymentEntry {
  return {
    id: row.id,
    taskId: row.task_id || undefined,
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

  const paymentQuery = supabase.from("payments").select("*").order("created_at", { ascending: true });
  const questProgressQuery = supabase.from("quest_progress").select("*").order("created_at", { ascending: true });
  const luckyDrawParticipantsQuery = supabase.from("lucky_draw_participants").select("*").order("created_at", { ascending: true });
  const escrowDepositsQuery = supabase.from("escrow_deposits").select("*").order("created_at", { ascending: true });

  const [paymentsRes, questProgressRes, luckyDrawParticipantsRes, escrowDepositsRes] = await Promise.all([
    taskId ? paymentQuery.eq("task_id", taskId) : paymentQuery,
    taskId ? questProgressQuery.eq("task_id", taskId) : questProgressQuery,
    taskId ? luckyDrawParticipantsQuery.eq("task_id", taskId) : luckyDrawParticipantsQuery,
    taskId ? escrowDepositsQuery.eq("task_id", taskId) : escrowDepositsQuery
  ]);

  const errors = [
    ["payments", paymentsRes.error],
    ["quest_progress", questProgressRes.error],
    ["lucky_draw_participants", luckyDrawParticipantsRes.error],
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
    payments: ((paymentsRes.data || []) as PaymentRow[]).map(paymentFromRow),
    questProgress: ((questProgressRes.data || []) as QuestProgressRow[]).map(questProgressFromRow),
    luckyDrawParticipants: ((luckyDrawParticipantsRes.data || []) as LuckyDrawParticipantRow[]).map(luckyDrawParticipantFromRow),
    escrowDeposits: ((escrowDepositsRes.data || []) as EscrowDepositRow[]).map(escrowDepositFromRow),
    source: "supabase-direct"
  };
}
