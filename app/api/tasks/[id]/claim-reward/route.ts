import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type PaymentEntry } from "../../../../lib/store";
import { executeSettlement } from "../../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../../lib/assetLabels";

export const runtime = "nodejs";

const REQUIRED_SUBTASK_KEYS = ["0", "1", "2", "3"];

function parseAmount(raw: string): number {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/** POST /api/tasks/[id]/claim-reward
 *  Body: { wallet }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Check if already claimed by this wallet
  const existingPayment = db.payments.find(
    (p) =>
      p.taskId === taskId &&
      p.source === "twitter_task" &&
      (p.receiverAddress || "").toLowerCase() === wallet
  );
  if (existingPayment) {
    return NextResponse.json({
      success: true,
      alreadyClaimed: true,
      payment: {
        amount: existingPayment.amount,
        txHash: existingPayment.txHash,
        explorerUrl: existingPayment.explorerUrl,
        network: existingPayment.network,
        tokenSymbol: existingPayment.tokenSymbol
      }
    });
  }

  // Check all subtasks are verified
  const progress = db.questProgress.filter(
    (qp) => qp.taskId === taskId && qp.walletAddress === wallet
  );

  for (const key of REQUIRED_SUBTASK_KEYS) {
    const entry = progress.find((qp) => qp.subtaskKey === key);
    if (!entry || entry.status !== "verified") {
      return NextResponse.json(
        { error: `Subtask ${key} is not verified. Complete all tasks before claiming.` },
        { status: 400 }
      );
    }
  }

  // Distribution mode checks
  const dist = task.rewardDistribution;
  const mode = dist?.mode || "fcfs";
  const maxWinners = dist?.maxWinners || 1;

  // Count existing claims for this task
  const claimedCount = db.payments.filter(
    (p) => p.taskId === taskId && p.source === "twitter_task"
  ).length;

  if (mode === "fcfs") {
    if (claimedCount >= maxWinners) {
      return NextResponse.json(
        { error: "All reward slots have been claimed." },
        { status: 400 }
      );
    }
  } else if (mode === "lucky_draw") {
    if (dist?.drawTime && new Date() < new Date(dist.drawTime)) {
      return NextResponse.json(
        { error: "Lucky draw has not ended yet. Please wait for the draw time." },
        { status: 400 }
      );
    }
    // Check if draw has been executed and wallet is a winner
    const drawResult = (task as Record<string, unknown>).drawResult as
      | { winners: string[] }
      | undefined;
    if (!drawResult) {
      return NextResponse.json(
        { error: "Lucky draw has not been executed yet." },
        { status: 400 }
      );
    }
    const isWinner = drawResult.winners.some(
      (w) => w.toLowerCase() === wallet
    );
    if (!isWinner) {
      return NextResponse.json(
        { error: "You were not selected in the lucky draw." },
        { status: 400 }
      );
    }
    if (claimedCount >= maxWinners) {
      return NextResponse.json(
        { error: "All reward slots have been claimed." },
        { status: 400 }
      );
    }
  } else if (mode === "equal") {
    if (claimedCount >= maxWinners) {
      return NextResponse.json(
        { error: "All reward slots have been claimed." },
        { status: 400 }
      );
    }
  }

  // Determine settlement amount based on distribution mode
  let settlementAmount: string;
  if (dist?.perWinner) {
    settlementAmount = dist.perWinner;
  } else if (dist?.totalPool && maxWinners > 0) {
    const pool = parseAmount(dist.totalPool);
    const perWinner = pool / maxWinners;
    settlementAmount = perWinner.toFixed(6).replace(/\.?0+$/, "") + " USDC";
  } else {
    settlementAmount = task.budget;
  }

  // Execute real settlement
  try {
    const settlement = await executeSettlement({
      amount: settlementAmount,
      receiverAddress: wallet
    });

    const payment: PaymentEntry = {
      id: crypto.randomUUID(),
      taskId,
      amount: settlement.amount,
      receiver: "Quest Executor",
      receiverAddress: settlement.receiverAddress,
      payerAddress: settlement.payerAddress,
      method: settlement.method,
      status: settlement.status,
      source: "twitter_task" as const,
      network: settlement.network,
      chainId: settlement.chainId,
      tokenSymbol: settlement.tokenSymbol || DEFAULT_SETTLEMENT_TOKEN_SYMBOL,
      tokenAddress: settlement.tokenAddress,
      txHash: settlement.txHash,
      explorerUrl: settlement.explorerUrl,
      createdAt: new Date().toISOString()
    };

    // Persist payment
    await updateDb((db) => {
      db.payments.unshift(payment);
      const t = db.tasks.find((x) => x.id === taskId);
      if (t) {
        // Only mark as fully paid if all slots are filled
        const totalClaimed = db.payments.filter(
          (p) => p.taskId === taskId && p.source === "twitter_task"
        ).length;
        if (totalClaimed >= maxWinners) {
          t.status = "paid";
        }
        t.updatedAt = new Date().toISOString();
        t.assignee = {
          type: "human",
          name: "Quest Executor",
          walletAddress: wallet
        };
      }
    });

    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      payment: {
        amount: payment.amount,
        txHash: payment.txHash,
        explorerUrl: payment.explorerUrl,
        network: payment.network,
        tokenSymbol: payment.tokenSymbol
      }
    });
  } catch (error) {
    console.error("Claim-reward settlement failed:", error);
    return NextResponse.json(
      { error: "Settlement failed. Please try again later." },
      { status: 500 }
    );
  }
}
