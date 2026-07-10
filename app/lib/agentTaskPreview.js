import {
  buildOfficialCampaignTask,
  getOfficialCampaignTemplates
} from "./officialCampaignTasks.js";

export const VALID_REWARD_DISTRIBUTION_MODES = [
  "fcfs",
  "lucky_draw",
  "equal",
  "ranked_article_contest"
];

export const VALID_FUNDING_MODES = [
  "test_no_payout",
  "unfunded_campaign",
  "escrow_deposit",
  "prize_pool_contract",
  "ai2human_managed_pool"
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function isUsableAddressLike(value) {
  const text = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(text) && text !== ZERO_ADDRESS;
}

export function parseRewardDistribution(raw, fallbackBudget) {
  if (!raw || typeof raw !== "object") return undefined;
  const mode = String(raw.mode || "").trim();
  if (!VALID_REWARD_DISTRIBUTION_MODES.includes(mode)) return undefined;

  return {
    mode,
    totalPool: String(raw.totalPool || fallbackBudget).trim(),
    perWinner: raw.perWinner ? String(raw.perWinner).trim() : undefined,
    maxWinners: Math.max(1, Math.floor(Number(raw.maxWinners) || 1)),
    drawTime: raw.drawTime ? String(raw.drawTime).trim() : undefined,
    reviewAfter: raw.reviewAfter ? String(raw.reviewAfter).trim() : undefined,
    prizes: Array.isArray(raw.prizes)
      ? raw.prizes
          .map((rawPrize) => {
            if (!rawPrize || typeof rawPrize !== "object") return null;
            const rank = Math.max(1, Math.floor(Number(rawPrize.rank) || 0));
            const amount = String(rawPrize.amount || "").trim();
            if (!rank || !amount) return null;
            return {
              rank,
              amount,
              slots: Math.max(1, Math.floor(Number(rawPrize.slots) || 1)),
              label: rawPrize.label ? String(rawPrize.label).trim() : undefined
            };
          })
          .filter(Boolean)
      : undefined
  };
}

export function readCampaignLinks(input = {}) {
  const source = input.campaignLinks && typeof input.campaignLinks === "object"
    ? input.campaignLinks
    : {};
  return {
    followHandle: String(source.followHandle || input.followHandle || "").trim(),
    telegramUrl: String(source.telegramUrl || input.telegramUrl || "").trim(),
    repostUrl: String(source.repostUrl || input.repostUrl || "").trim(),
    likeUrl: String(source.likeUrl || input.likeUrl || "").trim()
  };
}

export function readFundingPlan(input = {}, rewardDistribution) {
  const fundingMode = String(input.fundingMode || "").trim();
  const environment = String(input.environment || "").trim();
  const poolAddress = String(input.poolAddress || "").trim();
  const depositAmount = input.depositAmount != null ? String(input.depositAmount).trim() : "";
  const isRewardCampaign = Boolean(rewardDistribution);
  const payoutDisabled =
    input.payoutDisabled === true ||
    fundingMode === "test_no_payout" ||
    fundingMode === "unfunded_campaign" ||
    environment === "test";

  return {
    fundingMode,
    environment,
    poolAddress,
    depositAmount,
    payoutDisabled,
    requiresFundingMode: isRewardCampaign,
    requiresContractPreflight: fundingMode === "prize_pool_contract" || fundingMode === "ai2human_managed_pool",
    requiresEscrowDeposit: fundingMode === "escrow_deposit",
    createsManagedPrizePool: fundingMode === "ai2human_managed_pool",
    canSettleNow:
      isRewardCampaign &&
      !payoutDisabled &&
      ((fundingMode === "prize_pool_contract" && isUsableAddressLike(poolAddress)) ||
        (fundingMode === "ai2human_managed_pool" && isUsableAddressLike(poolAddress)) ||
        (fundingMode === "escrow_deposit" && Boolean(depositAmount)))
  };
}

const OFFICIAL_TEMPLATE_IDS = new Set(getOfficialCampaignTemplates().map((template) => template.id));

function isBlankOrPlaceholder(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  return (
    text.includes("yourproject") ||
    text.includes("yourbrand") ||
    text.includes("exampleagent") ||
    text.includes("status/1234567890") ||
    text === "https://x.com/yourproject/status/..." ||
    text === "https://x.com/yourbrand/status/..."
  );
}

export function getMissingAgentTaskInputs(input = {}, rewardDistribution) {
  const missingInputs = [];
  const links = readCampaignLinks(input);
  const funding = readFundingPlan(input, rewardDistribution);
  const templateId = String(input.templateId || "").trim();
  const usesOfficialTemplate = OFFICIAL_TEMPLATE_IDS.has(templateId);
  const isLuckyDraw = rewardDistribution?.mode === "lucky_draw";

  if (usesOfficialTemplate || rewardDistribution) {
    if (isBlankOrPlaceholder(input.requesterName)) missingInputs.push("requesterName");
    if (isBlankOrPlaceholder(input.requesterHandle)) missingInputs.push("requesterHandle");
    if (isBlankOrPlaceholder(input.budget)) missingInputs.push("budget");
    if (isBlankOrPlaceholder(input.deadline)) missingInputs.push("deadline");
    if (isBlankOrPlaceholder(input.brief)) missingInputs.push("brief");
  }

  if (usesOfficialTemplate && isBlankOrPlaceholder(input.targetUrl)) {
    missingInputs.push("targetUrl");
  }

  if (isLuckyDraw) {
    if (isBlankOrPlaceholder(input.fundingMode)) missingInputs.push("fundingMode");
    if (isBlankOrPlaceholder(input.environment)) missingInputs.push("environment");
    if (funding.fundingMode && !VALID_FUNDING_MODES.includes(funding.fundingMode)) {
      missingInputs.push("validFundingMode");
    }
    if (isBlankOrPlaceholder(links.followHandle)) missingInputs.push("campaignLinks.followHandle");
    if (isBlankOrPlaceholder(links.telegramUrl)) missingInputs.push("campaignLinks.telegramUrl");
    if (isBlankOrPlaceholder(links.repostUrl)) missingInputs.push("campaignLinks.repostUrl");
    if (isBlankOrPlaceholder(links.likeUrl)) missingInputs.push("campaignLinks.likeUrl");
    if (funding.fundingMode === "test_no_payout" && funding.environment !== "test") {
      missingInputs.push("environment=test");
    }
    if (funding.fundingMode === "ai2human_managed_pool" && funding.environment !== "production") {
      missingInputs.push("environment=production");
    }
    if (funding.fundingMode === "prize_pool_contract" && !isUsableAddressLike(funding.poolAddress)) {
      missingInputs.push("poolAddress");
    }
    if (funding.fundingMode === "escrow_deposit") {
      if (!String(input.agentId || "").trim()) missingInputs.push("agentId");
      if (!funding.depositAmount) missingInputs.push("depositAmount");
    }
  }

  // Public production campaigns created through an agent must have a funded
  // AI2Human-managed PrizePool. Draft creation returns its funding invoice.
  if (funding.environment === "production" && funding.fundingMode !== "ai2human_managed_pool") {
    missingInputs.push("fundingMode=ai2human_managed_pool");
  }
  return missingInputs;
}

export function buildNextQuestions(missingInputs = []) {
  const labels = {
    requesterName: "What project or agent name should appear as the requester?",
    requesterHandle: "What public X handle should be shown for the requester?",
    targetUrl: "What exact target URL should humans act on or verify?",
    budget: "What total reward budget should this activity use?",
    deadline: "What exact deadline or task window should this activity use?",
    brief: "What should humans do, what proof should they submit, and when is it complete?",
    fundingMode: "Which funding mode should this campaign use: ai2human_managed_pool, test_no_payout, unfunded_campaign, escrow_deposit, or prize_pool_contract?",
    "fundingMode=ai2human_managed_pool": "Production Agent API campaigns must use ai2human_managed_pool. AI2Human creates the PrizePool and returns the Base USDC funding invoice after draft creation.",
    validFundingMode: "Use a supported funding mode: ai2human_managed_pool, test_no_payout, unfunded_campaign, escrow_deposit, or prize_pool_contract.",
    environment: "Is this campaign test or production?",
    "environment=test": "For test_no_payout campaigns, confirm environment is test.",
    "environment=production": "For ai2human_managed_pool campaigns, confirm environment is production.",
    "campaignLinks.followHandle": "What exact X handle should users follow?",
    "campaignLinks.telegramUrl": "What exact Telegram group link should users join?",
    "campaignLinks.repostUrl": "What exact X post URL should users repost?",
    "campaignLinks.likeUrl": "What exact X post URL should users like?",
    poolAddress: "What PrizePool contract address should this campaign use?",
    agentId: "Which registered agent wallet should fund the escrow deposit?",
    depositAmount: "How much USDC should be deposited into escrow before publishing?"
  };
  return [...new Set(missingInputs)].map((field) => ({
    field,
    question: labels[field] || `Please provide ${field}.`
  }));
}

export function buildAgentTaskPreview(input = {}) {
  const templateId = String(input.templateId || "").trim();
  const title = String(input.title || "").trim();
  const budget = String(input.budget || "").trim();
  const deadline = String(input.deadline || "").trim();
  const acceptance = String(input.acceptance || "").trim();

  if (!title && !templateId) {
    const error = new Error("Title or templateId is required");
    error.status = 400;
    throw error;
  }

  const campaignTask = templateId
    ? buildOfficialCampaignTask({
        templateId,
        title: title || undefined,
        budget: budget || undefined,
        deadline: deadline || undefined,
        requesterName: input.requesterName || undefined,
        requesterHandle: input.requesterHandle || undefined,
        targetUrl: input.targetUrl || undefined,
        proofPhrase: input.proofPhrase || undefined,
        brief: input.brief || undefined,
        eligibility: input.eligibility || undefined,
        tokenGate: input.tokenGate || undefined,
        campaignLinks: input.campaignLinks
      })
    : null;

  const finalBudget = campaignTask?.budget || budget || "TBD";
  const rewardDistribution = parseRewardDistribution(input.rewardDistribution, finalBudget);
  const warnings = [];
  const missingInputs = getMissingAgentTaskInputs(input, rewardDistribution);
  const fundingPlan = readFundingPlan(input, rewardDistribution);

  if (!String(input.brief || "").trim()) {
    warnings.push("Add a brief so human operators understand the blocked human step.");
  }
  if (!String(input.requesterName || "").trim()) {
    warnings.push("Add requesterName so users know which project created the task.");
  }
  if (!String(input.requesterHandle || "").trim()) {
    warnings.push("Add requesterHandle when the project has a public X account.");
  }
  if (templateId && !String(input.targetUrl || "").trim()) {
    warnings.push("Add targetUrl when the task depends on a specific post, product, or page.");
  }
  if (input.rewardDistribution && !rewardDistribution) {
    warnings.push("rewardDistribution was ignored because its mode is unsupported.");
  }
  if (missingInputs.length > 0) {
    warnings.push("Do not invent campaign links. Ask the requester agent/project for the missing inputs before creating this task.");
  }

  return {
    ok: missingInputs.length === 0,
    dryRun: true,
    readyToCreate: missingInputs.length === 0,
    readyToPublish: missingInputs.length === 0 && (!rewardDistribution || fundingPlan.canSettleNow || fundingPlan.payoutDisabled),
    missingInputs,
    nextQuestions: buildNextQuestions(missingInputs),
    fundingPlan,
    contractPreflight: {
      required: fundingPlan.requiresContractPreflight,
      status: fundingPlan.requiresContractPreflight
        ? fundingPlan.poolAddress
          ? "needs_onchain_check"
          : "missing_pool_address"
        : "not_required",
      checks: fundingPlan.requiresContractPreflight
        ? [
            "pool owner must equal backend payout signer",
            "refund/agent wallet must equal expected recovery wallet",
            "pool USDC balance must cover expected payout",
            "deadline, max winners, token, and pause state must be valid",
            "pool must not already be bound to another campaign"
          ]
        : []
    },
    preview: {
      title: campaignTask?.title || title,
      budget: finalBudget,
      deadline: campaignTask?.deadline || deadline || "TBD",
      acceptance: campaignTask?.acceptance || acceptance || "Provide evidence/logs",
      campaign: campaignTask?.campaign || null,
      rewardDistribution,
      campaignLinks: readCampaignLinks(input),
      taskState: "open",
      status: "created"
    },
    warnings
  };
}
