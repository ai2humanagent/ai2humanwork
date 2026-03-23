const DEFAULT_REQUESTER_NAME = "ai2human Official";
const DEFAULT_REQUESTER_HANDLE = "@ai2humanwork";
export const DEFAULT_TARGET_URL = "https://x.com/ai2humanwork/status/2023556314602016768";
export const DEFAULT_REPLY_TARGET_URL = "https://x.com/ai2humanwork/status/2021889560729321898";

const OFFICIAL_CAMPAIGN_TEMPLATES = [
  {
    id: "x_quote_launch",
    label: "Quote Official Post",
    action: "quote",
    title: "Quote-post the official launch update with your own commentary",
    defaultBrief:
      "Amplify the launch update from your own X account and include the requested CTA.",
    defaultProofPhrase: "human fallback on x layer",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live quote-post URL.",
      "The live URL must belong to the same X handle you submit.",
      "Upload a screenshot showing the post on your timeline.",
      "Repeat the required campaign phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live quote-post URL is present.",
      "Submitted X URL matches executor handle.",
      "Screenshot proof is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ]
  },
  {
    id: "x_reply_thread",
    label: "Reply To Thread",
    action: "reply",
    title: "Reply to the official thread with a localized summary and CTA",
    defaultBrief:
      "Post a reply under the official thread that helps a new audience understand the announcement.",
    defaultProofPhrase: "proof -> verify -> settle",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live reply URL.",
      "The live URL must belong to the same X handle you submit.",
      "Upload a screenshot showing the reply under the thread.",
      "Include the required campaign phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live reply URL is present.",
      "Submitted X URL matches executor handle.",
      "Screenshot proof is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ]
  },
  {
    id: "x_repost_update",
    label: "Repost Official Post",
    action: "repost",
    title: "Repost the official campaign tweet from your X account",
    defaultBrief:
      "Repost the official campaign post from your account and make the repost visible on your profile.",
    defaultProofPhrase: "",
    proofRequirements: [
      "Attach your X handle.",
      "Attach your X profile URL.",
      "The profile URL must belong to the same X handle you submit.",
      "Upload a screenshot showing the repost state on the official post or your profile.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Executor profile URL is present.",
      "Submitted X URL matches executor handle.",
      "Screenshot proof is uploaded.",
      "Execution summary is present."
    ]
  },
  {
    id: "x_post_recap",
    label: "Publish Standalone Post",
    action: "post",
    title: "Publish a standalone X post that links back to the official update",
    defaultBrief:
      "Write a short recap post from your own X account and link back to the official announcement.",
    defaultProofPhrase: "#ai2human",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live post URL.",
      "The live URL must belong to the same X handle you submit.",
      "Upload a screenshot showing the published post.",
      "Include the required hashtag or phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live post URL is present.",
      "Submitted X URL matches executor handle.",
      "Screenshot proof is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ]
  }
];

