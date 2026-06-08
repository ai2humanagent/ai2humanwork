import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminAuthContext } from "../../../../../lib/adminAuth";
import { claimForPrizePool } from "../../../../../lib/prizePool";
import { executeSettlement } from "../../../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../../../lib/assetLabels";
import { readDb, updateDb, type PaymentEntry } from "../../../../../lib/store";
import { isArticleContestDistribution } from "../../../../../lib/articleContest";
import { appendEvidence } from "../../../../../lib/taskEvidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readPoolAddress(task: Awaited<ReturnType<typeof readDb>>["tasks"][number]) {
  if (task.poolAddress) return task.poolAddress;
  const campaign = task.campaign as Record<string, unknown> | undefined;
  const poolAddress = campaign?.poolAddress;
  return typeof poolAddress === "string" ? poolAddress : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id: taskId } = await params;
  const requestId = crypto.randomUUID();
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!isArticleContestDistribution(task.rewardDistribution)) {
    return NextResponse.json({ error: "This task is not a ranked article contest." }, { status: 400 });
  }

  const payable = db.articleSubmissions.filter(
    (submission) =>
      submission.taskId === taskId &&
      submission.status === "winner" &&
      submission.prizeAmount &&
      !submission.paymentTxHash &&
      !db.payments.some(
        (payment) =>
          payment.taskId === taskId &&
          payment.source === "article_contest" &&
          ((payment.receiverAddress || "").toLowerCase() === submission.walletAddress.toLowerCase() ||
            payment.idempotencyKey === `article_contest:${taskId}:${submission.id}`)
      )
  );

  if (!payable.length) {
    console.info("[ArticleContest] payout:skip", { requestId, taskId, reason: "No unpaid winners." });
    return NextResponse.json({ success: true, paid: 0, skipped: true, message: "No unpaid winners." });
  }

  const poolAddress = readPoolAddress(task);
  console.info("[ArticleContest] payout:start", {
    requestId,
    taskId,
    payable: payable.length,
    poolAddress: poolAddress || null,
    winners: payable.map((submission) => ({
      submissionId: submission.id,
      xHandle: submission.xHandle,
      walletAddress: submission.walletAddress,
      prizeAmount: submission.prizeAmount
    }))
  });
  const paid: Array<{ submissionId: string; payment: PaymentEntry }> = [];
  const failed: Array<{ submissionId: string; walletAddress: string; error: string }> = [];

  for (const submission of payable) {
    try {
      let settlement;
      if (poolAddress) {
        const claimResult = await claimForPrizePool({
          poolAddress,
          recipientAddress: submission.walletAddress,
          amount: submission.prizeAmount!
        });
        if (!claimResult.ok) {
          console.warn("[ArticleContest] payout:claim_failed", {
            requestId,
            taskId,
            submissionId: submission.id,
            walletAddress: submission.walletAddress,
            prizeAmount: submission.prizeAmount,
            error: claimResult.error
          });
          failed.push({ submissionId: submission.id, walletAddress: submission.walletAddress, error: claimResult.error });
          continue;
        }
        settlement = {
          amount: submission.prizeAmount!.replace(" USDC", ""),
          receiverAddress: submission.walletAddress,
          payerAddress: undefined,
          method: "prize_pool_claim" as const,
          status: "paid" as const,
          network: "base-mainnet" as const,
          chainId: 8453,
          tokenSymbol: "USDC",
          tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          txHash: claimResult.txHash,
          explorerUrl: claimResult.explorerUrl
        };
      } else {
        settlement = await executeSettlement({
          amount: submission.prizeAmount!,
          receiverAddress: submission.walletAddress
        });
      }

      paid.push({
        submissionId: submission.id,
        payment: {
          id: crypto.randomUUID(),
          taskId,
          amount: settlement.amount,
          receiver: `@${submission.xHandle}`,
          receiverAddress: settlement.receiverAddress,
          payerAddress: settlement.payerAddress,
          method: settlement.method,
          status: settlement.status,
          idempotencyKey: `article_contest:${taskId}:${submission.id}`,
          source: "article_contest",
          network: settlement.network,
          chainId: settlement.chainId,
          tokenSymbol: settlement.tokenSymbol || DEFAULT_SETTLEMENT_TOKEN_SYMBOL,
          tokenAddress: settlement.tokenAddress,
          txHash: settlement.txHash,
          explorerUrl: settlement.explorerUrl,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("[ArticleContest] payout:settlement_error", {
        requestId,
        taskId,
        submissionId: submission.id,
        walletAddress: submission.walletAddress,
        prizeAmount: submission.prizeAmount,
        error: err instanceof Error ? err.message : "Settlement failed."
      });
      failed.push({
        submissionId: submission.id,
        walletAddress: submission.walletAddress,
        error: err instanceof Error ? err.message : "Settlement failed."
      });
    }
  }

  if (paid.length) {
    const now = new Date().toISOString();
    const payoutLog = {
      requestId,
      taskId,
      poolAddress: poolAddress || null,
      paid: paid.length,
      failed: failed.length,
      payments: paid.map((item) => ({
        submissionId: item.submissionId,
        amount: item.payment.amount,
        receiverAddress: item.payment.receiverAddress,
        method: item.payment.method,
        network: item.payment.network,
        txHash: item.payment.txHash
      })),
      failures: failed
    };
    console.info("[ArticleContest] payout:complete", payoutLog);
    await updateDb((nextDb) => {
      for (const item of paid) {
        const alreadyRecorded = nextDb.payments.some(
          (payment) =>
            payment.taskId === taskId &&
            payment.source === "article_contest" &&
            (payment.idempotencyKey === item.payment.idempotencyKey ||
              (payment.receiverAddress || "").toLowerCase() === (item.payment.receiverAddress || "").toLowerCase())
        );
        if (alreadyRecorded) continue;
        nextDb.payments.unshift(item.payment);
        const submission = nextDb.articleSubmissions.find((candidate) => candidate.id === item.submissionId);
        if (submission) {
          submission.status = "paid";
          submission.paymentTxHash = item.payment.txHash;
          submission.paymentExplorerUrl = item.payment.explorerUrl;
          submission.updatedAt = now;
        }
      }
      const escrow = nextDb.escrowDeposits.find((item) => item.taskId === taskId);
      if (escrow) {
        escrow.paidCount = (escrow.paidCount || 0) + paid.length;
        escrow.amountPaidOut = paid
          .reduce((sum, item) => sum + Number(item.payment.amount || 0), Number(escrow.amountPaidOut || 0))
          .toFixed(6);
        escrow.updatedAt = now;
      }
      const targetTask = nextDb.tasks.find((item) => item.id === taskId);
      if (targetTask) {
        targetTask.updatedAt = now;
        appendEvidence(targetTask, {
          by: "system",
          type: "log",
          content: `article_payout:${JSON.stringify(payoutLog)}`,
          createdAt: now
        });
      }
    });
  } else if (failed.length) {
    console.warn("[ArticleContest] payout:complete_no_payments", {
      requestId,
      taskId,
      failed
    });
  }

  return NextResponse.json(
    { success: failed.length === 0, requestId, paid: paid.length, failed },
    { status: failed.length ? 207 : 200 }
  );
}
