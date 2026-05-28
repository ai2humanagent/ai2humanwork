import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { getPrizePoolInfo } from "../../../lib/prizePool";

export const runtime = "nodejs";

type AlternateClaimTask = {
  id: string;
  deadline: string;
  status: "created" | "ai_failed";
};

function findAlternateClaimTask(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  currentTaskId: string
): AlternateClaimTask | null {
  const currentTask = tasks.find((item) => item.id === currentTaskId);
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
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === params.id);
  const alternateClaimTask = findAlternateClaimTask(db.tasks, params.id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const isClaimedPayment = (item: (typeof db.payments)[number]) =>
    !task.poolAddress || (item.method === "prize_pool_claim" && Boolean(item.txHash));
  const payment =
    db.payments.find((item) => item.taskId === params.id && item.source === "task") ||
    db.payments.find(
      (item) => item.taskId === params.id && item.source !== "x402_access" && isClaimedPayment(item)
    ) ||
    null;

  // Fetch on-chain PrizePool status if poolAddress is set (lucky_draw mode)
  const poolAddress = (task as Record<string, unknown>).poolAddress as string | undefined;
  let poolStatus: Record<string, unknown> | null = null;
  if (poolAddress) {
    const info = await getPrizePoolInfo(poolAddress);
    if (info) {
      const claimedCount = db.payments.filter(
        (p) => p.taskId === params.id && p.source === "twitter_task" && isClaimedPayment(p)
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

  return NextResponse.json({ task, payment, alternateClaimTask, poolStatus });
}
