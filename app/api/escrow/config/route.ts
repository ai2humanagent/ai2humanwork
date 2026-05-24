import { NextResponse } from "next/server";
import { getEscrowWalletAddress, getEscrowBalance } from "../../../lib/escrowSettlement";

export const runtime = "nodejs";

/**
 * GET /api/escrow/config
 * Returns the escrow wallet address and status.
 * Agents should call USDC.approve(escrowAddress, maxAmount) before creating funded tasks.
 */
export async function GET() {
  const escrowWallet = getEscrowWalletAddress();
  const escrowBal = await getEscrowBalance();

  return NextResponse.json({
    escrowWallet,
    escrowTokenSymbol: escrowBal.symbol,
    escrowBalance: escrowBal.balance,
    configured: !!escrowWallet,
    instructions: escrowWallet
      ? `Call USDC.approve("${escrowWallet}", <maxAmount>) on Base mainnet before creating a funded task.`
      : "Set BASE_SETTLEMENT_PRIVATE_KEY env var to enable escrow."
  });
}
