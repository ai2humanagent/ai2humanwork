import { NextResponse } from "next/server";
import { readDb, updateDb } from "../../../../lib/store";
import { executeEscrowRefund } from "../../../../lib/escrowSettlement";
import { appendEvidence } from "../../../../lib/taskEvidence";

export const runtime = "nodejs";

function parseAmount(raw: string): number {
  const match = String(raw || "0").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * POST /api/tasks/[id]/refund
 * Refund the remaining escrow balance to the agent after task deadline passes.
 * Also supports manual refund for any reason.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = String(body.reason || "manual").trim();

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === params.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const escrowDeposit = db.escrowDeposits.find((e) => e.taskId === params.id);
  if (!escrowDeposit) {
    return NextResponse.json({ error: "No escrow deposit found for this task." }, { status: 404 });
  }

  if (escrowDeposit.status === "refunded") {
    return NextResponse.json({ error: "Escrow has already been fully refunded." }, { status: 400 });
  }

  if (escrowDeposit.status === "failed") {
    return NextResponse.json({ error: "Escrow deposit failed, cannot refund." }, { status: 400 });
  }

  const agent = db.agents.find((a) => a.id === escrowDeposit.agentId);
  if (!agent || !agent.walletAddress) {
    return NextResponse.json({ error: "Agent not found or has no wallet address." }, { status: 400 });
  }

  // Calculate remaining balance
  const total = parseAmount(escrowDeposit.totalPool);
  const paidOut = parseAmount(escrowDeposit.amountPaidOut);
  const refunded = parseAmount(escrowDeposit.amountRefunded);
  const remaining = Math.max(0, total - paidOut - refunded);

  if (remaining <= 0) {
    return NextResponse.json({ error: "No remaining balance to refund." }, { status: 400 });
  }

  // Execute refund on-chain
  const result = await executeEscrowRefund({
    agentAddress: agent.walletAddress,
    amount: remaining.toFixed(6),
    taskId: params.id
  });

  if (!result.ok) {
    return NextResponse.json({ error: `Refund failed: ${result.error}` }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Update escrow deposit record
  await updateDb((db) => {
    const deposit = db.escrowDeposits.find((e) => e.id === escrowDeposit.id);
    if (deposit) {
      deposit.amountRefunded = (refunded + remaining).toFixed(6);
      deposit.status = "refunded";
      deposit.refundTxHash = result.txHash;
      deposit.refundExplorerUrl = result.explorerUrl;
      deposit.updatedAt = now;
    }

    const t = db.tasks.find((x) => x.id === params.id);
    if (t) {
      appendEvidence(t, {
        by: "system",
        type: "log",
        content: `escrow_refund: ${remaining.toFixed(2)} USDC refunded to agent ${agent!.walletAddress}. tx: ${result.txHash}. reason: ${reason}`,
        createdAt: now
      });
      t.updatedAt = now;
      t.taskState = "refunded";
    }
  });

  return NextResponse.json({
    success: true,
    amountRefunded: remaining.toFixed(6),
    refundTxHash: result.txHash,
    explorerUrl: result.explorerUrl,
    to: agent.walletAddress,
    reason
  });
}
