import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { getPrizePoolInfo } from "../../../lib/prizePool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlternateClaimTask = {
  id: string;
  deadline: string;
  status: "created" | "ai_failed";
};

function findLatestTaskById(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  taskId: string
) {
  const matches = tasks.filter((item) => item.id === taskId);
  if (matches.length <= 1) return matches[0] ?? null;
  return matches.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
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
  const db = await readDb();
  const task = findLatestTaskById(db.tasks, id);
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
    `v2;matches=${matchingTaskCount};updatedAt=${encodeURIComponent(task.updatedAt || "")}`
  );
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
