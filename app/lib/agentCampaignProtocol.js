import crypto from "crypto";
import { buildAgentTaskPreview, parseRewardDistribution, readFundingPlan } from "./agentTaskPreview.js";
import { buildOfficialCampaignTask } from "./officialCampaignTasks.js";

export { readFundingPlan } from "./agentTaskPreview.js";

function readString(value) {
  return String(value || "").trim();
}

function parseAmount(raw) {
  const match = String(raw || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isUsablePoolAddress(value) {
  const text = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(text) && text !== ZERO_ADDRESS;
}

function parseDeadlineUnix(raw) {
  const value = readString(raw);
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) return Math.floor(timestamp / 1000);
  const fallback = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return Math.floor(fallback / 1000);
}

function createNumericCampaignId() {
  return Math.floor(Date.now() / 1000) * 1000 + crypto.randomInt(100, 999);
}

export function buildFundingInvoice(input = {}) {
  const poolAddress = readString(input.poolAddress);
  if (!isUsablePoolAddress(poolAddress)) {
    throw new Error("Cannot build funding invoice without a real PrizePool recipient address.");
  }
  const amount = readString(input.amount || input.totalPool || input.budget);
  return {
    type: "usdc_transfer",
    network: process.env.NEXT_PUBLIC_DEFAULT_SETTLEMENT_RAIL || process.env.DEFAULT_SETTLEMENT_RAIL || "base",
    chainId: Number(process.env.BASE_CHAIN_ID || 8453),
    tokenSymbol: process.env.BASE_SETTLEMENT_TOKEN_SYMBOL || "USDC",
    tokenAddress: process.env.BASE_SETTLEMENT_TOKEN_ADDRESS || "",
    amount,
    recipientAddress: poolAddress,
    memo: "Fund this AI2Human PrizePool before publishing. Transfer exact USDC amount, then call campaign_publish.",
    nextAction: "POST /api/agent/campaigns/{id}/publish"
  };
}

export function inferWinnerDistribution(input = {}, rewardDistribution) {
  const explicit = input.winnerDistribution && typeof input.winnerDistribution === "object"
    ? input.winnerDistribution
    : {};
  const strategy = readString(explicit.strategy) || (
    rewardDistribution?.mode === "lucky_draw"
      ? "instant_qualified_claim"
      : rewardDistribution?.mode === "ranked_article_contest"
        ? "ranked_ai_review"
        : "fixed_slots"
  );

  return {
    strategy,
    mode: rewardDistribution?.mode || "fcfs",
    maxWinners: rewardDistribution?.maxWinners || 1,
    totalPool: rewardDistribution?.totalPool || input.budget || "",
    perWinner: rewardDistribution?.perWinner || undefined,
    drawTime: rewardDistribution?.drawTime || undefined,
    reviewAfter: rewardDistribution?.reviewAfter || undefined,
    notes:
      strategy === "instant_qualified_claim"
        ? "Eligible users claim until maxWinners is reached; lucky draw amounts preserve the configured pool."
        : strategy === "final_random_draw"
          ? "Winners are selected after the deadline from verified participants."
          : strategy === "ranked_ai_review"
            ? "Submissions are ranked by review, and prizes are assigned by rank."
            : "Rewards are paid to fixed eligible slots."
  };
}

export function expectedPayoutTotal(input = {}, rewardDistribution) {
  return rewardDistribution?.totalPool || input.budget || "0 USDC";
}

export async function runAgentCampaignContractPreflight(db, input = {}, rewardDistribution) {
  const funding = readFundingPlan(input, rewardDistribution);
  const winnerDistribution = inferWinnerDistribution(input, rewardDistribution);
  const checks = [
    "pool owner must equal backend payout signer",
    "refund/agent wallet must equal expected recovery wallet",
    "pool USDC balance must cover expected payout",
    "deadline, max winners, token, and pause state must be valid",
    "pool must not already be bound to another campaign"
  ];

  if (!funding.requiresContractPreflight) {
    return {
      required: false,
      ok: true,
      status: "not_required",
      checks,
      issues: []
    };
  }

  if (!isUsablePoolAddress(funding.poolAddress)) {
    if (funding.fundingMode === "ai2human_managed_pool") {
      return {
        required: true,
        ok: false,
        status: "managed_pool_not_created",
        checks,
        issues: ["Create the campaign draft first. AI2Human will deploy the PrizePool and return a funding invoice."]
      };
    }
    return {
      required: true,
      ok: false,
      status: "missing_pool_address",
      checks,
      issues: ["poolAddress is required for prize_pool_contract campaigns."]
    };
  }

  const duplicate = db.tasks.find((task) => {
    const samePool =
      task.poolAddress?.toLowerCase() === funding.poolAddress.toLowerCase() ||
      task.campaign?.poolAddress?.toLowerCase?.() === funding.poolAddress.toLowerCase();
    return samePool && task.id !== input.taskId;
  });
  if (duplicate) {
    return {
      required: true,
      ok: false,
      status: "pool_already_bound",
      checks,
      issues: [`Pool is already bound to task ${duplicate.id}.`],
      poolAddress: funding.poolAddress
    };
  }

  const { getPrizePoolPayoutPreflight } = await import("./prizePool");
  const preflight = await getPrizePoolPayoutPreflight({
    poolAddress: funding.poolAddress,
    expectedPayoutTotal: expectedPayoutTotal(input, rewardDistribution),
    expectedWinners: winnerDistribution.maxWinners,
    expectedAgent: readString(input.expectedAgent || process.env.PRIZE_POOL_EXPECTED_AGENT_ADDRESS)
  });

  return {
    required: true,
    ok: preflight.ok,
    status: preflight.ok ? "passed" : "failed",
    checks,
    issues: preflight.issues,
    ...preflight
  };
}

export async function buildAgentCampaignPreview(db, input = {}) {
  const preview = buildAgentTaskPreview(input);
  const rewardDistribution = parseRewardDistribution(input.rewardDistribution, preview.preview?.budget || input.budget || "");
  const fundingPlan = readFundingPlan(input, rewardDistribution);
  const winnerDistribution = inferWinnerDistribution(input, rewardDistribution);
  const contractPreflight = await runAgentCampaignContractPreflight(db, input, rewardDistribution);
  const readyToPublish =
    preview.readyToCreate &&
    (
      fundingPlan.payoutDisabled ||
      fundingPlan.fundingMode === "unfunded_campaign" ||
      fundingPlan.fundingMode === "test_no_payout" ||
      fundingPlan.fundingMode === "escrow_deposit" ||
      contractPreflight.ok
    );

  return {
    ...preview,
    readyToPublish,
    fundingPlan,
    winnerDistribution,
    contractPreflight
  };
}

export async function attachManagedPrizePool(db, input = {}, task, preview) {
  const rewardDistribution = task.rewardDistribution;
  const fundingPlan = readFundingPlan(input, rewardDistribution);
  if (fundingPlan.fundingMode !== "ai2human_managed_pool") {
    return { task, preview };
  }

  if (fundingPlan.environment !== "production") {
    throw new Error("ai2human_managed_pool requires environment=production.");
  }

  const { createPrizePoolCampaign, getPrizePoolSignerAddress } = await import("./prizePool");
  const expectedAgent = readString(
    input.expectedAgent ||
      process.env.PRIZE_POOL_EXPECTED_AGENT_ADDRESS ||
      getPrizePoolSignerAddress()
  );
  if (!expectedAgent) {
    throw new Error("PrizePool signer is required to create managed PrizePools.");
  }

  const campaignId = Number(input.campaignId) || createNumericCampaignId();
  const created = await createPrizePoolCampaign({
    campaignId,
    deadline: parseDeadlineUnix(task.deadline),
    maxWinners: rewardDistribution?.maxWinners || 1,
    agent: expectedAgent
  });
  if (!created.ok) {
    throw new Error(created.error);
  }
  if (!isUsablePoolAddress(created.poolAddress)) {
    throw new Error(`Managed PrizePool creation returned an invalid pool address: ${created.poolAddress || "empty"}.`);
  }

  const updatedInput = {
    ...input,
    taskId: task.id,
    budget: task.budget,
    poolAddress: created.poolAddress,
    expectedAgent
  };
  const updatedFundingPlan = {
    ...readFundingPlan(updatedInput, rewardDistribution),
    managedPool: {
      campaignId: created.campaignId,
      poolAddress: created.poolAddress,
      createTxHash: created.txHash,
      createExplorerUrl: created.explorerUrl,
      expectedAgent
    },
    fundingInvoice: buildFundingInvoice({
      poolAddress: created.poolAddress,
      amount: expectedPayoutTotal(updatedInput, rewardDistribution)
    })
  };
  const updatedPreflight = await runAgentCampaignContractPreflight(db, updatedInput, rewardDistribution);

  task.poolAddress = created.poolAddress;
  task.campaign = {
    ...task.campaign,
    poolAddress: created.poolAddress,
    agentLifecycle: {
      ...task.campaign?.agentLifecycle,
      readyToPublish: updatedPreflight.ok,
      fundingPlan: updatedFundingPlan,
      contractPreflight: updatedPreflight
    }
  };
  task.evidence.unshift({
    id: crypto.randomUUID(),
    by: "system",
    type: "log",
    content: `managed_prize_pool_created: campaignId=${created.campaignId} pool=${created.poolAddress} tx=${created.txHash}`,
    createdAt: new Date().toISOString()
  });

  return {
    task,
    preview: {
      ...preview,
      readyToPublish: updatedPreflight.ok,
      fundingPlan: updatedFundingPlan,
      contractPreflight: updatedPreflight
    }
  };
}

export function buildAgentCampaignTask(input = {}, preview) {
  const campaignTask = buildOfficialCampaignTask({
    templateId: input.templateId,
    title: input.title || undefined,
    budget: input.budget || undefined,
    deadline: input.deadline || undefined,
    requesterName: input.requesterName || undefined,
    requesterHandle: input.requesterHandle || undefined,
    targetUrl: input.targetUrl || undefined,
    proofPhrase: input.proofPhrase || undefined,
    brief: input.brief || undefined,
    campaignLinks: input.campaignLinks
  });
  const rewardDistribution = parseRewardDistribution(input.rewardDistribution, campaignTask.budget);
  const fundingPlan = preview.fundingPlan || readFundingPlan(input, rewardDistribution);
  const now = new Date().toISOString();
  const taskId = readString(input.id) || `agent-campaign-${crypto.randomUUID().slice(0, 12)}`;
  const isDraft = input.publishNow !== true;

  return {
    id: taskId,
    title: campaignTask.title,
    budget: campaignTask.budget,
    deadline: campaignTask.deadline,
    acceptance: campaignTask.acceptance,
    campaign: {
      ...campaignTask.campaign,
      environment: fundingPlan.environment || undefined,
      fundingMode: fundingPlan.fundingMode || undefined,
      isTest: fundingPlan.environment === "test" || undefined,
      payoutDisabled: fundingPlan.payoutDisabled || undefined,
      agentLifecycle: {
        status: isDraft ? "draft" : "published",
        readyToCreate: preview.readyToCreate,
        readyToPublish: preview.readyToPublish,
        createdBy: "agent",
        createdVia: "agent_campaign_protocol_v1",
        publishedAt: isDraft ? undefined : now,
        fundingPlan,
        contractPreflight: preview.contractPreflight,
        winnerDistribution: preview.winnerDistribution,
        missingInputs: preview.missingInputs,
        nextQuestions: preview.nextQuestions
      }
    },
    agentId: readString(input.agentId) || undefined,
    rewardDistribution,
    poolAddress: fundingPlan.poolAddress || undefined,
    status: "created",
    taskState: isDraft ? "closed" : "open",
    drawResult: rewardDistribution?.mode === "lucky_draw"
      ? {
          drawnAt: "",
          winners: [],
          totalPool: rewardDistribution.totalPool,
          distributionType: preview.winnerDistribution?.strategy || "instant_qualified_claim"
        }
      : undefined,
    verifyCooldownHours: Number.isFinite(Number(input.verifyCooldownHours)) ? Number(input.verifyCooldownHours) : 0,
    createdAt: now,
    updatedAt: now,
    evidence: [
      {
        id: crypto.randomUUID(),
        by: "system",
        type: "log",
        content: `agent_campaign_created: ${isDraft ? "draft" : "published"} | funding=${fundingPlan.fundingMode || "none"} | environment=${fundingPlan.environment || "unspecified"}`,
        createdAt: now
      }
    ]
  };
}
