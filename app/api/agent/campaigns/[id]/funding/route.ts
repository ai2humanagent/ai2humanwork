import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  readDb,
  updateDb,
  type Task
} from "../../../../../lib/store";
import {
  attachManagedPrizePool,
  buildFundingInvoice,
  expectedPayoutTotal,
  isUsablePoolAddress,
  readFundingPlan,
  runAgentCampaignContractPreflight
} from "../../../../../lib/agentCampaignProtocol.js";
import { getPrizePoolCampaignAddress } from "../../../../../lib/prizePool";
import { requireAgentCampaignAuth } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readLifecycle(task: Task) {
  const campaign = readObject(task.campaign);
  return campaign.agentLifecycle && typeof campaign.agentLifecycle === "object"
    ? campaign.agentLifecycle as Record<string, unknown>
    : {};
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function buildFundingInput(task: Task, id: string, body: Record<string, unknown> = {}) {
  const campaign = readObject(task.campaign);
  const lifecycle = readLifecycle(task);
  const existingPlan = readObject(lifecycle.fundingPlan);
  const managedPool = readObject(existingPlan.managedPool);
  return {
    ...body,
    taskId: id,
    budget: task.budget,
    deadline: task.deadline,
    fundingMode: body.fundingMode || campaign.fundingMode || existingPlan.fundingMode,
    environment: body.environment || campaign.environment || existingPlan.environment,
    poolAddress:
      body.poolAddress ||
      task.poolAddress ||
      campaign.poolAddress ||
      existingPlan.poolAddress,
    expectedAgent: body.expectedAgent || managedPool.expectedAgent
  };
}

function buildFundingStatus(
  task: Task,
  input: Record<string, unknown>,
  contractPreflight: Record<string, unknown>
) {
  const lifecycle = readLifecycle(task);
  const existingPlan = readObject(lifecycle.fundingPlan);
  const calculatedPlan = readFundingPlan(input, task.rewardDistribution);
  const poolAddress = String(
    calculatedPlan.poolAddress ||
      task.poolAddress ||
      task.campaign?.poolAddress ||
      existingPlan.poolAddress ||
      ""
  ).trim();
  const usablePool = isUsablePoolAddress(poolAddress);
  const existingInvoice = readObject(existingPlan.fundingInvoice);
  const fundingInvoice = usablePool
    ? Object.keys(existingInvoice).length
      ? existingInvoice
      : buildFundingInvoice({
          poolAddress,
          amount: expectedPayoutTotal(input, task.rewardDistribution)
        })
    : undefined;
  const lifecycleStatus = String(lifecycle.status || "").trim();
  const alreadyPublished = lifecycleStatus === "published";
  const readyToPublish = !alreadyPublished && Boolean(contractPreflight.ok);
  const slotsLeft = Number(contractPreflight.slotsLeft);
  const status = !usablePool
    ? "pool_missing_or_invalid"
    : alreadyPublished
      ? Number.isFinite(slotsLeft) && slotsLeft <= 0
        ? "published_full"
        : "published_active"
      : readyToPublish
        ? "funded_ready_to_publish"
        : "awaiting_usdc_transfer";
  const responsePreflight = alreadyPublished
    ? {
        ...contractPreflight,
        ok: true,
        status,
        issues: []
      }
    : contractPreflight;

  return {
    taskId: task.id,
    fundingMode: calculatedPlan.fundingMode,
    environment: calculatedPlan.environment,
    status,
    alreadyPublished,
    readyToPublish,
    poolAddress: usablePool ? poolAddress : undefined,
    fundingInvoice,
    invalidFundingInvoice: usablePool ? undefined : existingInvoice,
    contractPreflight: responsePreflight,
    nextAction: alreadyPublished
      ? Number.isFinite(slotsLeft) && slotsLeft <= 0
        ? "Campaign is published and all reward slots are claimed."
        : "Campaign is published. No funding action is required unless you intentionally want to top up the pool."
      : readyToPublish
      ? `POST /api/agent/campaigns/${task.id}/publish`
      : usablePool
        ? `Transfer ${expectedPayoutTotal(input, task.rewardDistribution)} to fundingInvoice.recipientAddress on Base, then call POST /api/agent/campaigns/${task.id}/funding again.`
        : `POST /api/agent/campaigns/${task.id}/funding to create or repair the managed PrizePool.`
  };
}

async function readCampaignOr404(id: string) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id);
  return { db, task };
}

