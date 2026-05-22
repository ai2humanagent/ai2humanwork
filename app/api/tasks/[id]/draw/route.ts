import { NextResponse } from "next/server";
import { readDb, updateDb } from "../../../../lib/store";

export const runtime = "nodejs";

/** POST /api/tasks/[id]/draw — execute lucky draw for a task
 *  Selects random winners from verified questers when drawTime has passed.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const dist = task.rewardDistribution;
  if (!dist || dist.mode !== "lucky_draw") {
    return NextResponse.json(
      { error: "This task does not use lucky draw distribution" },
      { status: 400 }
    );
  }

  if (dist.drawTime && new Date() < new Date(dist.drawTime)) {
    return NextResponse.json(
      { error: "Draw time has not arrived yet", drawTime: dist.drawTime },
      { status: 400 }
    );
  }

  // Find all wallets that have completed all required subtasks
  const REQUIRED_KEYS = ["0", "1", "2", "3"];
  const progress = db.questProgress.filter((qp) => qp.taskId === taskId);

  const walletMap = new Map<string, Set<string>>();
  for (const qp of progress) {
    if (qp.status !== "verified") continue;
    if (!walletMap.has(qp.walletAddress)) {
      walletMap.set(qp.walletAddress, new Set());
    }
    walletMap.get(qp.walletAddress)!.add(qp.subtaskKey);
  }

  const eligibleWallets: string[] = [];
  for (const [wallet, keys] of walletMap) {
    if (REQUIRED_KEYS.every((k) => keys.has(k))) {
      eligibleWallets.push(wallet);
    }
  }

  if (eligibleWallets.length === 0) {
    return NextResponse.json(
      { error: "No eligible participants found" },
      { status: 400 }
    );
  }

  // Exclude wallets that already claimed
  const alreadyClaimed = new Set(
    db.payments
      .filter((p) => p.taskId === taskId && p.source === "twitter_task")
      .map((p) => (p.receiverAddress || "").toLowerCase())
  );

  const candidates = eligibleWallets.filter(
    (w) => !alreadyClaimed.has(w.toLowerCase())
  );

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "All eligible participants have already claimed" },
      { status: 400 }
    );
  }

  const maxWinners = dist.maxWinners || 1;
  const slotsLeft = maxWinners - alreadyClaimed.size;

  if (slotsLeft <= 0) {
    return NextResponse.json(
      { error: "All reward slots have been filled" },
      { status: 400 }
    );
  }

  // Shuffle and pick winners
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, Math.min(slotsLeft, shuffled.length));

  // Store draw results in task metadata
  await updateDb((db) => {
    const t = db.tasks.find((x) => x.id === taskId);
    if (t) {
      (t as Record<string, unknown>).drawResult = {
        drawnAt: new Date().toISOString(),
        winners,
        totalEligible: eligibleWallets.length,
        totalCandidates: candidates.length
      };
      t.updatedAt = new Date().toISOString();
    }
  });

  return NextResponse.json({
    success: true,
    winners,
    totalEligible: eligibleWallets.length,
    totalCandidates: candidates.length,
    slotsAwarded: winners.length
  });
}
