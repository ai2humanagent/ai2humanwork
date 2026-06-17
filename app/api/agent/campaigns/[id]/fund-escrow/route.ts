import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb } from "../../../../../lib/store";
import { executeEscrowDeposit, getEscrowWalletAddress } from "../../../../../lib/escrowSettlement";
import { requireAgentCampaignAuth } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id);
  if (!task) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (task.campaign?.fundingMode !== "escrow_deposit") {
    return NextResponse.json({ error: "Campaign does not use escrow_deposit funding." }, { status: 400 });
  }
  if (task.escrowDepositId) {
    return NextResponse.json({ error: "Campaign already has an escrow deposit.", escrowDepositId: task.escrowDepositId }, { status: 409 });
  }

  const fundingPlan = task.campaign?.agentLifecycle?.fundingPlan || {};
  const agentId = String(body.agentId || task.agentId || "").trim();
  const depositAmount = String(body.depositAmount || fundingPlan.depositAmount || task.rewardDistribution?.totalPool || task.budget || "").trim();
  const agent = db.agents.find((item) => item.id === agentId);
  if (!agent?.walletAddress) {
    return NextResponse.json({ error: "A registered agent with walletAddress is required for escrow funding." }, { status: 400 });
  }

  const deposit = await executeEscrowDeposit({
    agentAddress: agent.walletAddress,
    amount: depositAmount,
    taskId: id
  });
  if (!deposit.ok) {
    return NextResponse.json({ error: deposit.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const escrowDeposit = {
    id: `escrow_${crypto.randomUUID().slice(0, 12)}`,
    taskId: id,
    agentId: agent.id,
    agentWallet: agent.walletAddress,
    totalPool: deposit.amount,
    amountPaidOut: "0",
    amountRefunded: "0",
    paidCount: 0,
    status: "active" as const,
    depositTxHash: deposit.txHash,
    depositExplorerUrl: deposit.explorerUrl,
    createdAt: now,
    updatedAt: now
  };

  await updateDb((draft) => {
    const current = draft.tasks.find((item) => item.id === id);
    if (!current) throw new Error("Campaign disappeared during escrow funding.");
    draft.escrowDeposits.unshift(escrowDeposit);
    current.escrowDepositId = escrowDeposit.id;
    current.updatedAt = now;
    current.evidence.unshift({
      id: crypto.randomUUID(),
      by: "system",
      type: "note",
      content: `escrow_deposit: ${deposit.amount} USDC transferred from ${agent.walletAddress} to escrow ${getEscrowWalletAddress()}. tx: ${deposit.txHash}`,
      createdAt: now
    });
    current.campaign = {
      ...current.campaign!,
      agentLifecycle: {
        ...current.campaign?.agentLifecycle,
        fundingPlan: {
          ...(current.campaign?.agentLifecycle?.fundingPlan || {}),
          escrowDepositId: escrowDeposit.id,
          depositTxHash: deposit.txHash,
          depositExplorerUrl: deposit.explorerUrl
        }
      }
    };
  });

  return NextResponse.json({ success: true, escrowDeposit });
}
