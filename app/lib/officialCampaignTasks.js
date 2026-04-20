import {
  DEFAULT_SETTLEMENT_TOKEN_SYMBOL,
  formatSettlementBudget
} from "./assetLabels.js";

const DEFAULT_REQUESTER_NAME = "ai2human Official";
const DEFAULT_REQUESTER_HANDLE = "@ai2humanwork";
export const DEFAULT_TARGET_URL = "https://x.com/ai2humanwork/status/2023556314602016768";
export const DEFAULT_REPLY_TARGET_URL = "https://x.com/ai2humanwork/status/2021889560729321898";
export const DEFAULT_X_TASK_BUDGET = formatSettlementBudget("0.01");
export const DEFAULT_REAL_WORLD_TASK_BUDGET = formatSettlementBudget("45");

const X_CAMPAIGN_TEMPLATES = [
  {
    id: "x_quote_launch",
    label: "Quote Campaign Post",
    action: "quote",
    title: "Quote-post the campaign update with your own market take and CTA",
    defaultBrief:
      "Amplify the campaign update from your own X account, add your own angle, and include the requested CTA.",
    defaultProofPhrase: "human fallback for agents",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live quote-post URL.",
      "The live URL must belong to the same X handle you submit.",
      "Attach the live proof URL or a screenshot showing the post on your timeline.",
      "Repeat the required campaign phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live quote-post URL is present.",
      "Submitted X URL matches executor handle.",
      "Proof URL or screenshot is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ],
    submissionFields: ["executorHandle", "postUrl", "photo", "proofPhrase", "summary"]
  },
  {
    id: "x_reply_thread",
    label: "Reply To Thread",
    action: "reply",
    title: "Reply under the official thread with a localized summary, CTA, and community context",
    defaultBrief:
      "Post a reply under the official thread that helps a new audience understand the launch and tells them what to do next.",
    defaultProofPhrase: "proof -> verify -> settle",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live reply URL.",
      "The live URL must belong to the same X handle you submit.",
      "Attach the live proof URL or a screenshot showing the reply under the thread.",
      "Include the required campaign phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live reply URL is present.",
      "Submitted X URL matches executor handle.",
      "Proof URL or screenshot is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ],
    submissionFields: ["executorHandle", "postUrl", "photo", "proofPhrase", "summary"]
  },
  {
    id: "x_repost_update",
    label: "Repost Campaign Post",
    action: "repost",
    title: "Repost the campaign thread from your X account and keep it visible on your timeline",
    defaultBrief:
      "Repost the campaign post from your account and make the repost visible on your profile for fast reviewer verification.",
    defaultProofPhrase: "",
    proofRequirements: [
      "Attach your X handle.",
      "Attach your X profile URL.",
      "The profile URL must belong to the same X handle you submit.",
      "Attach the live proof URL or a screenshot showing the repost state on the official post or your profile.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Executor profile URL is present.",
      "Submitted X URL matches executor handle.",
      "Proof URL or screenshot is uploaded.",
      "Execution summary is present."
    ],
    submissionFields: ["executorHandle", "profileUrl", "photo", "summary"]
  },
  {
    id: "x_post_recap",
    label: "Publish Standalone Post",
    action: "post",
    title: "Publish a standalone X post that recaps the campaign and links back to the official update",
    defaultBrief:
      "Write a short recap post from your own X account, link back to the official announcement, and make the CTA easy to follow.",
    defaultProofPhrase: "#fourmeme",
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live post URL.",
      "The live URL must belong to the same X handle you submit.",
      "Attach the live proof URL or a screenshot showing the published post.",
      "Include the required hashtag or phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live post URL is present.",
      "Submitted X URL matches executor handle.",
      "Proof URL or screenshot is uploaded.",
      "Required phrase is present.",
      "Execution summary is present."
    ],
    submissionFields: ["executorHandle", "postUrl", "photo", "proofPhrase", "summary"]
  }
];