function normalizeHandle(value) {
  const handle = String(value || "").trim();
  if (!handle) return "";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function isXUrl(value) {
  return /^https?:\/\/(www\.)?(x|twitter)\.com\/[^/\s]+/i.test(String(value || "").trim());
}

function normalizeXUrl(value) {
  const raw = String(value || "").trim();
  if (!isXUrl(raw)) return "";

  try {
    const parsed = new URL(raw);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (!parts.length) return "";

    const handle = parts[0].replace(/^@/, "").toLowerCase();
    const statusIndex = parts.findIndex((part) => part.toLowerCase() === "status");
    if (statusIndex >= 0 && parts[statusIndex + 1]) {
      return `https://x.com/${handle}/status/${parts[statusIndex + 1].toLowerCase()}`;
    }
    return `https://x.com/${handle}`;
  } catch {
    return "";
  }
}

function extractHandleFromXUrl(value) {
  const normalized = normalizeXUrl(value);
  if (!normalized) return "";
  const parts = new URL(normalized).pathname.split("/").filter(Boolean);
  return parts[0] ? `@${parts[0].toLowerCase()}` : "";
}

function findTemplate(templateId) {
  return (
    OFFICIAL_CAMPAIGN_TEMPLATES.find((template) => template.id === templateId) ||
    OFFICIAL_CAMPAIGN_TEMPLATES[0]
  );
}

export function getDefaultTargetUrlForTemplate(templateId) {
  if (templateId === "x_reply_thread" || templateId === "x_post_recap") {
    return DEFAULT_REPLY_TARGET_URL;
  }
  return DEFAULT_TARGET_URL;
}

export function getTaskEvidenceFields(task) {
  const notes = Array.isArray(task?.evidence) ? task.evidence : [];
  const values = {};
  const textLines = [];
  const screenshots = [];

  for (const item of notes) {
    const content = String(item?.content || "").trim();
    if (!content) continue;
    if (item?.type === "photo") {
      screenshots.push(content);
      continue;
    }
    textLines.push(content.toLowerCase());
    const match = content.match(/^([a-z_]+):\s*(.+)$/i);
    if (!match) continue;
    values[match[1].toLowerCase()] = match[2].trim();
  }

  return {
    values,
    screenshots,
    textBlob: textLines.join("\n"),
    normalizedPostUrl: normalizeXUrl(values.post_url),
    normalizedProfileUrl: normalizeXUrl(values.profile_url),
    extractedHandle:
      extractHandleFromXUrl(values.post_url) || extractHandleFromXUrl(values.profile_url),
    normalizedExecutorHandle: normalizeHandle(values.executor_handle).toLowerCase()
  };
}

export function getOfficialCampaignTemplates() {
  return OFFICIAL_CAMPAIGN_TEMPLATES.map((template) => ({ ...template }));
}

export function buildOfficialCampaignTask(input = {}) {
  const template = findTemplate(input.templateId);
  const requesterName = String(input.requesterName || DEFAULT_REQUESTER_NAME).trim();
  const requesterHandle = normalizeHandle(input.requesterHandle || DEFAULT_REQUESTER_HANDLE);
  const targetUrl = String(input.targetUrl || getDefaultTargetUrlForTemplate(template.id)).trim();
  const proofPhrase = String(input.proofPhrase || template.defaultProofPhrase || "").trim();
  const brief = String(input.brief || template.defaultBrief || "").trim();

  return {
    title: String(input.title || template.title).trim(),
    budget: String(input.budget || "25 USDT").trim(),
    deadline: String(input.deadline || "24h").trim(),
    acceptance: template.proofRequirements.join(" "),
    campaign: {
      requesterName,
      requesterHandle: requesterHandle || undefined,
      platform: "x",
      action: template.action,
      targetUrl: targetUrl || undefined,
      proofPhrase: proofPhrase || undefined,
      brief: brief || undefined,
      proofRequirements: [...template.proofRequirements],
      verificationChecks: [...template.verificationChecks]
    }
  };
}

export function getTaskVerificationStatus(task) {
  if (!task?.campaign || task.campaign.platform !== "x") {
    return { ok: true, checks: [], missing: [] };
  }

  const {
    values,
    screenshots,
    textBlob,
    extractedHandle,
    normalizedExecutorHandle
  } = getTaskEvidenceFields(task);
  const checks = [];
  const action = task.campaign.action;
  const needsLivePostUrl = action === "post" || action === "quote" || action === "reply";
  const needsProfileUrl = action === "repost";

  checks.push({
    id: "executor_handle",
    label: "Executor handle is present",
    passed: Boolean(values.executor_handle && values.executor_handle.startsWith("@"))
  });

  if (needsLivePostUrl) {
    checks.push({
      id: "post_url",
      label: "Live post URL is present",
      passed: isXUrl(values.post_url)
    });
  }

  if (needsProfileUrl) {
    checks.push({
      id: "profile_url",
      label: "Executor profile URL is present",
      passed: isXUrl(values.profile_url || values.post_url)
    });
  }

  if (needsLivePostUrl || needsProfileUrl) {
    checks.push({
      id: "url_handle_match",
      label: "Submitted X URL matches executor handle",
      passed: Boolean(
        normalizedExecutorHandle &&
          extractedHandle &&
          normalizedExecutorHandle === extractedHandle
      )
    });
  }

  checks.push({
    id: "screenshot",
    label: "Screenshot proof is uploaded",
    passed: screenshots.length > 0
  });

  if (task.campaign.proofPhrase) {
    const phrase = task.campaign.proofPhrase.toLowerCase();
    checks.push({
      id: "proof_phrase",
      label: "Required phrase is present",
      passed:
        String(values.proof_phrase || "")
          .toLowerCase()
          .includes(phrase) || textBlob.includes(phrase)
    });
  }

  checks.push({
    id: "summary",
    label: "Execution summary is present",
    passed: String(values.summary || "").trim().length >= 12
  });

  return {
    ok: checks.every((check) => check.passed),
    checks,
    missing: checks.filter((check) => !check.passed).map((check) => check.label)
  };
}
