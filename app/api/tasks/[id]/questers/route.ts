import { NextResponse } from "next/server";
import { readDb } from "../../../../lib/store";

export const runtime = "nodejs";

/** GET /api/tasks/[id]/questers — list participants for a task */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const db = await readDb();

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // All wallets that have at least started a subtask (action_done or verified)
  const activeProgress = db.questProgress.filter(
    (qp) =>
      qp.taskId === taskId &&
      (qp.status === "action_done" || qp.status === "verified")
  );

  // Deduplicate by wallet
  const seen = new Set<string>();
  const questers: { wallet: string; avatarSeed: number; verifiedAt?: string }[] = [];

  for (const qp of activeProgress) {
    if (seen.has(qp.walletAddress)) continue;
    seen.add(qp.walletAddress);

    // Check if this wallet has completed all subtasks
    const walletProgress = activeProgress.filter(
      (p) => p.walletAddress === qp.walletAddress && p.status === "verified"
    );
    const allVerified = walletProgress.length >= 4;

    questers.push({
      wallet: qp.walletAddress,
      avatarSeed: hashToSeed(qp.walletAddress),
      verifiedAt: allVerified ? walletProgress[0]?.verifiedAt : undefined
    });
  }

  // Count claims for this task
  const claimedCount = db.payments.filter(
    (p) => p.taskId === taskId && p.source === "twitter_task"
  ).length;

  return NextResponse.json({
    count: questers.length,
    claimedCount,
    questers: questers.slice(0, 50)
  });
}

/** Simple deterministic seed from wallet address for avatar color generation */
function hashToSeed(wallet: string): number {
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) {
    hash = ((hash << 5) - hash + wallet.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
