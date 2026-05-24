import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  readDb,
  updateDb,
  type Task,
  type RewardDistribution,
  type RewardDistributionMode,
  type EscrowDeposit
} from "../../lib/store";
import { appendEvidence } from "../../lib/taskEvidence";
import { buildOfficialCampaignTask } from "../../lib/officialCampaignTasks.js";
import { sortTasksForBoard } from "../../lib/taskBoard.js";
import {
  executeEscrowDeposit,
  getEscrowWalletAddress,
  getEscrowAllowance,
  getEscrowBalance
} from "../../lib/escrowSettlement";

export const runtime = "nodejs";

const VALID_DISTRIBUTION_MODES: RewardDistributionMode[] = ["fcfs", "lucky_draw", "equal"];

function parseRewardDistribution(raw: unknown, fallbackBudget: string): RewardDistribution | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const mode = String(obj.mode || "").trim() as RewardDistributionMode;
  if (!VALID_DISTRIBUTION_MODES.includes(mode)) return undefined;
  return {
    mode,
    totalPool: String(obj.totalPool || fallbackBudget).trim(),
    perWinner: obj.perWinner ? String(obj.perWinner).trim() : undefined,
    maxWinners: Math.max(1, Math.floor(Number(obj.maxWinners) || 1)),
    drawTime: obj.drawTime ? String(obj.drawTime).trim() : undefined
  };
}

export async function GET() {
  const db = await readDb();
  return NextResponse.json(sortTasksForBoard(db.tasks));
}

export async function POST(request: Request) {
  const body = await request.json();
  const templateId = String(body.templateId || "").trim();
  const title = String(body.title || "").trim();
  const budget = String(body.budget || "").trim();
  const deadline = String(body.deadline || "").trim();
  const acceptance = String(body.acceptance || "").trim();
  const requesterName = String(body.requesterName || "").trim();
  const requesterHandle = String(body.requesterHandle || "").trim();
  const targetUrl = String(body.targetUrl || "").trim();
  const proofPhrase = String(body.proofPhrase || "").trim();
  const brief = String(body.brief || "").trim();
  const agentId = String(body.agentId || "").trim() || undefined;
  const depositAmount = body.depositAmount != null ? String(body.depositAmount).trim() : undefined;

  if (!title && !templateId) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const db = await readDb();

  // Validate agentId if provided
  const agent = agentId ? db.agents.find((a) => a.id === agentId) : null;
  if (agentId && !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 400 });
  }

  // If depositAmount is specified, agent must have a wallet address
  if (depositAmount && agent && !agent.walletAddress) {
    return NextResponse.json(
      { error: "Agent has no wallet address configured for escrow deposit." },
      { status: 400 }
    );
  }

  const escrowWalletAddress = getEscrowWalletAddress();
  let escrowDepositRecord: EscrowDeposit | null = null;
  let escrowDepositResult: Awaited<ReturnType<typeof executeEscrowDeposit>> | null = null;

  // Execute escrow deposit BEFORE creating the task
  if (depositAmount && agent && agent.walletAddress) {
    const result = await executeEscrowDeposit({
      agentAddress: agent.walletAddress,
      amount: depositAmount,
      taskId: "pending"
    });

    if (!result.ok) {
      // Escrow deposit failed — do NOT create unfunded task
      return NextResponse.json(
        { error: `Escrow deposit failed: ${result.error}` },
        { status: 400 }
      );
    }

    escrowDepositResult = result;
    escrowDepositRecord = {
      id: `escrow_${crypto.randomUUID().slice(0, 12)}`,
      taskId: "", // will be linked after task is created
      agentId: agent.id,
      agentWallet: agent.walletAddress,
      totalPool: depositAmount,
      amountPaidOut: "0",
      amountRefunded: "0",
      paidCount: 0,
      status: "active",
      depositTxHash: result.txHash,
      depositExplorerUrl: result.explorerUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const now = new Date().toISOString();
  const campaignTask = templateId
    ? buildOfficialCampaignTask({
        templateId,
        title: title || undefined,
        budget: budget || undefined,
        deadline: deadline || undefined,
        requesterName: requesterName || undefined,
        requesterHandle: requesterHandle || undefined,
        targetUrl: targetUrl || undefined,
        proofPhrase: proofPhrase || undefined,
        brief: brief || undefined
      })
    : null;

  const finalBudget = campaignTask?.budget || budget || "TBD";
  const rewardDistribution = parseRewardDistribution(body.rewardDistribution, finalBudget);

  const task: Task = {
    id: crypto.randomUUID(),
    title: campaignTask?.title || title,
    budget: finalBudget,
    deadline: campaignTask?.deadline || deadline || "TBD",
    acceptance: campaignTask?.acceptance || acceptance || "Provide evidence/logs",
    campaign: campaignTask?.campaign as Task["campaign"],
    agentId,
    rewardDistribution,
    status: "created" as const,
    taskState: "open" as const,
    createdAt: now,
    updatedAt: now,
    evidence: []
  };

  // Link escrow deposit to task (task is now defined)
  if (escrowDepositRecord) {
    escrowDepositRecord.taskId = task.id;
    task.escrowDepositId = escrowDepositRecord.id;

    appendEvidence(task, {
      by: "system",
      type: "note",
      content: `escrow_deposit: ${depositAmount} USDC transferred from ${agent!.walletAddress} to escrow ${escrowWalletAddress}. tx: ${escrowDepositResult!.txHash}`,
      createdAt: now
    });
  }

  appendEvidence(task, {
    by: "system",
    type: "log",
    content: `Task created: none -> created${escrowDepositRecord ? ` (escrow funded: ${escrowDepositRecord.totalPool} USDC)` : ""}`,
    createdAt: now
  });
  if (campaignTask?.campaign?.brief) {
    appendEvidence(task, {
      by: "system",
      type: "note",
      content: `campaign_brief: ${campaignTask.campaign.brief}`,
      createdAt: now
    });
  }

  await updateDb((db) => {
    if (escrowDepositRecord) {
      db.escrowDeposits.unshift(escrowDepositRecord);
    }
    db.tasks.unshift(task);
    if (agentId) {
      const ag = db.agents.find((a) => a.id === agentId);
      if (ag) ag.tasksPublished += 1;
    }
  });

  const response: Record<string, unknown> = { task };
  if (escrowDepositRecord) {
    response.escrowDeposit = {
      id: escrowDepositRecord.id,
      status: escrowDepositRecord.status,
      amountDeposited: escrowDepositRecord.totalPool,
      depositTxHash: escrowDepositRecord.depositTxHash,
      explorerUrl: escrowDepositRecord.depositExplorerUrl,
      escrowWallet: escrowWalletAddress
    };
  }

  return NextResponse.json(response, { status: 201 });
}