async function recoverManagedPoolAddress(task: Task) {
  const lifecycle = readLifecycle(task);
  const existingPlan = readObject(lifecycle.fundingPlan);
  const managedPool = readObject(existingPlan.managedPool);
  const campaignId = Number(managedPool.campaignId);
  const txHash = typeof managedPool.createTxHash === "string" ? managedPool.createTxHash : "";
  if (!Number.isFinite(campaignId) || campaignId <= 0) return null;
  const recovered = await getPrizePoolCampaignAddress({ campaignId, txHash });
  return recovered.ok ? recovered : null;
}

function applyRecoveredManagedPool(task: Task, recovered: {
  campaignId: number;
  poolAddress: string;
  txHash?: string;
  explorerUrl?: string;
}) {
  const lifecycle = readLifecycle(task);
  const existingPlan = readObject(lifecycle.fundingPlan);
  const existingManagedPool = readObject(existingPlan.managedPool);
  const fundingInvoice = buildFundingInvoice({
    poolAddress: recovered.poolAddress,
    amount: expectedPayoutTotal({ budget: task.budget }, task.rewardDistribution)
  });

  return {
    ...task,
    poolAddress: recovered.poolAddress,
    updatedAt: new Date().toISOString(),
    campaign: {
      ...task.campaign!,
      poolAddress: recovered.poolAddress,
      agentLifecycle: {
        ...task.campaign?.agentLifecycle,
        fundingPlan: {
          ...existingPlan,
          poolAddress: recovered.poolAddress,
          canSettleNow: true,
          managedPool: {
            ...existingManagedPool,
            campaignId: recovered.campaignId,
            poolAddress: recovered.poolAddress,
            createTxHash: recovered.txHash || existingManagedPool.createTxHash,
            createExplorerUrl: recovered.explorerUrl || existingManagedPool.createExplorerUrl
          },
          fundingInvoice
        }
      }
    },
    evidence: [
      {
        id: crypto.randomUUID(),
        by: "system",
        type: "log",
        content: `managed_prize_pool_recovered: campaignId=${recovered.campaignId} pool=${recovered.poolAddress} tx=${recovered.txHash || "unknown"}`,
        createdAt: new Date().toISOString()
      },
      ...(task.evidence || [])
    ]
  } as Task;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { db, task } = await readCampaignOr404(id);
  if (!task) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const input = buildFundingInput(task, id, body);
  const contractPreflight = await runAgentCampaignContractPreflight(db, input, task.rewardDistribution);
  return NextResponse.json(buildFundingStatus(task, input, contractPreflight));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { db, task } = await readCampaignOr404(id);
  if (!task) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (task.campaign?.agentLifecycle?.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft agent campaigns can create or repair managed funding." },
      { status: 400 }
    );
  }

  const input = buildFundingInput(task, id, body);
  let currentTask = task;
  const fundingPlan = readFundingPlan(input, task.rewardDistribution);
  if (fundingPlan.fundingMode !== "ai2human_managed_pool") {
    const contractPreflight = await runAgentCampaignContractPreflight(db, input, task.rewardDistribution);
    return NextResponse.json(buildFundingStatus(currentTask, input, contractPreflight));
  }

  if (!isUsablePoolAddress(String(fundingPlan.poolAddress || ""))) {
    const recovered = await recoverManagedPoolAddress(task);
    if (recovered) {
      currentTask = applyRecoveredManagedPool(task, recovered);
    } else {
      const lifecycle = readLifecycle(task);
      const managed = await attachManagedPrizePool(db, input, task, {
        readyToCreate: true,
        readyToPublish: false,
        fundingPlan: lifecycle.fundingPlan,
        contractPreflight: lifecycle.contractPreflight,
        winnerDistribution: lifecycle.winnerDistribution,
        missingInputs: lifecycle.missingInputs,
        nextQuestions: lifecycle.nextQuestions
      });
      currentTask = managed.task as Task;
    }
    await updateDb((draft) => {
      const index = draft.tasks.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Campaign disappeared during funding update.");
      draft.tasks[index] = currentTask;
    });
  }

  const updatedInput = buildFundingInput(currentTask, id, body);
  const contractPreflight = await runAgentCampaignContractPreflight(db, updatedInput, currentTask.rewardDistribution);
  return NextResponse.json(buildFundingStatus(currentTask, updatedInput, contractPreflight));
}
