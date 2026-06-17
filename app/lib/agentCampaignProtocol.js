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

  if (!funding.poolAddress) {
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