const REAL_WORLD_TEMPLATES = [
  {
    id: "storefront_hours_check",
    label: "Storefront Check",
    action: "storefront_check",
    title: "Visit the storefront and confirm whether the location is open tonight",
    defaultBrief:
      "Go to the storefront, photograph the entrance and posted business hours, and confirm whether the location is open or closed.",
    defaultProofPhrase: "",
    targetLabel: "Store reference",
    defaultTargetUrl: "https://maps.google.com/?q=Blue+Bottle+Coffee",
    proofRequirements: [
      "Upload one clear storefront photo that shows the entrance.",
      "Add a short location note naming the store and street.",
      "Add a timestamp note for when the check was performed.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Storefront photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "summary"]
  },
  {
    id: "shelf_audit",
    label: "Shelf Audit",
    action: "shelf_audit",
    title: "Check whether the requested product is on shelf and visible to customers",
    defaultBrief:
      "Visit the retail location, photograph the product shelf, and note whether the item is in stock and customer-facing.",
    defaultProofPhrase: "",
    targetLabel: "Store reference",
    defaultTargetUrl: "https://maps.google.com/?q=7-Eleven",
    proofRequirements: [
      "Upload one clear shelf photo showing the requested product area.",
      "Add a short location note naming the store and aisle or shelf context.",
      "Add a timestamp note for when the shelf audit was completed.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Shelf photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "summary"]
  },
  {
    id: "signature_capture",
    label: "Signature Pickup",
    action: "signature_capture",
    title: "Collect the signed handoff page from the front desk and confirm the counter code",
    defaultBrief:
      "Pick up the printed handoff page, make sure it is signed, photograph the signed page, and return the desk code used during pickup.",
    defaultProofPhrase: "desk code confirmed",
    targetLabel: "Pickup reference",
    defaultTargetUrl: "https://maps.google.com/?q=WeWork",
    proofRequirements: [
      "Upload a clear photo of the signed handoff page or receipt.",
      "Add a short location note naming the front desk or pickup counter.",
      "Add a timestamp note for the completed pickup.",
      "Repeat the required counter code or phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Signed proof photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Required phrase is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "proofPhrase", "summary"]
  },
  {
    id: "pickup_confirmation",
    label: "Pickup Confirmation",
    action: "pickup_confirmation",
    title: "Pick up the sealed envelope from the locker and confirm the handoff code",
    defaultBrief:
      "Go to the pickup locker or desk, collect the envelope, photograph the handoff proof, and include the pickup code supplied at the location.",
    defaultProofPhrase: "pickup code confirmed",
    targetLabel: "Pickup reference",
    defaultTargetUrl: "https://maps.google.com/?q=Package+Locker",
    proofRequirements: [
      "Upload a photo of the envelope label, locker screen, or pickup receipt.",
      "Add a short location note naming the pickup point.",
      "Add a timestamp note for the handoff.",
      "Repeat the required pickup code or phrase.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Pickup proof photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Required phrase is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "proofPhrase", "summary"]
  },
  {
    id: "menu_price_check",
    label: "Menu Check",
    action: "menu_price_check",
    title: "Verify that the requested menu item is still listed and capture the live price",
    defaultBrief:
      "Visit the venue, photograph the physical menu or ordering board, and confirm whether the requested item is still available.",
    defaultProofPhrase: "",
    targetLabel: "Venue reference",
    defaultTargetUrl: "https://maps.google.com/?q=Restaurant",
    proofRequirements: [
      "Upload one clear photo of the menu or ordering board.",
      "Add a short location note naming the venue checked.",
      "Add a timestamp note for the menu check.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Menu photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "summary"]
  },
  {
    id: "venue_queue_check",
    label: "Venue Queue Check",
    action: "venue_queue_check",
    title: "Check the venue entrance, estimate queue length, and confirm whether entry is open",
    defaultBrief:
      "Visit the venue entrance, photograph the queue or entrance line, and note the on-the-ground access status.",
    defaultProofPhrase: "",
    targetLabel: "Venue reference",
    defaultTargetUrl: "https://maps.google.com/?q=Conference+Center",
    proofRequirements: [
      "Upload one clear photo of the venue entrance or queue.",
      "Add a short location note naming the entrance checked.",
      "Add a timestamp note for when the queue was observed.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Venue photo is uploaded.",
      "Location note is present.",
      "Timestamp note is present.",
      "Execution summary is present."
    ],
    submissionFields: ["photo", "locationNote", "timestampNote", "summary"]
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

function isScreenshotProof(value) {
  const raw = String(value || "").trim();
  return Boolean(raw);
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
    X_CAMPAIGN_TEMPLATES.find((template) => template.id === templateId) ||
    X_CAMPAIGN_TEMPLATES[0]
  );
}

function findRealWorldTemplate(templateId) {
  return (
    REAL_WORLD_TEMPLATES.find((template) => template.id === templateId) ||
    REAL_WORLD_TEMPLATES[0]
  );
}

function isNonEmpty(value, minLength = 3) {
  return String(value || "").trim().length >= minLength;
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
    const key = match[1].toLowerCase();
    // Evidence items are prepended, so the first matching field is the latest submission.
    if (!(key in values)) {
      values[key] = match[2].trim();
    }
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
  return X_CAMPAIGN_TEMPLATES.map((template) => ({ ...template }));
}

export function getRealWorldTaskTemplates() {
  return REAL_WORLD_TEMPLATES.map((template) => ({ ...template }));
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
    budget: String(input.budget || DEFAULT_X_TASK_BUDGET).trim(),
    deadline: String(input.deadline || "24h").trim(),
    acceptance: template.proofRequirements.join(" "),
    campaign: {
      requesterName,
      requesterHandle: requesterHandle || undefined,
      platform: "x",
      action: template.action,
      label: template.label,
      targetUrl: targetUrl || undefined,
      targetLabel: "Target post",
      proofPhrase: proofPhrase || undefined,
      brief: brief || undefined,
      proofRequirements: [...template.proofRequirements],
      verificationChecks: [...template.verificationChecks],
      submissionFields: [...template.submissionFields]
    }
  };
}

export function buildRealWorldTask(input = {}) {
  const template = findRealWorldTemplate(input.templateId);
  const requesterName = String(input.requesterName || "ai2human Ops Desk").trim();
  const requesterHandle = normalizeHandle(input.requesterHandle || "");
  const targetUrl = String(input.targetUrl || template.defaultTargetUrl || "").trim();
  const proofPhrase = String(input.proofPhrase || template.defaultProofPhrase || "").trim();
  const brief = String(input.brief || template.defaultBrief || "").trim();

  return {
    title: String(input.title || template.title).trim(),
    budget: String(input.budget || DEFAULT_REAL_WORLD_TASK_BUDGET).trim(),
    deadline: String(input.deadline || "6h").trim(),
    acceptance: template.proofRequirements.join(" "),
    campaign: {
      requesterName,
      requesterHandle: requesterHandle || undefined,
      platform: "real_world",
      action: template.action,
      label: template.label,
      targetUrl: targetUrl || undefined,
      targetLabel: template.targetLabel,
      proofPhrase: proofPhrase || undefined,
      brief: brief || undefined,
      proofRequirements: [...template.proofRequirements],
      verificationChecks: [...template.verificationChecks],
      submissionFields: [...template.submissionFields]
    }
  };
}

export function getTaskSubmissionFields(task) {
  if (Array.isArray(task?.campaign?.submissionFields) && task.campaign.submissionFields.length > 0) {
    return [...task.campaign.submissionFields];
  }

  if (!task?.campaign) {
    return ["photo", "summary"];
  }

  if (task.campaign.platform === "x") {
    if (task.campaign.action === "repost") {
      return ["executorHandle", "profileUrl", "photo", "summary"];
    }
    return task.campaign.proofPhrase
      ? ["executorHandle", "postUrl", "photo", "proofPhrase", "summary"]
      : ["executorHandle", "postUrl", "photo", "summary"];
  }

  return task.campaign.proofPhrase
    ? ["photo", "locationNote", "timestampNote", "proofPhrase", "summary"]
    : ["photo", "locationNote", "timestampNote", "summary"];
}

export function getTaskVerificationStatus(task) {
  if (!task?.campaign) {
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

  if (task.campaign.platform === "x") {
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
      label: "Proof URL or screenshot is uploaded",
      passed: screenshots.some((item) => isScreenshotProof(item))
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
  } else if (task.campaign.platform === "real_world") {
    const photoLabelByAction = {
      storefront_check: "Storefront photo is uploaded.",
      shelf_audit: "Shelf photo is uploaded.",
      signature_capture: "Signed proof photo is uploaded.",
      pickup_confirmation: "Pickup proof photo is uploaded.",
      menu_price_check: "Menu photo is uploaded.",
      venue_queue_check: "Venue photo is uploaded."
    };

    checks.push({
      id: "photo",
      label: photoLabelByAction[task.campaign.action] || "Proof photo is uploaded.",
      passed: screenshots.length > 0
    });
    checks.push({
      id: "location_note",
      label: "Location note is present.",
      passed: isNonEmpty(values.location_note, 6)
    });
    checks.push({
      id: "timestamp_note",
      label: "Timestamp note is present.",
      passed: isNonEmpty(values.timestamp_note, 6)
    });

    if (task.campaign.proofPhrase) {
      const phrase = task.campaign.proofPhrase.toLowerCase();
      checks.push({
        id: "proof_phrase",
        label: "Required phrase is present.",
        passed:
          String(values.proof_phrase || "")
            .toLowerCase()
            .includes(phrase) || textBlob.includes(phrase)
      });
    }

    checks.push({
      id: "summary",
      label: "Execution summary is present.",
      passed: isNonEmpty(values.summary, 12)
    });
  }

  return {
    ok: checks.every((check) => check.passed),
    checks,
    missing: checks.filter((check) => !check.passed).map((check) => check.label)
  };
}
