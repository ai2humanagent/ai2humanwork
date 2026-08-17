import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { isAddress } from "viem";
import {
  sendRequesterWalletA2h,
  sendRequesterWalletNative,
  sendRequesterWalletUsdc
} from "../../../lib/requesterWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/x-wallet/withdraw
 * Withdraw ETH / A2H / USDC from the authenticated user's Privy embedded
 * wallet to an external address on Base.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const asset = String(body.asset || "eth").trim().toLowerCase();
  const recipient = String(body.recipient || "").trim().toLowerCase();
  const amount = String(body.amount || "").trim();

  if (!isAddress(recipient)) {
    return NextResponse.json({ error: "Enter a valid withdrawal address." }, { status: 400 });
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Enter a valid withdrawal amount." }, { status: 400 });
  }
  if (!["eth", "a2h", "usdc"].includes(asset)) {
    return NextResponse.json({ error: "Asset must be eth, a2h, or usdc." }, { status: 400 });
  }

  const idempotencyKey = `withdraw:${auth.user.id}:${asset}:${recipient}:${amount}:${Date.now()}`;

  const result =
    asset === "eth"
      ? await sendRequesterWalletNative({
          user: auth.user,
          recipient,
          amount,
          idempotencyKey
        })
      : asset === "a2h"
        ? await sendRequesterWalletA2h({
            user: auth.user,
            recipient,
            amount,
            idempotencyKey
          })
        : await sendRequesterWalletUsdc({
            user: auth.user,
            recipient,
            amount,
            idempotencyKey
          });

  if (!result.ok) {
    const balanceHint = "balance" in result && "required" in result
      ? ` Balance: ${result.balance} ${asset.toUpperCase()}. Required: ${result.required}.`
      : "";
    return NextResponse.json({ error: result.error + balanceHint }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    asset,
    amount: result.amount,
    from: result.from,
    to: result.to,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    gasPayment: "gasPayment" in result ? result.gasPayment : undefined
  });
}
