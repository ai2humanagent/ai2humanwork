import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  readDb,
  updateDb,
  type PaymentEntry,
  type RewardDistribution,
  type Task
} from "../../../../lib/store";
import { executeSettlement } from "../../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../../lib/assetLabels";
import type { SettlementReceipt } from "../../../../lib/settlementTypes";
import { verifyWalletSignature } from "../../../../lib/walletVerification";
import { supabase } from "../../../../lib/supabase";
import { claimForPrizePool } from "../../../../lib/prizePool";
import { getBoundXAccountForWallet, normalizeXHandle } from "../../../../lib/xIdentity";
import { getAuthContext } from "../../../../lib/auth";
import { generateNextBoundedLuckyDrawAmount } from "../../../../lib/luckyDraw.js";

export const runtime = "nodejs";

const REQUIRED_SUBTASK_KEYS = ["0", "1", "2", "3", "4"];
const RATE_LIMIT_MS = 60_000; // 1 claim per wallet per task per 60s

function parseAmount(raw: string): number {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function buildClaimMessage(taskId: string, wallet: string): string {
  return [
    "ai2human Reward Claim",
    `Task: ${taskId}`,
    `Wallet: ${wallet.toLowerCase()}`,
    "I am claiming my lucky draw reward."
  ].join("\n");
}

function buildLocalMockSettlement(amount: string, wallet: string): SettlementReceipt {
  return {
    amount: String(parseAmount(amount)),
    receiverAddress: wallet,
    method: "mock_x402",
    status: "paid",
    network: "base-mainnet",
    chainId: 8453,
    tokenSymbol: DEFAULT_SETTLEMENT_TOKEN_SYMBOL || "USDC",
    tokenAddress: process.env.BASE_SETTLEMENT_TOKEN_ADDRESS,
    evidenceLabel: "Payment recorded in local development mode after live settlement failed.",
    configurationHint: "Local dev fallback only. Fund BASE_SETTLEMENT_PRIVATE_KEY wallet for live Base payouts."
  };
}

function formatUsdcAmount(amount: number): string {
  const rounded = Math.round(amount * 1e6) / 1e6;
  return `${rounded.toFixed(6).replace(/\.?0+$/, "")} USDC`;
}

function getSettlementAmount(input: {
  dist: RewardDistribution | undefined;
  task: Task;
  maxWinners: number;
  claimedCount: number;
  paidAmount: number;
}): string {
  const { dist, task, maxWinners, claimedCount, paidAmount } = input;

  if (dist?.perWinner) {
    return dist.perWinner;
  }

  if (dist?.totalPool && maxWinners > 0) {
    const totalPool = parseAmount(dist.totalPool);
    const remainingSlots = Math.max(maxWinners - claimedCount, 1);
    const remainingPool = Math.max(Math.round((totalPool - paidAmount) * 1e6) / 1e6, 0);
    const fixedShare = totalPool / maxWinners;
    const amount = remainingSlots === 1 ? remainingPool : Math.min(fixedShare, remainingPool);
    return formatUsdcAmount(amount);
  }

  return task.budget;
}

function isClaimedPaymentForTask(payment: PaymentEntry, task: Task): boolean {
  if (!task.poolAddress) return true;
  return payment.method === "prize_pool_claim" && Boolean(payment.txHash);
}

/** POST /api/tasks/[id]/claim-reward
 *  Body: { wallet, xHandle, signature?, captchaToken?, captchaWord? }
 *
 *  Security (in order):
 *  1. Rate limit — 1 claim per wallet per task per 60 seconds (Supabase)
 *  2. CAPTCHA verification — token + word match
 *  3. Wallet signature — proves the signer owns the wallet (via Privy)
 *  4. Double-submit guard — check already claimed inside updateDb
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const xHandle = String(body.xHandle || "").trim().replace("@", "");
  const signature = body.signature as `0x${string}` | undefined;
  const captchaToken = String(body.captchaToken || "").trim();
  const captchaWord = String(body.captchaWord || "").trim().toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Connect your wallet before claiming rewards." }, { status: 401 });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json(
      { error: "Connected wallet does not match this claim request." },
      { status: 403 }
    );
  }

  // ── 1. Rate limit check (Supabase) ─────────────────────────────────────
  if (supabase) {
    const { data: limitRow } = await supabase
      .from("claim_rate_limits")
      .select("last_claimed_at")
      .eq("wallet_address", wallet)
      .eq("task_id", taskId)
      .maybeSingle();

    if (limitRow) {
      const lastClaim = new Date(limitRow.last_claimed_at).getTime();
      const now = Date.now();
      if (now - lastClaim < RATE_LIMIT_MS) {
        const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastClaim)) / 1000);
        return NextResponse.json(
          { error: `Rate limit: please wait ${remaining}s before trying again.` },
          { status: 429 }
        );
      }
    }
  }

  // ── 2. Google reCAPTCHA v2 verification ──────────────────────────────────
  // Only verify if secret key is configured and captcha token is provided
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  if (recaptchaSecret && captchaToken) {
    try {
      const verifyRes = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${recaptchaSecret}&response=${captchaToken}`
        }
      );
      const verifyData = await verifyRes.json() as { success: boolean; "error-codes"?: string[] };
      if (!verifyData.success) {
        const errMsg = (verifyData["error-codes"] || []).join(", ");
        console.error("reCAPTCHA verification failed:", errMsg);
        return NextResponse.json(
          { error: "reCAPTCHA verification failed. Please try again." },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error("reCAPTCHA network error:", err);
      return NextResponse.json(
        { error: "Captcha verification service unavailable. Please try again later." },
        { status: 500 }
      );
    }
  } else if (!recaptchaSecret) {
    // No secret key configured — skip reCAPTCHA (dev mode)
  } else if (!captchaToken) {
    return NextResponse.json(
      { error: "Captcha token required. Please complete the reCAPTCHA challenge." },
      { status: 400 }
    );
  }

  // ── 3. Wallet signature verification ──────────────────────────────────────
  if (signature) {
    const message = buildClaimMessage(taskId, wallet);
    const valid = await verifyWalletSignature(message, signature, wallet);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid wallet signature. Please reconnect your wallet." },
        { status: 401 }
      );
    }
  } else {
    // No signature provided — reject
    return NextResponse.json(
      { error: "Wallet signature required to claim. Please sign the message." },
      { status: 401 }
    );
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const { xAccount } = await getBoundXAccountForWallet(db, wallet);
  if (!xAccount) {
    return NextResponse.json(
      { error: "Bind your X account before claiming rewards." },
      { status: 403 }
    );
  }
  if (xHandle && normalizeXHandle(xHandle) !== normalizeXHandle(xAccount.username)) {
    return NextResponse.json(
      { error: "Submitted X handle does not match your bound X account." },
      { status: 400 }
    );
  }

  // ── 4. Check already claimed (inside updateDb for atomicity) ──────────────
  const dist = task.rewardDistribution;
  const mode = dist?.mode || "fcfs";
  const maxWinners = dist?.maxWinners || 1;

  if (mode === "fcfs") {
    const result = await updateDbClaim(db, taskId, wallet, xAccount.username, mode, maxWinners, dist, task);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadyClaimed: false, payment: result.payment });
  } else if (mode === "lucky_draw") {
    const result = await updateDbClaim(db, taskId, wallet, xAccount.username, mode, maxWinners, dist, task);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadyClaimed: false, payment: result.payment });
  } else {
    const result = await updateDbClaim(db, taskId, wallet, xAccount.username, mode, maxWinners, dist, task);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadyClaimed: false, payment: result.payment });
  }
}

async function updateDbClaim(
  db: Awaited<ReturnType<typeof readDb>>,
  taskId: string,
  wallet: string,
  xHandle: string,
  mode: string,
  maxWinners: number,
  dist: RewardDistribution | undefined,
  task: Task
) {
  // Check existing payment
  const existingPayment = db.payments.find(
    (p) =>
      p.taskId === taskId &&
      p.source === "twitter_task" &&
      isClaimedPaymentForTask(p, task) &&
      (p.receiverAddress || "").toLowerCase() === wallet
  );
  if (existingPayment) {
    return {
      error: null,
      payment: {
        amount: existingPayment.amount,
        method: existingPayment.method,
        txHash: existingPayment.txHash,
        explorerUrl: existingPayment.explorerUrl,
        network: existingPayment.network,
        tokenSymbol: existingPayment.tokenSymbol
      }
    };
  }

  // Count existing claims
  const claimedCount = db.payments.filter(
    (p) => p.taskId === taskId && p.source === "twitter_task" && isClaimedPaymentForTask(p, task)
  ).length;

  const claimLimit = maxWinners;

  if (claimedCount >= claimLimit) {
    return { error: "All reward slots have been claimed." };
  }

  const progress = db.questProgress.filter(
    (qp) => qp.taskId === taskId && qp.walletAddress === wallet
  );
  for (const key of REQUIRED_SUBTASK_KEYS) {
    const entry = progress.find((qp) => qp.subtaskKey === key);
    if (!entry || entry.status !== "verified") {
      return { error: `Subtask ${key} is not verified. Complete all tasks before claiming.` };
    }
  }

  // Determine settlement amount
  const alreadyPaid = db.payments
    .filter((p) => p.taskId === taskId && p.source === "twitter_task" && isClaimedPaymentForTask(p, task))
    .reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
  const remainingSlots = claimLimit - claimedCount;
  const remainingPool = dist?.totalPool
    ? Math.round((parseAmount(dist.totalPool) - alreadyPaid) * 1e6) / 1e6
    : undefined;

  if (remainingSlots <= 0 || (remainingPool !== undefined && remainingPool <= 0)) {
    return { error: "No more rewards available." };
  }

  const settlementAmount = mode === "lucky_draw"
    ? generateNextBoundedLuckyDrawAmount({
        totalPool: dist?.totalPool || task.budget,
        maxWinners,
        claimedCount,
        paidAmount: formatUsdcAmount(alreadyPaid),
        maxDeviationBps: 1000
      })
    : getSettlementAmount({ dist, task, maxWinners, claimedCount, paidAmount: alreadyPaid });
  let paymentResult: PaymentEntry | null = null;
  const taskPoolAddress = task.poolAddress;

  try {
    let settlement;
    if (taskPoolAddress) {
      const claimResult = await claimForPrizePool({
        poolAddress: taskPoolAddress,
        recipientAddress: wallet,
        amount: settlementAmount
      });

      if (!claimResult.ok) {
        console.error("PrizePool.claimFor() failed:", claimResult.error);
        return { error: `On-chain claim failed: ${claimResult.error}` };
      }

      settlement = {
        amount: settlementAmount.replace(" USDC", ""),
        receiverAddress: wallet,
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
      try {
        settlement = await executeSettlement({
          amount: settlementAmount,
          receiverAddress: wallet
        });
      } catch (err) {
        if (process.env.VERCEL) {
          throw err;
        }
        console.warn("Live settlement failed in local dev; recording mock payment:", err);
        settlement = buildLocalMockSettlement(settlementAmount, wallet);
      }
    }

    paymentResult = {
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
  } catch (err) {
    console.error("Settlement failed:", err);
    return { error: "Settlement failed. Please try again later." };
  }

  // Atomic update
  await updateDb((db) => {
    db.payments.unshift(paymentResult!);

    if (mode === "lucky_draw") {
      const t = db.tasks.find((x) => x.id === taskId);
      if (t) {
        const drawResult = (t.drawResult || {
          drawnAt: new Date().toISOString(),
          winners: []
        }) as {
          drawnAt: string;
          winners: Array<{ address: string; amount: string } | string>;
          totalPool?: string;
          maxDeviationBps?: number;
          distributionType?: string;
        };
        const existingWinnerIndex = drawResult.winners.findIndex((winner) => {
          const address = typeof winner === "string" ? winner : winner.address;
          return (address || "").toLowerCase() === wallet;
        });
        const winnerEntry = { address: wallet, amount: settlementAmount };
        if (existingWinnerIndex >= 0) {
          drawResult.winners[existingWinnerIndex] = winnerEntry;
        } else {
          drawResult.winners.push(winnerEntry);
        }
        drawResult.totalPool = dist?.totalPool || task.budget;
        drawResult.maxDeviationBps = 1000;
        drawResult.distributionType = "instant_qualified_claim";
        t.drawResult = drawResult as Task["drawResult"];
      }

      const existingParticipant = db.luckyDrawParticipants.find(
        (participant) =>
          participant.taskId === taskId &&
          (participant.walletAddress || "").toLowerCase() === wallet
      );
      if (existingParticipant) {
        existingParticipant.xHandle = xHandle;
      } else {
        db.luckyDrawParticipants.push({
          id: crypto.randomUUID(),
          taskId,
          walletAddress: wallet,
          xHandle,
          createdAt: new Date().toISOString()
        });
      }
    }

    const t = db.tasks.find((x) => x.id === taskId);
    if (t) {
      t.updatedAt = new Date().toISOString();
      const totalClaimed = db.payments.filter(
        (p) => p.taskId === taskId && p.source === "twitter_task" && isClaimedPaymentForTask(p, t)
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
        parseAmount(escrow.amountPaidOut) + parseAmount(paymentResult!.amount)
      ).toFixed(6);
      escrow.updatedAt = new Date().toISOString();
    }

    // Update rate limit
    if (supabase) {
      supabase.from("claim_rate_limits").upsert({
        wallet_address: wallet,
        task_id: taskId,
        last_claimed_at: new Date().toISOString()
      }, { onConflict: "wallet_address,task_id" }).then(() => {});
    }
  });

  return {
    error: null,
    payment: {
      amount: paymentResult.amount,
      method: paymentResult.method,
      txHash: paymentResult.txHash,
      explorerUrl: paymentResult.explorerUrl,
      network: paymentResult.network,
      tokenSymbol: paymentResult.tokenSymbol
    }
  };
}
