import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type PaymentEntry } from "../../../lib/store";
import { executeSettlement } from "../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../lib/assetLabels";

export const runtime = "nodejs";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const taskId = String(body.taskId || "").trim();
  const humanId = String(body.humanId || "").trim();
  const walletAddress = String(body.walletAddress || "").trim();

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  // Read current task state
  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Check cooldown
  if (task.verifyCooldownHours) {
    const lastCompletion = db.payments.find(
      (p) => p.taskId === taskId && p.source === "twitter_task"
    );
    if (lastCompletion) {
      const lastPaid = new Date(lastCompletion.createdAt);
      const cooldownMs = task.verifyCooldownHours * 60 * 60 * 1000;
      if (Date.now() - lastPaid.getTime() < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (Date.now() - lastPaid.getTime())) / 1000 / 3600);
        return NextResponse.json(
          {
            success: false,
            verified: false,
            status: "cooldown",
            message: `You can try again in ${remaining} hours`,
            task
          },
          { status: 429 }
        );
      }
    }
  }

  // Simulate verification delay (2-4 seconds)
  await sleep(randomBetween(2000, 4000));

  // 90% pass rate (for demo; in production, this would call Twitter API)
  const verified = Math.random() > 0.1;

  if (!verified) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        status: "failed",
        message: "Task not completed. Please complete it first and try again.",
        task
      },
      { status: 400 }
    );
  }

  // Update task to claimed/verified
  await updateDb((db) => {
    const t = db.tasks.find((x) => x.id === taskId);
    if (t) {
      t.status = "verified";
      t.updatedAt = new Date().toISOString();
      t.assignee = {
        type: "human",
        name: humanId || "Anonymous",
        walletAddress: walletAddress || undefined
      };
    }
  });

  // Execute settlement if wallet available
  let payment: PaymentEntry | null = null;

  if (walletAddress) {
    try {
      const settlement = await executeSettlement({
        amount: task.budget,
        receiverAddress: walletAddress
      });

      payment = {
        id: crypto.randomUUID(),
        taskId,
        amount: settlement.amount,
        receiver: humanId || "Executor",
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

      // Persist payment and mark task as paid
      await updateDb((db) => {
        db.payments.unshift(payment!);
        const t = db.tasks.find((x) => x.id === taskId);
        if (t) {
          t.status = "paid";
          t.updatedAt = new Date().toISOString();
        }
      });
    } catch (error) {
      console.error("Settlement failed:", error);
    }
  }

  const delayMs = randomBetween(2000, 4000);

  return NextResponse.json({
    success: true,
    verified: true,
    status: "success",
    message: payment
      ? `Task verified! ${task.budget} USDC sent to your wallet.`
      : `Task verified! ${task.budget} USDC queued for settlement.`,
    delayMs,
    task: { ...task, status: payment ? "paid" : "verified" },
    payment: payment
      ? {
          amount: payment.amount,
          txHash: payment.txHash,
          explorerUrl: payment.explorerUrl,
          network: payment.network,
          tokenSymbol: payment.tokenSymbol
        }
      : null
  });
}