import { NextResponse } from "next/server";
import { readDb } from "../../../../lib/store";
import { getEscrowWalletAddress, getEscrowBalance } from "../../../../lib/escrowSettlement";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const escrowDeposit = db.escrowDeposits.find((e) => e.taskId === params.id);

  if (!escrowDeposit) {
    return NextResponse.json({ error: "No escrow deposit found for this task." }, { status: 404 });
  }

  // Calculate remaining balance
  const parseAmount = (raw: string): number => {
    const match = String(raw || "0").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const total = parseAmount(escrowDeposit.totalPool);
  const paidOut = parseAmount(escrowDeposit.amountPaidOut);
  const refunded = parseAmount(escrowDeposit.amountRefunded);
  const remaining = Math.max(0, total - paidOut - refunded);

  const escrowWallet = getEscrowWalletAddress();
  const escrowBal = await getEscrowBalance();

  return NextResponse.json({
    escrowDeposit,
    escrowWallet,
    remainingBalance: remaining.toFixed(6).replace(/\.?0+$/, ""),
    totalPool: escrowDeposit.totalPool,
    amountPaidOut: escrowDeposit.amountPaidOut,
    amountRefunded: escrowDeposit.amountRefunded,
    status: escrowDeposit.status,
    escrowWalletBalance: escrowBal.balance
  });
}
