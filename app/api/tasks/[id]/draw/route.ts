import { NextResponse } from "next/server";
import { readDb, updateDb } from "../../../../lib/store";
import { buildMerkleRoot } from "../../../../lib/merkleUtils";
import { buildLuckyDrawWinners, parseUsdcToMicros } from "../../../../lib/luckyDraw.js";
import { updatePrizePoolMerkleRoot } from "../../../../lib/prizePool";

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

  if (task.drawResult?.drawnAt && Array.isArray(task.drawResult.winners) && task.drawResult.winners.length > 0) {
    return NextResponse.json(
      { error: "Lucky draw has already been completed.", drawResult: task.drawResult },
      { status: 400 }
    );
  }

  // Find all wallets that have completed all required subtasks.
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

  const totalPool = dist.totalPool || task.budget;
  const totalMicros = parseUsdcToMicros(totalPool);
  if (totalMicros <= 0) {
    return NextResponse.json(
      { error: "Lucky draw total pool is invalid" },
      { status: 400 }
    );
  }

  const winners = buildLuckyDrawWinners({
    candidates,
    maxWinners: Math.min(slotsLeft, candidates.length),
    totalPool,
    maxDeviationBps: 1000
  });

  // ── On-chain: update PrizePool merkle root ───────────────────────────────
  // Get pool address from task. Use campaign.id if available, otherwise
  // derive from task id. The PrizePool must have been created via factory
  // before this draw endpoint is called.
  let poolAddress = "";
  let chainUpdated = false;
  let chainTxHash = "";
  let chainExplorerUrl = "";
  let merkleRoot = "";

  // Try to get pool address from task metadata (set when pool was created)
  const taskPoolAddress = (task as Record<string, unknown>).poolAddress as string | undefined;
  if (taskPoolAddress) {
    poolAddress = taskPoolAddress;
  }

  if (poolAddress && winners.length > 0) {
    merkleRoot = buildMerkleRoot(winners);
    const updateResult = await updatePrizePoolMerkleRoot({
      poolAddress,
      merkleRoot
    });

    if (updateResult.ok) {
      chainUpdated = true;
      chainTxHash = updateResult.txHash;
      chainExplorerUrl = updateResult.explorerUrl;
    } else {
      console.error("Failed to update on-chain merkle root:", updateResult.error);
      return NextResponse.json(
        { error: `Failed to finalize lucky draw on-chain: ${updateResult.error}` },
        { status: 500 }
      );
    }
  }

  // Store draw results only after the on-chain commitment succeeds. For local
  // tasks without a pool address, the merkle update is intentionally skipped.
  const drawnAt = new Date().toISOString();
  await updateDb((db) => {
    const t = db.tasks.find((x) => x.id === taskId);
    if (t) {
      (t as Record<string, unknown>).drawResult = {
        drawnAt,
        winners,
        totalEligible: eligibleWallets.length,
        totalCandidates: candidates.length,
        totalPool,
        maxDeviationBps: 1000,
        merkleRoot: merkleRoot || null,
        chainTxHash: chainTxHash || null,
        chainExplorerUrl: chainExplorerUrl || null
      };
      t.updatedAt = new Date().toISOString();
    }
  });

  return NextResponse.json({
    success: true,
    winners,
    totalEligible: eligibleWallets.length,
    totalCandidates: candidates.length,
    slotsAwarded: winners.length,
    merkleRoot: merkleRoot || null,
    merkleRootStatus: chainUpdated ? "updated" : "skipped",
    chainTxHash: chainTxHash || null,
    chainExplorerUrl: chainExplorerUrl || null
  });
}
