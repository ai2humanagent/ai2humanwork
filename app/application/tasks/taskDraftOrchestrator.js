import { buildAgentCampaignPreview } from "../../lib/agentCampaignProtocol.js";
import { createCanonicalTaskDraft } from "./createCanonicalTaskDraft.js";
import { compileCustomTaskSpec, customTaskSpecToCampaignFields } from "../../lib/customTaskSpec.js";
import { normalizeTaskDisplayTitle } from "../../lib/taskInput.js";
import { parseXBotCommand } from "../../lib/xBotProtocol.js";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureCreateCommand(prompt) {
  const value = clean(prompt);
  if (!value) return "create";
  return /^(?:create|new|task|request|创建任务|创建|新建任务|新建|发布任务|帮我|请帮我)\b/i.test(value)
    ? value
    : `create ${value}`;
}

export function interpretTaskPrompt(input = {}) {
  const command = parseXBotCommand({
    text: ensureCreateCommand(input.prompt),
    authorUsername: input.requesterHandle || input.requesterName || "",
    authorId: input.requesterId || "",
    sourceTweetId: input.sourceId || "",
    conversationId: input.conversationId || "",
    botHandle: "ai2humanbot"
  });
  if (command.intent === "rejected") {
    return { ok: false, rejectionReasons: command.rejectionReasons || [], missingInputs: [] };
  }
  if (command.intent !== "create") {
    return { ok: false, rejectionReasons: [{ code: "invalid_intent", message: "Describe one bounded task for a human operator." }], missingInputs: [] };
  }
  const campaignInput = {
    ...command.campaignInput,
    requesterName: clean(input.requesterName) || command.campaignInput.requesterName || "Task requester",
    requesterHandle: clean(input.requesterHandle) || command.campaignInput.requesterHandle || "",
    source: {
      platform: clean(input.channel) || "web",
      requesterUserId: clean(input.requesterId),
      requesterWallet: clean(input.requesterWallet),
      sourceId: clean(input.sourceId)
    }
  };
  return { ok: true, campaignInput, missingInputs: command.missingFields || [] };
}

export async function previewTaskPrompt(db, input = {}) {
  const interpreted = interpretTaskPrompt(input);
  if (!interpreted.ok) return { ...interpreted, readyToCreate: false, nextAction: "revise_prompt" };
  const campaignInput = interpreted.campaignInput;
  const customTaskSpec = await compileCustomTaskSpec({
    brief: campaignInput.brief,
    title: campaignInput.title,
    expectedPlace: campaignInput.location || "",
    deadline: campaignInput.deadline,
    budget: campaignInput.budget
  });
  const proof = customTaskSpecToCampaignFields(customTaskSpec);
  const preparedInput = {
    ...campaignInput,
    title: normalizeTaskDisplayTitle(campaignInput.title || campaignInput.brief),
    serviceRequest: true,
    requestType: "human_execution_request",
    proofRequirements: proof.proofRequirements,
    verificationChecks: proof.verificationChecks,
    submissionFields: proof.submissionFields,
    customTaskSpec,
    researchConsent: input.researchConsent && typeof input.researchConsent === "object" ? input.researchConsent : undefined,
    requiresFundingConfirmation: true
    ,reviewPolicy: input.reviewPolicy === "publisher_approval" ? "publisher_approval" : "ai_auto"
  };
  const preview = await buildAgentCampaignPreview(db, preparedInput);
  const missingInputs = [...new Set([...(interpreted.missingInputs || []), ...(preview.missingInputs || [])])];
  return {
    ok: true,
    readyToCreate: missingInputs.length === 0 && preview.readyToCreate,
    missingInputs,
    nextQuestions: preview.nextQuestions || [],
    nextAction: missingInputs.length ? "answer_missing_inputs" : "create_draft",
    draft: {
      title: preparedInput.title,
      brief: preparedInput.brief,
      budget: preparedInput.budget,
      deadline: preparedInput.deadline,
      location: preparedInput.location || customTaskSpec.expectedPlace || "Remote / not specified",
      proofRequirements: proof.proofRequirements,
      verificationChecks: proof.verificationChecks,
      submissionFields: proof.submissionFields,
      fundingMode: preparedInput.fundingMode,
      environment: preparedInput.environment
      ,reviewPolicy: preparedInput.reviewPolicy
    },
    preparedInput,
    preview
  };
}

export async function createTaskDraftFromPrompt(db, input = {}) {
  const result = await previewTaskPrompt(db, input);
  if (!result.ok || !result.readyToCreate) return result;
  const task = createCanonicalTaskDraft(result.preparedInput, result.preview, { origin: "web" });
  return { ...result, task, nextAction: "confirm_task" };
}
