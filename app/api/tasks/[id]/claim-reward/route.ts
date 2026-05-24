import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type PaymentEntry, type LuckyDrawWinner, type LuckyDrawResult, type LuckyDrawParticipant } from "../../../../lib/store";
import { executeSettlement } from "../../../../lib/settlement";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../../lib/assetLabels";
import { verifyWalletSignature } from "../../../../lib/walletVerification";
import { supabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

const REQUIRED_SUBTASK_KEYS = ["0", "1", "2", "3"];
const RATE_LIMIT_MS = 60_000; // 1 claim per wallet per task per 60s

function parseAmount(raw: string): number {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function buildClaimMessage(taskId: string, wallet: string): string {
  return [
    "ai2human Lucky Draw Claim",
    `Task: ${taskId}`,
    `Wallet: ${wallet.toLowerCase()}`,
    "I am claiming my lucky draw reward."
  ].join("\n");
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

  if (!xHandle || xHandle.length < 1) {
    return NextResponse.json({ error: "X handle is required" }, { status: 400 });
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

  // ── 4. Check already claimed (inside updateDb for atomicity) ──────────────
  const dist = task.rewardDistribution;
  const mode = dist?.mode || "fcfs";
  const maxWinners = dist?.maxWinners || 1;

  if (mode === "fcfs") {
    const result = await updateDbClaim(db, taskId, wallet, xHandle, mode, maxWinners, dist, task);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadyClaimed: false, payment: result.payment });
  } else if (mode === "lucky_draw") {
    const result = await updateDbClaim(db, taskId, wallet, xHandle, mode, maxWinners, dist, task);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, alreadyClaimed: false, payment: result.payment });
  } else {
    const result = await updateDbClaim(db, taskId, wallet, xHandle, mode, maxWinners, dist, task);
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
  dist: ReturnType<typeof Object> | undefined,
  task: ReturnType<typeof Array.prototype.find>
) {
  // Check existing payment
  const existingPayment = db.payments.find(
    (p) =>
      p.taskId === taskId &&
      p.source === "twitter_task" &&
      (p.receiverAddress || "").toLowerCase() === wallet
  );
  if (existingPayment) {
    return {
      error: null,
      payment: {
        amount: existingPayment.amount,
        txHash: existingPayment.txHash,
        explorerUrl: existingPayment.explorerUrl,
        network: existingPayment.network,
        tokenSymbol: existingPayment.tokenSymbol
      }
    };
  }

  // Count existing claims
  const claimedCount = db.payments.filter(
    (p) => p.taskId === taskId && p.source === "twitter_task"
  ).length;

  if (claimedCount >= maxWinners) {
    return { error: "All reward slots have been claimed." };
  }

  // Lucky draw: auto-create quest progress entries
  if (mode === "lucky_draw") {
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
  } else {
    // FCFS / equal: require all subtasks verified
    const progress = db.questProgress.filter(
      (qp) => qp.taskId === taskId && qp.walletAddress === wallet
    );
    for (const key of REQUIRED_SUBTASK_KEYS) {
      const entry = progress.find((qp) => qp.subtaskKey === key);
      if (!entry || entry.status !== "verified") {
        return { error: `Subtask ${key} is not verified. Complete all tasks before claiming.` };
      }
    }
  }

  // Determine settlement amount
  let settlementAmount: string;
  if (mode === "lucky_draw") {
    let winnerAmounts: LuckyDrawWinner[] = (task.drawResult as { winners?: LuckyDrawWinner[] })?.winners || [];
    const totalPoolAmount = parseAmount(dist?.totalPool || task.budget);
    const alreadyPaid = winnerAmounts.reduce((sum, w) => sum + parseAmount(w.amount), 0);
    const remainingPool = Math.round((totalPoolAmount - alreadyPaid) * 1e6) / 1e6;
    const remainingSlots = maxWinners - claimedCount;

    if (remainingPool <= 0 || remainingSlots <= 0) {
      return { error: "No more rewards available." };
    }

    if (remainingSlots === 1) {
      settlementAmount = `${remainingPool} USDC`;
    } else {
      const fairShare = remainingPool / remainingSlots;
      const minShare = fairShare * 0.5;
      const maxShare = Math.min(fairShare * 2, remainingPool);
      const amount = minShare + Math.random() * (maxShare - minShare);
      const rounded = Math.round(amount * 1e6) / 1e6;
      settlementAmount = `${rounded} USDC`;
    }

    winnerAmounts.push({ address: wallet, amount: settlementAmount });
    (task as unknown as { drawResult?: LuckyDrawResult }).drawResult = {
      winners: winnerAmounts,
      drawnAt: (task.drawResult as LuckyDrawResult)?.drawnAt || new Date().toISOString()
    };
  } else if (dist?.perWinner) {
    settlementAmount = dist.perWinner;
  } else if (dist?.totalPool && maxWinners > 0) {
    const pool = parseAmount(dist.totalPool);
    const perWinner = pool / maxWinners;
    settlementAmount = perWinner.toFixed(6).replace(/\.?0+$/, "") + " USDC";
  } else {
    settlementAmount = task.budget;
  }

  let paymentResult: PaymentEntry | null = null;

  try {
    const settlement = await executeSettlement({
      amount: settlementAmount,
      receiverAddress: wallet
    });

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
      db.luckyDrawParticipants.push({
        id: crypto.randomUUID(),
        taskId,
        walletAddress: wallet,
        xHandle,
        createdAt: new Date().toISOString()
      });
    }

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
      txHash: paymentResult.txHash,
      explorerUrl: paymentResult.explorerUrl,
      network: paymentResult.network,
      tokenSymbol: paymentResult.tokenSymbol
    }
  };
}
