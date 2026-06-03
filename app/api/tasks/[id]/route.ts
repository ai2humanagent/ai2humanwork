import { NextResponse } from "next/server";
import { readDb, type Task } from "../../../lib/store";
import { getPrizePoolInfo } from "../../../lib/prizePool";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlternateClaimTask = {
  id: string;
  deadline: string;
  status: "created" | "ai_failed";
};

type DirectTaskRow = {
  id: string;
  title: string;
  budget: string;
  deadline: string | null;
  acceptance: string;
  task_type: string | null;
  status: string;
  task_state: string | null;
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

function findLatestTaskById(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  taskId: string
) {
  const matches = tasks.filter((item) => item.id === taskId);
  if (matches.length <= 1) return matches[0] ?? null;
  return matches.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

function readPoolAddressFromCampaign(campaign: unknown): string | undefined {
  if (!campaign || typeof campaign !== "object") return undefined;
  const value = (campaign as Record<string, unknown>).poolAddress;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readTaskDirectlyFromSupabase(taskId: string): Promise<Task | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tasks")
    .select(
      [
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
      ].join(",")
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as DirectTaskRow;

  return {
    id: row.id,
    title: row.title,
    budget: row.budget,
    deadline: row.deadline || "",
    acceptance: row.acceptance,
    taskType: (row.task_type || undefined) as Task["taskType"],
    status: row.status as Task["status"],
    taskState: (row.task_state || undefined) as Task["taskState"],
    evidence: (row.evidence || []) as Task["evidence"],
    agentId: row.agent_id || undefined,
    rewardDistribution: (row.reward_distribution || undefined) as Task["rewardDistribution"],
    escrowDepositId: row.escrow_deposit_id || undefined,
    assignee: (row.assignee || undefined) as Task["assignee"],
    drawResult: (row.draw_result || undefined) as Task["drawResult"],
    campaign: (row.campaign || undefined) as Task["campaign"],
    poolAddress: readPoolAddressFromCampaign(row.campaign),
    verifyCooldownHours: row.verify_cooldown_hours ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function pickLatestTask(candidates: Array<Task | null | undefined>): Task | null {
  const tasks = candidates.filter((task): task is Task => Boolean(task));
  if (!tasks.length) return null;
  return tasks.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

function findAlternateClaimTask(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  currentTaskId: string
): AlternateClaimTask | null {
  const currentTask = findLatestTaskById(tasks, currentTaskId);
  if (!currentTask) return null;

  const candidate = tasks.find((candidate) => {
    if (candidate.id === currentTask.id) return false;
    if (candidate.status !== "created" && candidate.status !== "ai_failed") return false;
    return (
      candidate.title === currentTask.title &&
      candidate.campaign?.platform === currentTask.campaign?.platform &&
      candidate.campaign?.action === currentTask.campaign?.action
    );
  });

  if (!candidate) return null;
  if (candidate.status !== "created" && candidate.status !== "ai_failed") return null;

  return {
    id: candidate.id,
    deadline: candidate.deadline,
    status: candidate.status
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [db, directTask] = await Promise.all([
    readDb(),
    readTaskDirectlyFromSupabase(id)
  ]);
  const snapshotTask = findLatestTaskById(db.tasks, id);
  const task = pickLatestTask([directTask, snapshotTask]);
  const alternateClaimTask = findAlternateClaimTask(db.tasks, id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const isClaimedPayment = (item: (typeof db.payments)[number]) =>
    !task.poolAddress || (item.method === "prize_pool_claim" && Boolean(item.txHash));
  const payment =
    db.payments.find((item) => item.taskId === id && item.source === "task") ||
    db.payments.find(
      (item) => item.taskId === id && item.source !== "x402_access" && isClaimedPayment(item)
    ) ||
    null;

  // Fetch on-chain PrizePool status if poolAddress is set (lucky_draw mode)
  const poolAddress = (task as Record<string, unknown>).poolAddress as string | undefined;
  let poolStatus: Record<string, unknown> | null = null;
  if (poolAddress) {
    const info = await getPrizePoolInfo(poolAddress);
    if (info) {
      const claimedCount = db.payments.filter(
        (p) => p.taskId === id && p.source === "twitter_task" && isClaimedPayment(p)
      ).length;
      poolStatus = {
        poolAddress,
        poolBalance: info.poolBalance,
        claimedCount,
        maxWinners: parseInt(info.slotsLeft) + claimedCount,
        slotsLeft: info.slotsLeft,
        isPaused: info.isPaused,
        isDrawn: info.isDrawn,
        deadline: (task as Record<string, unknown>).deadline || null
      };
    }
  }

  const response = NextResponse.json({ task, payment, alternateClaimTask, poolStatus });
  const matchingTaskCount = db.tasks.filter((item) => item.id === id).length;
  response.headers.set(
    "X-A2H-Task-Selection",
    [
      "v3",
      `matches=${matchingTaskCount}`,
      `direct=${directTask ? encodeURIComponent(directTask.updatedAt || "") : "none"}`,
      `snapshot=${snapshotTask ? encodeURIComponent(snapshotTask.updatedAt || "") : "none"}`,
      `selected=${encodeURIComponent(task.updatedAt || "")}`
    ].join(";")
  );
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
