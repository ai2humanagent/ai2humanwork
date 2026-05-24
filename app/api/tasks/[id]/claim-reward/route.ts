import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type PaymentEntry, type LuckyDrawWinner, type LuckyDrawResult, type LuckyDrawParticipant } from "../../../../lib/store";
import { executeSettlement } from "../../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../../lib/assetLabels";

export const runtime = "nodejs";

const REQUIRED_SUBTASK_KEYS = ["0", "1", "2", "3"];

function parseAmount(raw: string): number {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/** POST /api/tasks/[id]/claim-reward
 *  Body: { wallet, xHandle }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const xHandle = String(body.xHandle || "").trim().replace("@", "");

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  if (!xHandle || xHandle.length < 1) {
    return NextResponse.json({ error: "X handle is required" }, { status: 400 });
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

    // Determine settlement amount
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

      await updateDb((db) => {
        db.payments.unshift(payment);

        const t = db.tasks.find((x) => x.id === taskId);
        if (t) {
          t.updatedAt = new Date().toISOString();
          const totalClaimed = db.payments.filter(
            (p) => p.taskId === taskId && p.source === "twitter_task"
          ).length;
          if (totalClaimed >= maxWinners) {
            t.status = "paid";
            t.taskState = "full";
          }
        }

        const escrow = db.escrowDeposits.find((e) => e.taskId === taskId);
        if (escrow) {
          escrow.paidCount = (escrow.paidCount || 0) + 1;
          escrow.amountPaidOut = (
            parseAmount(escrow.amountPaidOut) + parseAmount(payment.amount)
          ).toFixed(6);
          escrow.updatedAt = new Date().toISOString();
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
  } else if (mode === "lucky_draw") {
    // For lucky draw events, auto-create questProgress entries if missing
    // (this event has simplified verification — just requires X handle submission)
    for (const key of REQUIRED_SUBTASK_KEYS) {
      const existing = db.questProgress.find(
        (qp) => qp.taskId === taskId && qp.walletAddress === wallet && qp.subtaskKey === key
      );
      if (!existing) {
        db.questProgress.push({
          id: crypto.randomUUID(),
          walletAddress: wallet,
          taskId,
          subtaskKey: key,
          status: "verified" as const,
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    }

    if (claimedCount >= maxWinners) {
      return NextResponse.json(
        { error: "All reward slots have been claimed." },
        { status: 400 }
      );
    }

    // Lucky draw: like WeChat red packet — assign random amount at claim time
    // Get or initialize per-winner amounts stored on the task
    let winnerAmounts: LuckyDrawWinner[] = task.drawResult?.winners || [];

    // Calculate remaining pool
    const totalPoolAmount = parseAmount(dist?.totalPool || task.budget);
    const alreadyPaid = winnerAmounts.reduce((sum, w) => sum + parseAmount(w.amount), 0);
    const remainingPool = Math.round((totalPoolAmount - alreadyPaid) * 1e6) / 1e6;
    const remainingSlots = maxWinners - claimedCount;

    if (remainingPool <= 0 || remainingSlots <= 0) {
      return NextResponse.json(
        { error: "No more rewards available." },
        { status: 400 }
      );
    }

    // Determine this winner's amount — random portion of remaining pool
    let settlementAmount: string;
    if (remainingSlots === 1) {
      // Last winner gets everything left
      settlementAmount = `${remainingPool} USDC`;
    } else {
      // Fair cap: each winner gets 0.5x ~ 2x of fair share (like WeChat red packet)
      const fairShare = remainingPool / remainingSlots;
      const minShare = fairShare * 0.5;
      const maxShare = Math.min(fairShare * 2, remainingPool);
      const amount = minShare + Math.random() * (maxShare - minShare);
      const rounded = Math.round(amount * 1e6) / 1e6;
      settlementAmount = `${rounded} USDC`;
    }

    // Record this winner's amount
    winnerAmounts.push({ address: wallet, amount: settlementAmount });

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

      await updateDb((db) => {
        db.payments.unshift(payment);

        // Record lucky draw participant with X handle
        const participant: LuckyDrawParticipant = {
          id: crypto.randomUUID(),
          taskId,
          walletAddress: wallet,
          xHandle,
          createdAt: new Date().toISOString()
        };
        db.luckyDrawParticipants.push(participant);

        const t = db.tasks.find((x) => x.id === taskId);
        if (t) {
          t.updatedAt = new Date().toISOString();
          // Persist lucky draw winners list
          (t as unknown as { drawResult?: LuckyDrawResult }).drawResult = {
            winners: winnerAmounts,
            drawnAt: task.drawResult?.drawnAt || new Date().toISOString()
          };
          const totalClaimed = db.payments.filter(
            (p) => p.taskId === taskId && p.source === "twitter_task"
          ).length;
          if (totalClaimed >= maxWinners) {
            t.status = "paid";
            t.taskState = "full";
          }
        }

        const escrow = db.escrowDeposits.find((e) => e.taskId === taskId);
        if (escrow) {
          escrow.paidCount = (escrow.paidCount || 0) + 1;
          escrow.amountPaidOut = (
            parseAmount(escrow.amountPaidOut) + parseAmount(payment.amount)
          ).toFixed(6);
          escrow.updatedAt = new Date().toISOString();
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
  } else {
    // equal mode
    if (claimedCount >= maxWinners) {
      return NextResponse.json(
        { error: "All reward slots have been claimed." },
        { status: 400 }
      );
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

    // Determine settlement amount
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

      await updateDb((db) => {
        db.payments.unshift(payment);

        const t = db.tasks.find((x) => x.id === taskId);
        if (t) {
          t.updatedAt = new Date().toISOString();
          const totalClaimed = db.payments.filter(
            (p) => p.taskId === taskId && p.source === "twitter_task"
          ).length;
          if (totalClaimed >= maxWinners) {
            t.status = "paid";
            t.taskState = "full";
          }
        }

        const escrow = db.escrowDeposits.find((e) => e.taskId === taskId);
        if (escrow) {
          escrow.paidCount = (escrow.paidCount || 0) + 1;
          escrow.amountPaidOut = (
            parseAmount(escrow.amountPaidOut) + parseAmount(payment.amount)
          ).toFixed(6);
          escrow.updatedAt = new Date().toISOString();
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
}
