import type { ArticleSubmission, ArticleReviewAudit, ArticleReviewRubric, RewardDistribution, Task } from "./store";
import { normalizeXHandle } from "./xIdentity";

export type SubmissionContestKind = "x_article" | "banner_image";

export type ParsedXArticleUrl = {
  ok: true;
  url: string;
  authorHandle: string;
  articleId?: string;
  kind: "status" | "article";
} | {
  ok: false;
  error: string;
};

export type ArticleScoreResult = {
  score: number;
  review: string;
  rubric: ArticleReviewRubric;
  provider: "ai" | "ai_error" | "multi_model";
  model?: string;
  latencyMs?: number;
  fallbackReason?: string;
  modelReviews?: ArticleModelReviewResult[];
};

export type ArticleReviewProviderConfig = {
  id: "openai" | "mimo" | "minimax" | "deepseek" | "anthropic";
  label: string;
  model: string;
  weight: number;
  apiKey?: string;
  baseUrl?: string;
  protocol: "openai_compatible" | "anthropic";
};

export type ArticleModelReviewResult = {
  providerId: string;
  providerLabel: string;
  model?: string;
  weight: number;
  status: "scored" | "failed" | "skipped";
  score?: number;
  review?: string;
  rubric?: Omit<ArticleReviewRubric, "audit">;
  latencyMs?: number;
  error?: string;
};

export type ArticleContestReviewTarget = {
  projectName: string;
  projectAliases: string[];
  projectHandles: string[];
  projectUrls: string[];
  tokenSymbols: string[];
  contractAddresses: string[];
  requiredTopics: string[];
  thesis?: string;
};

export type ArticleSubmissionReviewResult = {
  submission: ArticleSubmission;
  debug: {
    submissionId: string;
    xHandle: string;
    walletAddress: string;
    score?: number;
    provider?: string;
    model?: string;
    latencyMs?: number;
    source?: string;
    contentSource?: string;
    contentLength?: number;
    excerpt?: string;
    fetchAttempts?: string[];
    fallbackReason?: string;
    error?: string;
  };
};

export type XArticleContentResult = {
  ok: true;
  source: "fxtwitter_thread" | "fxtwitter_status" | "x_api_thread" | "x_api" | "syndication" | "oembed" | "html";
  text: string;
  authorHandle?: string;
  title?: string;
  mediaUrls?: string[];
  attempts: string[];
} | {
  ok: false;
  error: string;
  attempts: string[];
};

export type XEngagementMetrics = {
  source: "fxtwitter_status" | "x_api" | "unavailable";
  attempts: string[];
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  views: number;
  rawScore: number;
  error?: string;
};

type PublicImageAssetResult = {
  ok: true;
  url: string;
  contentType?: string;
  attempts: string[];
} | {
  ok: false;
  error: string;
  attempts: string[];
};

export type PublicImageInspectionResult = {
  ok: true;
  url: string;
  contentType?: string;
  format: "png" | "jpeg" | "webp" | "gif" | "unknown";
  width?: number;
  height?: number;
  sizeBytes: number;
  attempts: string[];
} | {
  ok: false;
  error: string;
  attempts: string[];
  url?: string;
  contentType?: string;
  format?: "png" | "jpeg" | "webp" | "gif" | "unknown";
  width?: number;
  height?: number;
  sizeBytes?: number;
};

const DEFAULT_PRIZES = [
  { rank: 1, amount: "50 USDC", slots: 1, label: "1st place" },
  { rank: 2, amount: "20 USDC", slots: 1, label: "2nd place" },
  { rank: 3, amount: "10 USDC", slots: 3, label: "3rd place" }
];
const DEFAULT_MINIMUM_WINNER_SCORE = 25;
const ARTICLE_CONTENT_SCORE_WEIGHT = 0.85;
const ARTICLE_ENGAGEMENT_SCORE_WEIGHT = 0.15;

export function getSubmissionContestKind(task?: Pick<Task, "campaign">): SubmissionContestKind {
  return task?.campaign?.action === "banner_image_contest" ? "banner_image" : "x_article";
}

export function isBannerImageContestTask(task?: Pick<Task, "campaign" | "rewardDistribution">) {
  return isArticleContestDistribution(task?.rewardDistribution) && getSubmissionContestKind(task) === "banner_image";
}

export function shortWalletLabel(value: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function reviewedTextExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 900);
}

function clampScore(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num * 10) / 10));
}

function readCount(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function clampRubricScore(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(20, Math.round(num * 10) / 10));
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripOfficialSuffix(value: string) {
  return value
    .replace(/\bofficial\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_PROJECT_SIGNAL_WORDS = new Set([
  "ai",
  "eth",
  "sol",
  "btc",
  "base",
  "web3",
  "defi",
  "defai",
  "nft",
  "dao",
  "dex",
  "token",
  "agent",
  "agents",
  "crypto",
  "protocol"
]);

function normalizedSignalWord(value: string) {
  return value.toLowerCase().replace(/^[$@]/, "").replace(/[^a-z0-9]/g, "");
}

function isStrongAliasSignal(value: string) {
  const normalized = normalizedSignalWord(value);
  return normalized.length >= 4 && !GENERIC_PROJECT_SIGNAL_WORDS.has(normalized);
}

export function getArticleContestReviewTarget(task?: Pick<Task, "campaign">): ArticleContestReviewTarget {
  const campaign = task?.campaign;
  const configured = campaign?.reviewTarget;
  const requesterName = stripOfficialSuffix(campaign?.requesterName || "");
  const requesterHandle = campaign?.requesterHandle?.replace(/^@/, "");

  const projectName = String(configured?.projectName || requesterName || requesterHandle || "this project").trim();
  const projectAliases = uniqueStrings([
    projectName,
    requesterName,
    requesterHandle,
    ...(configured?.projectAliases || [])
  ]);
  const projectHandles = uniqueStrings([
    requesterHandle,
    ...(configured?.projectHandles || []).map((handle) => handle.replace(/^@/, ""))
  ]);

  return {
    projectName,
    projectAliases,
    projectHandles,
    projectUrls: uniqueStrings(configured?.projectUrls || []),
    tokenSymbols: uniqueStrings((configured?.tokenSymbols || []).map((symbol) => symbol.replace(/^\$/, ""))),
    contractAddresses: uniqueStrings(configured?.contractAddresses || []),
    requiredTopics: uniqueStrings(configured?.requiredTopics || campaign?.verificationChecks || campaign?.proofRequirements || []),
    thesis: configured?.thesis || campaign?.brief
  };
}

function detectProjectSignalMatch(text: string, target: ArticleContestReviewTarget) {
  const signals: Array<{ label: string; pattern: RegExp; strength: "strong" | "weak" }> = [];
  for (const alias of target.projectAliases) {
    if (alias.length < 2) continue;
    signals.push({
      label: alias,
      pattern: new RegExp(`(^|[^a-z0-9_])${escapeRegExp(alias)}([^a-z0-9_]|$)`, "i"),
      strength: isStrongAliasSignal(alias) ? "strong" : "weak"
    });
  }
  for (const handle of target.projectHandles) {
    if (!handle) continue;
    signals.push({ label: `@${handle}`, pattern: new RegExp(`@?${escapeRegExp(handle)}\\b`, "i"), strength: "strong" });
  }
  for (const url of target.projectUrls) {
    if (!url) continue;
    signals.push({ label: url, pattern: new RegExp(escapeRegExp(url.replace(/^https?:\/\//i, "")), "i"), strength: "strong" });
  }
  for (const symbol of target.tokenSymbols) {
    if (!symbol) continue;
    signals.push({
      label: `$${symbol.toUpperCase()}`,
      pattern: new RegExp(`\\$?${escapeRegExp(symbol)}\\b`, "i"),
      strength: isStrongAliasSignal(symbol) ? "weak" : "weak"
    });
  }
  for (const address of target.contractAddresses) {
    if (!address) continue;
    signals.push({ label: address, pattern: new RegExp(escapeRegExp(address), "i"), strength: "strong" });
  }

  const matched = signals.filter((signal) => signal.pattern.test(text));
  const strongSignals = uniqueStrings(matched.filter((signal) => signal.strength === "strong").map((signal) => signal.label));
  const weakSignals = uniqueStrings(matched.filter((signal) => signal.strength === "weak").map((signal) => signal.label));
  return {
    signals: uniqueStrings([...strongSignals, ...weakSignals]),
    strongSignals,
    weakSignals,
    passed: strongSignals.length > 0
  };
}

function detectProjectSignals(text: string, target: ArticleContestReviewTarget) {
  return detectProjectSignalMatch(text, target).signals;
}

function projectRelevanceGateScore(input: {
  title: string;
  content: string;
  articleUrl: string;
  startedAt: number;
  reviewTarget: ArticleContestReviewTarget;
}): ArticleScoreResult | null {
  const signalMatch = detectProjectSignalMatch(`${input.articleUrl}\n${input.title}\n${input.content}`, input.reviewTarget);
  if (signalMatch.passed) return null;

  return {
    score: 12,
    provider: "ai",
    model: "project-relevance-gate",
    latencyMs: Date.now() - input.startedAt,
    review: [
      `Project relevance gate: this submission does not clearly discuss ${input.reviewTarget.projectName} or its configured contest topic.`,
      "It may be about AI agents, trading, or another protocol, but it is off-topic for this contest and cannot qualify for prizes.",
      signalMatch.weakSignals.length
        ? `Weak project-like signals found (${signalMatch.weakSignals.join(", ")}), but no strong project signal such as an official handle, URL, contract address, or distinctive project name was present.`
        : "",
      `To qualify, the article must directly connect its thesis back to ${input.reviewTarget.projectName} and explain why the workflow matters.`
    ].filter(Boolean).join(" "),
    rubric: {
      relevance: 2,
      originality: 2,
      clarity: 4,
      evidence: 2,
      narrative: 2
    }
  };
}

function normalizeUrlHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyImagePath(pathname: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(pathname);
}

export async function fetchPublicImageAsset(rawUrl: string): Promise<PublicImageAssetResult> {
  let parsed: URL;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch {
    return { ok: false, error: "Submit a valid public image URL.", attempts: ["parse_url"] };
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only public http(s) image URLs are accepted.", attempts: ["protocol"] };
  }

  const normalizedUrl = parsed.toString();
  const attempts: string[] = [];

  try {
    attempts.push("head");
    const timeout = withTimeout(12000);
    try {
      const response = await fetch(normalizedUrl, {
        method: "HEAD",
        signal: timeout.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 ai2human-banner-review/1.0"
        }
      });
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (response.ok && contentType.startsWith("image/")) {
        attempts.push(`head_content_type:${contentType}`);
        return { ok: true, url: normalizedUrl, contentType, attempts };
      }
      attempts.push(`head_http_${response.status}:${contentType || "no_content_type"}`);
    } finally {
      timeout.clear();
    }
  } catch (error) {
    attempts.push(`head_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  try {
    attempts.push("get");
    const timeout = withTimeout(12000);
    try {
      const response = await fetch(normalizedUrl, {
        method: "GET",
        signal: timeout.signal,
        cache: "no-store",
        headers: {
          Range: "bytes=0-0",
          "User-Agent": "Mozilla/5.0 ai2human-banner-review/1.0"
        }
      });
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (response.ok && contentType.startsWith("image/")) {
        attempts.push(`get_content_type:${contentType}`);
        return { ok: true, url: normalizedUrl, contentType, attempts };
      }
      attempts.push(`get_http_${response.status}:${contentType || "no_content_type"}`);
    } finally {
      timeout.clear();
    }
  } catch (error) {
    attempts.push(`get_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  if (isLikelyImagePath(parsed.pathname)) {
    attempts.push("path_extension_fallback");
    return { ok: true, url: normalizedUrl, attempts };
  }

  return {
    ok: false,
    error: "The submitted URL does not look like a public image file. Use a direct PNG, JPG, WEBP, GIF, or AVIF URL.",
    attempts
  };
}

function detectImageFormat(bytes: Uint8Array, contentType?: string) {
  const normalizedType = String(contentType || "").toLowerCase();
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png" as const;
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "gif" as const;
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "jpeg" as const;
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp" as const;
  }
  if (normalizedType.includes("png")) return "png";
  if (normalizedType.includes("jpeg") || normalizedType.includes("jpg")) return "jpeg";
  if (normalizedType.includes("webp")) return "webp";
  if (normalizedType.includes("gif")) return "gif";
  return "unknown" as const;
}

function readPngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readGifDimensions(bytes: Uint8Array) {
  if (bytes.length < 10) return null;
  return {
    width: bytes[6] | (bytes[7] << 8),
    height: bytes[8] | (bytes[9] << 8)
  };
}

function readJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const blockLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (blockLength < 2) break;
    const isStartOfFrame = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf
    ].includes(marker);
    if (isStartOfFrame && offset + 8 < bytes.length) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8]
      };
    }
    offset += 2 + blockLength;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array) {
  if (bytes.length < 30) return null;
  const chunkType = String.fromCharCode(...bytes.slice(12, 16));
  if (chunkType === "VP8X" && bytes.length >= 30) {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  if (chunkType === "VP8 " && bytes.length >= 30) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff
    };
  }
  if (chunkType === "VP8L" && bytes.length >= 25) {
    const b21 = bytes[21];
    const b22 = bytes[22];
    const b23 = bytes[23];
    const b24 = bytes[24];
    const width = 1 + (((b22 & 0x3f) << 8) | b21);
    const height = 1 + (((b24 & 0x0f) << 10) | (b23 << 2) | ((b22 & 0xc0) >> 6));
    return { width, height };
  }
  return null;
}

function readImageDimensions(bytes: Uint8Array, format: "png" | "jpeg" | "webp" | "gif" | "unknown") {
  switch (format) {
    case "png":
      return readPngDimensions(bytes);
    case "gif":
      return readGifDimensions(bytes);
    case "jpeg":
      return readJpegDimensions(bytes);
    case "webp":
      return readWebpDimensions(bytes);
    default:
      return null;
  }
}

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

export async function inspectPublicImageAsset(rawUrl: string): Promise<PublicImageInspectionResult> {
  const asset = await fetchPublicImageAsset(rawUrl);
  if (!asset.ok) {
    return asset;
  }

  const attempts = [...asset.attempts, "inspect_get"];
  const timeout = withTimeout(15000);
  try {
    const response = await fetch(asset.url, {
      method: "GET",
      signal: timeout.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 ai2human-image-inspector/1.0"
      }
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Image fetch failed with HTTP ${response.status}.`,
        attempts: [...attempts, `inspect_http_${response.status}`],
        url: asset.url,
        contentType: asset.contentType
      };
    }
    const contentType = String(response.headers.get("content-type") || asset.contentType || "").toLowerCase();
    const buffer = new Uint8Array(await response.arrayBuffer());
    const format = detectImageFormat(buffer, contentType);
    const dimensions = readImageDimensions(buffer, format);
    return {
      ok: true,
      url: asset.url,
      contentType,
      format,
      width: dimensions?.width,
      height: dimensions?.height,
      sizeBytes: buffer.byteLength,
      attempts: [...attempts, `inspect_content_type:${contentType || "unknown"}`, `inspect_format:${format}`]
    };
  } catch (error) {
    return {
      ok: false,
      error: `Image fetch failed (${error instanceof Error ? error.message : "network error"}).`,
      attempts: [...attempts, `inspect_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`],
      url: asset.url,
      contentType: asset.contentType
    };
  } finally {
    timeout.clear();
  }
}

export async function validateDexscreenerHeaderImage(rawUrl: string): Promise<PublicImageInspectionResult> {
  const inspected = await inspectPublicImageAsset(rawUrl);
  if (!inspected.ok) return inspected;

  const allowedFormats = new Set(["png", "jpeg", "webp", "gif"]);
  const maxBytes = Math.floor(4.5 * 1024 * 1024);
  const minWidth = 600;
  const targetAspectRatio = 3;
  const ratioTolerance = 0.03;

  if (!allowedFormats.has(inspected.format)) {
    return {
      ...inspected,
      ok: false,
      error: `The attached image format must be PNG, JPG, WEBP, or GIF. Detected: ${inspected.format || "unknown"}.`
    };
  }
  if (typeof inspected.width !== "number" || typeof inspected.height !== "number") {
    return {
      ...inspected,
      ok: false,
      error: "We could not read the image dimensions. Use a standard PNG, JPG, WEBP, or GIF file."
    };
  }
  if (inspected.width < minWidth) {
    return {
      ...inspected,
      ok: false,
      error: `The attached image is too small (${inspected.width}x${inspected.height}). DexScreener headers need at least 600px width, for example 600x200 or 1500x500.`
    };
  }
  const ratio = inspected.width / inspected.height;
  if (!Number.isFinite(ratio) || Math.abs(ratio - targetAspectRatio) > ratioTolerance) {
    return {
      ...inspected,
      ok: false,
      error: `The attached image must use a 3:1 header ratio. Detected: ${inspected.width}x${inspected.height}. Use something like 600x200 or 1500x500.`
    };
  }
  if (inspected.sizeBytes > maxBytes) {
    return {
      ...inspected,
      ok: false,
      error: `The attached image is too large (${formatMb(inspected.sizeBytes)}). DexScreener headers must be 4.5MB or smaller.`
    };
  }
  return inspected;
}

async function prepareImageForModel(rawUrl: string): Promise<{
  url: string;
  remoteUrl: string;
  transport: "data_url" | "remote_url";
  attempts: string[];
  error?: string;
}> {
  const asset = await fetchPublicImageAsset(rawUrl);
  const attempts = [...asset.attempts];
  if (!asset.ok) {
    return {
      url: rawUrl,
      remoteUrl: rawUrl,
      transport: "remote_url",
      attempts,
      error: asset.error
    };
  }

  const timeout = withTimeout(15000);
  try {
    attempts.push("model_image_get");
    const response = await fetch(asset.url, {
      method: "GET",
      signal: timeout.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 ai2human-image-review/1.0"
      }
    });
    const contentType = String(response.headers.get("content-type") || asset.contentType || "").toLowerCase();
    if (!response.ok) {
      return {
        url: asset.url,
        remoteUrl: asset.url,
        transport: "remote_url",
        attempts: [...attempts, `model_image_http_${response.status}`],
        error: `Image download failed with HTTP ${response.status}.`
      };
    }
    if (!contentType.startsWith("image/")) {
      return {
        url: asset.url,
        remoteUrl: asset.url,
        transport: "remote_url",
        attempts: [...attempts, `model_image_content_type:${contentType || "unknown"}`],
        error: "Image download did not return an image content type."
      };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const maxDataUrlBytes = Math.floor(4.5 * 1024 * 1024);
    if (buffer.byteLength > maxDataUrlBytes) {
      return {
        url: asset.url,
        remoteUrl: asset.url,
        transport: "remote_url",
        attempts: [...attempts, `model_image_too_large:${buffer.byteLength}`],
        error: "Image is too large to inline for model review."
      };
    }
    attempts.push(`model_image_data_url:${contentType}:${buffer.byteLength}`);
    return {
      url: `data:${contentType};base64,${buffer.toString("base64")}`,
      remoteUrl: asset.url,
      transport: "data_url",
      attempts
    };
  } catch (error) {
    return {
      url: asset.url,
      remoteUrl: asset.url,
      transport: "remote_url",
      attempts: [...attempts, `model_image_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`],
      error: error instanceof Error ? error.message : "Image download failed."
    };
  } finally {
    timeout.clear();
  }
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function fetchText(url: string, init: RequestInit = {}) {
  const timeout = withTimeout(12000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: timeout.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 ai2human-review-bot/1.0",
        ...(init.headers || {})
      },
      cache: "no-store"
    });
    const text = await response.text();
    return { response, text };
  } finally {
    timeout.clear();
  }
}

async function getXBearerToken() {
  const apiKey = process.env.X_OAUTH1_API_KEY;
  const apiSecret = process.env.X_OAUTH1_API_SECRET;
  if (!apiKey || !apiSecret) return "";

  const credentials = Buffer.from(`${encodeURIComponent(apiKey)}:${encodeURIComponent(apiSecret)}`).toString("base64");
  const { response, text } = await fetchText("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) {
    throw new Error(`bearer token HTTP ${response.status}: ${text.slice(0, 120)}`);
  }
  const data = JSON.parse(text) as { access_token?: string };
  return data.access_token || "";
}

type XApiTweet = {
  id: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  attachments?: {
    media_keys?: string[];
  };
  note_tweet?: {
    text?: string;
  };
};

type XApiUser = {
  id?: string;
  username?: string;
  name?: string;
};

type XApiMedia = {
  media_key?: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
};

function readXApiTweetText(tweet: XApiTweet) {
  return String(tweet.note_tweet?.text || tweet.text || "").trim();
}

function userById(users: XApiUser[] | undefined, id: string | undefined) {
  if (!id || !Array.isArray(users)) return undefined;
  return users.find((user) => user.id === id);
}

function mediaByKey(media: XApiMedia[] | undefined, key: string | undefined) {
  if (!key || !Array.isArray(media)) return undefined;
  return media.find((item) => item.media_key === key);
}

function uniqueMediaUrls(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function readXApiTweetMediaUrls(tweet: XApiTweet | undefined, media: XApiMedia[] | undefined) {
  const mediaKeys = Array.isArray(tweet?.attachments?.media_keys) ? tweet.attachments?.media_keys : [];
  return uniqueMediaUrls(
    mediaKeys.map((key) => {
      const match = mediaByKey(media, key);
      return match?.url || match?.preview_image_url;
    })
  );
}

function readXApiThreadMediaUrls(tweets: XApiTweet[], media: XApiMedia[] | undefined) {
  return uniqueMediaUrls(tweets.flatMap((tweet) => readXApiTweetMediaUrls(tweet, media)));
}

function formatThreadText(tweets: XApiTweet[]) {
  return tweets
    .map((tweet, index) => {
      const text = readXApiTweetText(tweet);
      return text ? `${index + 1}/${tweets.length}\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function sortTweetsChronologically(tweets: XApiTweet[]) {
  return [...tweets].sort((a, b) => {
    const at = +new Date(a.created_at || "");
    const bt = +new Date(b.created_at || "");
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
  });
}

type FxTwitterStatus = {
  id?: string;
  text?: string;
  raw_text?: { text?: string };
  created_timestamp?: number;
  created_at?: string;
  replies?: number;
  retweets?: number;
  likes?: number;
  bookmarks?: number;
  quotes?: number;
  views?: number;
  author?: {
    screen_name?: string;
    name?: string;
  };
  media?: {
    all?: Array<{
      type?: string;
      url?: string;
    }>;
    photos?: Array<{
      type?: string;
      url?: string;
    }>;
  };
};

function readFxTwitterText(status: FxTwitterStatus) {
  return String(status.raw_text?.text || status.text || "").trim();
}

function formatFxThreadText(thread: FxTwitterStatus[]) {
  return thread
    .map((status, index) => {
      const text = readFxTwitterText(status);
      return text ? `${index + 1}/${thread.length}\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function readFxStatusMediaUrls(status: FxTwitterStatus | undefined) {
  if (!status) return [];
  const media = status.media;
  return uniqueMediaUrls([
    ...(Array.isArray(media?.photos) ? media.photos.map((item) => item.url) : []),
    ...(Array.isArray(media?.all) ? media.all.map((item) => item.url) : [])
  ]);
}

function readFxThreadMediaUrls(statuses: FxTwitterStatus[]) {
  return uniqueMediaUrls(statuses.flatMap((status) => readFxStatusMediaUrls(status)));
}

function sortFxStatusesChronologically(statuses: FxTwitterStatus[]) {
  return [...statuses].sort((a, b) => {
    const at = Number(a.created_timestamp) || +new Date(a.created_at || "");
    const bt = Number(b.created_timestamp) || +new Date(b.created_at || "");
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    if (a.id && b.id) return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
    return 0;
  });
}

function calculateEngagementRawScore(metrics: {
  likes?: number;
  reposts?: number;
  replies?: number;
  quotes?: number;
  bookmarks?: number;
  views?: number;
}) {
  return Math.round((
    readCount(metrics.likes) * 3 +
    readCount(metrics.reposts) * 6 +
    readCount(metrics.replies) * 5 +
    readCount(metrics.quotes) * 5 +
    readCount(metrics.bookmarks) * 2 +
    readCount(metrics.views) * 0.02
  ) * 1000) / 1000;
}

function emptyEngagementMetrics(attempts: string[], error?: string): XEngagementMetrics {
  return {
    source: "unavailable",
    attempts,
    likes: 0,
    reposts: 0,
    replies: 0,
    quotes: 0,
    bookmarks: 0,
    views: 0,
    rawScore: 0,
    error
  };
}

export async function fetchXEngagementMetrics(articleUrl: string): Promise<XEngagementMetrics> {
  const parsed = parseXArticleUrl(articleUrl);
  if (!parsed.ok) return emptyEngagementMetrics(["parse_url"], parsed.error);
  const attempts: string[] = [];
  if (parsed.kind !== "status" || !parsed.articleId) {
    return emptyEngagementMetrics(["unsupported_url_kind"], "Engagement metrics are only available for public X status URLs.");
  }

  try {
    attempts.push("fxtwitter_status");
    const { response, text } = await fetchText(`https://api.fxtwitter.com/status/${parsed.articleId}`);
    if (response.ok) {
      const data = JSON.parse(text) as { tweet?: FxTwitterStatus; status?: FxTwitterStatus } & FxTwitterStatus;
      const status = data.tweet || data.status || data;
      const metrics = {
        likes: readCount(status.likes),
        reposts: readCount(status.retweets),
        replies: readCount(status.replies),
        quotes: readCount(status.quotes),
        bookmarks: readCount(status.bookmarks),
        views: readCount(status.views)
      };
      return {
        source: "fxtwitter_status",
        attempts,
        ...metrics,
        rawScore: calculateEngagementRawScore(metrics)
      };
    }
    attempts.push(`fxtwitter_status_http_${response.status}:${text.slice(0, 120)}`);
  } catch (error) {
    attempts.push(`fxtwitter_status_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  try {
    attempts.push("x_api_bearer");
    const bearer = await getXBearerToken();
    if (!bearer) {
      attempts.push("x_api_missing_credentials");
      return emptyEngagementMetrics(attempts, "No public engagement metrics provider returned data.");
    }
    attempts.push("x_api_public_metrics");
    const apiBase = (process.env.X_OAUTH1_API_BASE_URL || "https://api.x.com").replace(/\/+$/, "");
    const endpoint = `${apiBase}/2/tweets/${parsed.articleId}?tweet.fields=${encodeURIComponent("public_metrics")}`;
    const { response, text } = await fetchText(endpoint, {
      headers: { Authorization: `Bearer ${bearer}` }
    });
    if (!response.ok) {
      attempts.push(`x_api_public_metrics_http_${response.status}:${text.slice(0, 120)}`);
      return emptyEngagementMetrics(attempts, "No public engagement metrics provider returned data.");
    }
    const data = JSON.parse(text) as {
      data?: {
        public_metrics?: {
          like_count?: number;
          retweet_count?: number;
          reply_count?: number;
          quote_count?: number;
          bookmark_count?: number;
        };
      };
    };
    const publicMetrics = data.data?.public_metrics || {};
    const metrics = {
      likes: readCount(publicMetrics.like_count),
      reposts: readCount(publicMetrics.retweet_count),
      replies: readCount(publicMetrics.reply_count),
      quotes: readCount(publicMetrics.quote_count),
      bookmarks: readCount(publicMetrics.bookmark_count),
      views: 0
    };
    return {
      source: "x_api",
      attempts,
      ...metrics,
      rawScore: calculateEngagementRawScore(metrics)
    };
  } catch (error) {
    attempts.push(`x_api_public_metrics_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  return emptyEngagementMetrics(attempts, "No public engagement metrics provider returned data.");
}

function readStableContentScore(submission: ArticleSubmission) {
  const existingContentScore = submission.aiRubric?.audit?.contentScore;
  if (typeof existingContentScore === "number" && Number.isFinite(existingContentScore)) {
    return clampScore(existingContentScore);
  }
  return clampScore(submission.aiScore || 0);
}

export function applyArticleEngagementScoresFromMetrics(
  submissions: ArticleSubmission[],
  metricsBySubmissionId: Map<string, XEngagementMetrics>,
  input: {
    contentWeight?: number;
    engagementWeight?: number;
  } = {}
) {
  const contentWeight = input.contentWeight ?? ARTICLE_CONTENT_SCORE_WEIGHT;
  const engagementWeight = input.engagementWeight ?? ARTICLE_ENGAGEMENT_SCORE_WEIGHT;
  const rawScores = submissions.map((submission) => metricsBySubmissionId.get(submission.id)?.rawScore || 0);
  const maxLogScore = Math.max(...rawScores.map((score) => Math.log1p(score)), 0);

  return submissions.map((submission) => {
    const metrics = metricsBySubmissionId.get(submission.id) || emptyEngagementMetrics(["not_fetched"], "Engagement metrics were not fetched.");
    const contentScore = readStableContentScore(submission);
    const engagementScore = maxLogScore > 0 ? roundScore((Math.log1p(metrics.rawScore) / maxLogScore) * 100) : 0;
    const finalScore = roundScore(contentScore * contentWeight + engagementScore * engagementWeight);
    const audit: ArticleReviewAudit = {
      ...(submission.aiRubric?.audit || {}),
      contentScore,
      engagementWeight,
      engagementScore,
      finalScore,
      finalScoreFormula: `finalScore = contentScore * ${contentWeight} + log-normalized engagementScore * ${engagementWeight}`,
      engagementMetrics: {
        source: metrics.source,
        attempts: metrics.attempts,
        likes: metrics.likes,
        reposts: metrics.reposts,
        replies: metrics.replies,
        quotes: metrics.quotes,
        bookmarks: metrics.bookmarks,
        views: metrics.views,
        rawScore: metrics.rawScore,
        normalizedScore: engagementScore,
        error: metrics.error
      }
    };
    return {
      ...submission,
      aiScore: finalScore,
      aiReview: [
        submission.aiReview || "",
        `Final score includes 85% AI content review and 15% public X engagement. Engagement metrics: ${metrics.likes} likes, ${metrics.reposts} reposts, ${metrics.replies} replies, ${metrics.quotes} quotes, ${metrics.views} views.`
      ].filter(Boolean).join(" "),
      aiRubric: submission.aiRubric
        ? { ...submission.aiRubric, audit }
        : { audit }
    };
  });
}

export async function applyArticleEngagementWeights(submissions: ArticleSubmission[]) {
  const pairs = await Promise.all(
    submissions.map(async (submission) => [
      submission.id,
      await fetchXEngagementMetrics(submission.articleUrl)
    ] as const)
  );
  return applyArticleEngagementScoresFromMetrics(submissions, new Map(pairs));
}

async function fetchFxTwitterThread(input: {
  parsed: Extract<ParsedXArticleUrl, { ok: true }>;
  attempts: string[];
}): Promise<XArticleContentResult | null> {
  const { parsed, attempts } = input;
  if (parsed.kind !== "status" || !parsed.articleId) return null;

  try {
    attempts.push("fxtwitter_thread");
    const { response, text } = await fetchText(`https://api.fxtwitter.com/2/thread/${parsed.articleId}`);
    if (!response.ok) {
      attempts.push(`fxtwitter_thread_http_${response.status}:${text.slice(0, 120)}`);
      return null;
    }
    const data = JSON.parse(text) as {
      code?: number;
      thread?: FxTwitterStatus[];
      status?: FxTwitterStatus;
      author?: FxTwitterStatus["author"];
    };
    const thread = Array.isArray(data.thread) ? data.thread : [];
    const usefulThread = sortFxStatusesChronologically(
      thread.filter((status) => status.id && readFxTwitterText(status))
    );
    if (data.code === 200 && usefulThread.length >= 2) {
      attempts.push(`fxtwitter_thread_posts_${usefulThread.length}`);
      return {
        ok: true,
        source: "fxtwitter_thread",
        text: formatFxThreadText(usefulThread),
        authorHandle: usefulThread[0]?.author?.screen_name || data.author?.screen_name || parsed.authorHandle,
        title: usefulThread[0]?.author?.name || data.author?.name,
        mediaUrls: readFxThreadMediaUrls(usefulThread),
        attempts
      };
    }

    const status = data.status || usefulThread[0];
    const statusText = status ? readFxTwitterText(status) : "";
    if (data.code === 200 && statusText.length >= 40) {
      attempts.push("fxtwitter_thread_single_status");
      return {
        ok: true,
        source: "fxtwitter_status",
        text: statusText,
        authorHandle: status?.author?.screen_name || data.author?.screen_name || parsed.authorHandle,
        title: status?.author?.name || data.author?.name,
        mediaUrls: readFxStatusMediaUrls(status),
        attempts
      };
    }
    attempts.push(`fxtwitter_thread_empty:${data.code || "unknown"}`);
  } catch (error) {
    attempts.push(`fxtwitter_thread_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }
  return null;
}

async function fetchXThreadFromApi(input: {
  parsed: Extract<ParsedXArticleUrl, { ok: true }>;
  bearer: string;
  attempts: string[];
}): Promise<XArticleContentResult | null> {
  const { parsed, bearer, attempts } = input;
  if (!bearer || parsed.kind !== "status" || !parsed.articleId) return null;
  const apiBase = (process.env.X_OAUTH1_API_BASE_URL || "https://api.x.com").replace(/\/+$/, "");
  const tweetFields = "text,author_id,created_at,conversation_id,referenced_tweets,note_tweet,attachments";
  const userFields = "username,name";
  const mediaFields = "url,preview_image_url,type";

  let rootTweet: XApiTweet | undefined;
  let rootUser: XApiUser | undefined;
  let rootMedia: XApiMedia[] | undefined;
  try {
    attempts.push("x_api_thread_lookup");
    const endpoint = `${apiBase}/2/tweets/${parsed.articleId}?tweet.fields=${encodeURIComponent(tweetFields)}&expansions=${encodeURIComponent("author_id,attachments.media_keys")}&user.fields=${encodeURIComponent(userFields)}&media.fields=${encodeURIComponent(mediaFields)}`;
    const { response, text } = await fetchText(endpoint, {
      headers: { Authorization: `Bearer ${bearer}` }
    });
    if (!response.ok) {
      attempts.push(`x_api_thread_lookup_http_${response.status}:${text.slice(0, 120)}`);
      return null;
    }
    const data = JSON.parse(text) as {
      data?: XApiTweet;
      includes?: { users?: XApiUser[]; media?: XApiMedia[] };
    };
    rootTweet = data.data;
    rootUser = userById(data.includes?.users, rootTweet?.author_id);
    rootMedia = data.includes?.media;
    if (!rootTweet || readXApiTweetText(rootTweet).length < 20) {
      attempts.push("x_api_thread_lookup_empty");
      return null;
    }
  } catch (error) {
    attempts.push(`x_api_thread_lookup_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
    return null;
  }

  const authorHandle = rootUser?.username || parsed.authorHandle;
  const conversationId = rootTweet.conversation_id || parsed.articleId;
  try {
    attempts.push("x_api_thread_search");
    const searchUrl = new URL(`${apiBase}/2/tweets/search/recent`);
    searchUrl.searchParams.set("query", `conversation_id:${conversationId} from:${authorHandle}`);
    searchUrl.searchParams.set("tweet.fields", tweetFields);
    searchUrl.searchParams.set("expansions", "author_id,attachments.media_keys");
    searchUrl.searchParams.set("user.fields", userFields);
    searchUrl.searchParams.set("media.fields", mediaFields);
    searchUrl.searchParams.set("max_results", "100");
    const { response, text } = await fetchText(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${bearer}` }
    });
    if (!response.ok) {
      attempts.push(`x_api_thread_search_http_${response.status}:${text.slice(0, 120)}`);
      return {
        ok: true,
        source: "x_api",
        text: readXApiTweetText(rootTweet),
        authorHandle,
        title: rootUser?.name,
        attempts
      };
    }
    const data = JSON.parse(text) as {
      data?: XApiTweet[];
      includes?: { users?: XApiUser[]; media?: XApiMedia[] };
      meta?: { result_count?: number };
    };
    const allTweets = [rootTweet, ...(Array.isArray(data.data) ? data.data : [])];
    const uniqueTweets = Array.from(
      new Map(
        allTweets
          .filter((tweet) => tweet.id && readXApiTweetText(tweet))
          .map((tweet) => [tweet.id, tweet])
      ).values()
    );
    const sorted = sortTweetsChronologically(uniqueTweets);
    const threadText = formatThreadText(sorted);
    if (sorted.length >= 2 && threadText.length >= readXApiTweetText(rootTweet).length + 20) {
      attempts.push(`x_api_thread_posts_${sorted.length}`);
      return {
        ok: true,
        source: "x_api_thread",
        text: threadText,
        authorHandle,
        title: rootUser?.name,
        mediaUrls: readXApiThreadMediaUrls(sorted, [...(rootMedia || []), ...(data.includes?.media || [])]),
        attempts
      };
    }
    attempts.push(`x_api_thread_single_post:${data.meta?.result_count ?? 0}`);
    return {
      ok: true,
      source: "x_api",
      text: readXApiTweetText(rootTweet),
      authorHandle,
      title: rootUser?.name,
      attempts
    };
  } catch (error) {
    attempts.push(`x_api_thread_search_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
      return {
        ok: true,
        source: "x_api",
        text: readXApiTweetText(rootTweet),
        authorHandle,
        title: rootUser?.name,
        mediaUrls: readXApiTweetMediaUrls(rootTweet, rootMedia),
        attempts
      };
    }
}

export async function fetchXArticleContent(articleUrl: string): Promise<XArticleContentResult> {
  const parsed = parseXArticleUrl(articleUrl);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, attempts: ["parse_url"] };
  }

  const attempts: string[] = [];
  let bearer = "";

  const fxThread = await fetchFxTwitterThread({ parsed, attempts });
  if (fxThread?.ok && fxThread.text.length >= 40) return fxThread;

  try {
    attempts.push("x_api_bearer");
    bearer = await getXBearerToken();
    if (bearer) {
      const threadResult = await fetchXThreadFromApi({ parsed, bearer, attempts });
      if (threadResult?.ok && threadResult.text.length >= 40) return threadResult;

      attempts.push("x_api");
      const apiBase = (process.env.X_OAUTH1_API_BASE_URL || "https://api.x.com").replace(/\/+$/, "");
      const endpoint = `${apiBase}/2/tweets/${parsed.articleId}?tweet.fields=text,author_id,created_at,lang,note_tweet,attachments&expansions=${encodeURIComponent("author_id,attachments.media_keys")}&user.fields=username,name&media.fields=url,preview_image_url,type`;
      const { response, text } = await fetchText(endpoint, {
        headers: { Authorization: `Bearer ${bearer}` }
      });
      if (response.ok) {
        const data = JSON.parse(text) as {
          data?: XApiTweet;
          includes?: { users?: Array<{ username?: string; name?: string }>; media?: XApiMedia[] };
        };
        const liveText = data.data ? readXApiTweetText(data.data) : "";
        if (liveText.length >= 40) {
          return {
            ok: true,
            source: "x_api",
            text: liveText,
            authorHandle: data.includes?.users?.[0]?.username || parsed.authorHandle,
            title: data.includes?.users?.[0]?.name,
            mediaUrls: readXApiTweetMediaUrls(data.data, data.includes?.media),
            attempts
          };
        }
        attempts.push("x_api_empty");
      } else {
        attempts.push(`x_api_http_${response.status}:${text.slice(0, 120)}`);
      }
    } else {
      attempts.push("x_api_missing_credentials");
    }
  } catch (error) {
    attempts.push(`x_api_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  try {
    attempts.push("syndication");
    const { response, text } = await fetchText(`https://cdn.syndication.twimg.com/widgets/tweet?id=${parsed.articleId}&lang=en`);
    if (response.ok) {
      const data = JSON.parse(text) as { text?: string; user?: { screen_name?: string; name?: string } };
      const liveText = decodeHtml(String(data.text || ""));
      if (liveText.length >= 40) {
        return {
          ok: true,
          source: "syndication",
          text: liveText,
          authorHandle: data.user?.screen_name || parsed.authorHandle,
          title: data.user?.name,
          attempts
        };
      }
      attempts.push("syndication_empty");
    } else {
      attempts.push(`syndication_http_${response.status}`);
    }
  } catch (error) {
    attempts.push(`syndication_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  try {
    attempts.push("oembed");
    const { response, text } = await fetchText(`https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(parsed.url)}`);
    if (response.ok) {
      const data = JSON.parse(text) as { html?: string; author_name?: string };
      const liveText = decodeHtml(String(data.html || ""));
      if (liveText.length >= 40) {
        return {
          ok: true,
          source: "oembed",
          text: liveText,
          authorHandle: parsed.authorHandle,
          title: data.author_name,
          attempts
        };
      }
      attempts.push("oembed_empty");
    } else {
      attempts.push(`oembed_http_${response.status}`);
    }
  } catch (error) {
    attempts.push(`oembed_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  try {
    attempts.push("html");
    const { response, text } = await fetchText(parsed.url);
    if (response.ok) {
      const metaDescription =
        text.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] ||
        text.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] ||
        "";
      const liveText = decodeHtml(metaDescription);
      if (liveText.length >= 40) {
        return {
          ok: true,
          source: "html",
          text: liveText,
          authorHandle: parsed.authorHandle,
          attempts
        };
      }
      attempts.push("html_empty");
    } else {
      attempts.push(`html_http_${response.status}`);
    }
  } catch (error) {
    attempts.push(`html_error:${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`);
  }

  return {
    ok: false,
    error: "Unable to fetch live X content from this URL.",
    attempts
  };
}

export function parseXArticleUrl(rawUrl: string): ParsedXArticleUrl {
  let url: URL;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    return { ok: false, error: "Submit a valid X article URL." };
  }

  const host = normalizeUrlHost(url.hostname);
  if (host !== "x.com" && host !== "twitter.com") {
    return { ok: false, error: "Only x.com or twitter.com links are accepted." };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const [handle, marker, id] = parts;
  if (!handle || !marker || !id) {
    return { ok: false, error: "Use a public X post/article URL that includes the author handle." };
  }
  if (handle.toLowerCase() === "i") {
    return { ok: false, error: "Use the public X URL with your handle, not an internal /i/ link." };
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return { ok: false, error: "The X URL author handle is invalid." };
  }
  if (!/^\d+$/.test(id)) {
    return { ok: false, error: "The X URL must include a numeric post/article id." };
  }
  if (marker !== "status" && marker !== "articles") {
    return { ok: false, error: "Submit an X status URL or X article URL." };
  }

  return {
    ok: true,
    url: `https://x.com/${handle}/${marker}/${id}`,
    authorHandle: handle,
    articleId: id,
    kind: marker === "articles" ? "article" : "status"
  };
}

export function getArticleContestPrizes(distribution?: RewardDistribution) {
  const prizes = Array.isArray(distribution?.prizes) && distribution.prizes.length > 0
    ? distribution.prizes
    : DEFAULT_PRIZES;
  return prizes
    .map((prize) => ({
      rank: Math.max(1, Math.floor(Number(prize.rank) || 1)),
      amount: String(prize.amount || "").trim(),
      slots: Math.max(1, Math.floor(Number(prize.slots) || 1)),
      label: prize.label
    }))
    .filter((prize) => prize.amount)
    .sort((a, b) => a.rank - b.rank);
}

export function getArticleContestMinimumWinnerScore(distribution?: RewardDistribution) {
  const configured = Number(distribution?.minimumWinnerScore);
  if (!Number.isFinite(configured)) return DEFAULT_MINIMUM_WINNER_SCORE;
  return Math.max(0, Math.min(100, configured));
}

export function isArticleContestDistribution(distribution?: RewardDistribution) {
  return distribution?.mode === "ranked_article_contest";
}

export function isSubmissionDeadlinePassed(deadline: string | undefined) {
  if (!deadline || deadline === "TBD") return false;
  const timestamp = +new Date(deadline);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() > timestamp;
}

export function isArticleContestResultsVisible(input: {
  deadline?: string;
  taskState?: string;
}) {
  return (
    input.taskState === "closed" ||
    input.taskState === "full" ||
    input.taskState === "refunded" ||
    isSubmissionDeadlinePassed(input.deadline)
  );
}

export function sanitizeArticleSubmissionForUser(
  submission: ArticleSubmission,
  input: { deadline?: string; taskState?: string }
): ArticleSubmission {
  if (isArticleContestResultsVisible(input)) return submission;
  return {
    ...submission,
    aiScore: undefined,
    aiReview: undefined,
    aiRubric: undefined,
    rank: undefined,
    prizeAmount: undefined,
    paymentTxHash: undefined,
    paymentExplorerUrl: undefined,
    reviewedAt: undefined
  };
}

function failedArticleScore(reason: string, model?: string, startedAt?: number): ArticleScoreResult {
  return {
    score: 0,
    rubric: {
      relevance: 0,
      originality: 0,
      clarity: 0,
      evidence: 0,
      narrative: 0
    },
    provider: "ai_error",
    model,
    latencyMs: startedAt ? Date.now() - startedAt : undefined,
    fallbackReason: reason,
    review: `AI review failed: ${reason}. This submission was not scored.`
  };
}

export function hasDefinitiveXNotFound(attempts: string[]) {
  const hardNotFoundAttempts = attempts.filter((attempt) =>
    /(?:^|_)http_404(?::|$)/.test(attempt) ||
    attempt.includes("code\":404") ||
    attempt.includes("\"status\":404")
  );
  return hardNotFoundAttempts.length >= 2;
}

function parseJsonObjectFromModel(content: string) {
  const trimmed = content.trim();
  const direct = JSON.parse(trimmed);
  return direct;
}

function stripThinkingBlocks(content: string) {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function extractLastJsonObject(content: string) {
  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let index = content.length - 1; index >= 0; index -= 1) {
    const char = content[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "}") {
      if (end === -1) end = index;
      depth += 1;
    } else if (char === "{") {
      depth -= 1;
      if (depth === 0 && end !== -1) {
        return content.slice(index, end + 1);
      }
    }
  }
  return "";
}

function tryParseModelJson(content: string) {
  const candidates = [
    content,
    content.includes("</think>") ? content.split(/<\/think>/i).at(-1) || "" : "",
    stripThinkingBlocks(content)
  ].filter((candidate) => candidate.trim());

  for (const candidate of candidates) {
    try {
      return parseJsonObjectFromModel(candidate);
    } catch {
      // Try structured extraction below.
    }
  }

  try {
    const fenced = stripThinkingBlocks(content).match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return parseJsonObjectFromModel(fenced);
  } catch {
    // Continue to object extraction.
  }

  for (const candidate of candidates) {
    const objectText = extractLastJsonObject(candidate);
    if (!objectText) continue;
    try {
      return parseJsonObjectFromModel(objectText);
    } catch {
      // Continue to next candidate.
    }
  }
  throw new Error("AI response did not contain a parseable JSON object");
}

function parseModelWeight(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseModelMaxTokens(provider: ArticleReviewProviderConfig, fallback: number) {
  const providerKey = provider.id.toUpperCase();
  const configured =
    process.env[`ARTICLE_REVIEW_${providerKey}_MAX_TOKENS`] ||
    process.env[`${providerKey}_REVIEW_MAX_TOKENS`] ||
    process.env[`${providerKey}_MAX_TOKENS`];
  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(256, Math.min(8000, Math.floor(parsed)));
}

function envEnabled(value: string | undefined, fallback = true) {
  if (value == null || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function reviewProtocol(value: string | undefined, fallback: ArticleReviewProviderConfig["protocol"]) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "anthropic") return "anthropic";
  if (normalized === "openai" || normalized === "openai_compatible") return "openai_compatible";
  return fallback;
}

export function getArticleReviewProviderConfigs(): ArticleReviewProviderConfig[] {
  const mimoBaseUrl = (process.env.MIMO_BASE_URL || "").replace(/\/+$/, "");
  const providers: ArticleReviewProviderConfig[] = [
    {
      id: "openai",
      label: process.env.OPENAI_REVIEW_LABEL || "GPT",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
      weight: parseModelWeight(process.env.OPENAI_REVIEW_WEIGHT, 1),
      protocol: "openai_compatible"
    },
    {
      id: "mimo",
      label: process.env.MIMO_REVIEW_LABEL || "Xiaomi MiMo",
      model: process.env.MIMO_MODEL || "MiMo-V2.5-Pro",
      apiKey: process.env.MIMO_API_KEY || process.env.MIMO_AUTH_TOKEN,
      baseUrl: mimoBaseUrl,
      weight: parseModelWeight(process.env.MIMO_REVIEW_WEIGHT, 1),
      protocol: reviewProtocol(
        process.env.MIMO_PROTOCOL,
        mimoBaseUrl.toLowerCase().includes("/anthropic") ? "anthropic" : "openai_compatible"
      )
    },
    {
      id: "minimax",
      label: process.env.MINIMAX_REVIEW_LABEL || "MiniMax",
      model: process.env.MINIMAX_MODEL || "MiniMax-M2.7-highspeed",
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: (process.env.MINIMAX_BASE_URL || "https://minnimax.chat/v1").replace(/\/+$/, ""),
      weight: parseModelWeight(process.env.MINIMAX_REVIEW_WEIGHT, 1),
      protocol: "openai_compatible"
    },
    {
      id: "deepseek",
      label: process.env.DEEPSEEK_REVIEW_LABEL || "DeepSeek",
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
      weight: parseModelWeight(process.env.DEEPSEEK_REVIEW_WEIGHT, 1),
      protocol: "openai_compatible"
    },
    {
      id: "anthropic",
      label: process.env.ANTHROPIC_REVIEW_LABEL || "Claude",
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
      baseUrl: (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, ""),
      weight: parseModelWeight(process.env.ANTHROPIC_REVIEW_WEIGHT, 1),
      protocol: "anthropic"
    }
  ];

  const requested = (process.env.ARTICLE_REVIEW_PROVIDERS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const requestedSet = requested.length ? new Set(requested) : null;

  return providers.filter((provider) => {
    if (requestedSet && !requestedSet.has(provider.id)) return false;
    return envEnabled(process.env[`ARTICLE_REVIEW_${provider.id.toUpperCase()}_ENABLED`], true);
  });
}

function getOpenAiReviewProviderConfig(): ArticleReviewProviderConfig | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return {
    id: "openai",
    label: process.env.OPENAI_REVIEW_LABEL || "GPT",
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: (process.env.OPENAI_IMAGE_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    weight: parseModelWeight(process.env.OPENAI_IMAGE_REVIEW_WEIGHT || process.env.OPENAI_REVIEW_WEIGHT, 1),
    protocol: "openai_compatible"
  };
}

function getImageReviewProviderConfigs() {
  const providers = getArticleReviewProviderConfigs();
  if (
    !providers.some((provider) => provider.id === "openai") &&
    envEnabled(process.env.ARTICLE_REVIEW_OPENAI_IMAGE_FALLBACK_ENABLED, true)
  ) {
    const openai = getOpenAiReviewProviderConfig();
    if (openai) providers.push(openai);
  }
  return providers;
}

function buildArticleReviewPrompt(input: {
  title: string;
  content: string;
  articleUrl: string;
  contentSource?: "x_live" | "snapshot_fallback";
  xFetchError?: string;
  reviewTarget?: ArticleContestReviewTarget;
  imageVisible?: boolean;
}) {
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const sourceInstruction = input.contentSource === "snapshot_fallback"
    ? [
        "The content field is the user-submitted article text because live X fetching failed.",
        "You may score it, but the review must explicitly say it used article text fallback and should note lower confidence.",
        input.xFetchError ? `X fetch failure: ${input.xFetchError}` : ""
      ].filter(Boolean).join(" ")
    : "The content field is live text fetched from the submitted X URL. Judge only that fetched X content.";

  const system = [
    "You score X article submissions for AI2Human.",
    sourceInstruction,
    "Return strict JSON with keys: score, review, rubric.",
    "Rubric keys must be relevance, originality, clarity, evidence, narrative.",
    "Each rubric value is 0-20. score is 0-100.",
    "Do not wrap the JSON in markdown. Do not add prose outside JSON.",
    "This is a community article contest, not a strict security audit.",
    "Project relevance is a hard gate.",
    `Contest target project: ${reviewTarget.projectName}.`,
    `Accepted project signals: ${[
      ...reviewTarget.projectAliases,
      ...reviewTarget.projectHandles.map((handle) => `@${handle}`),
      ...reviewTarget.projectUrls,
      ...reviewTarget.tokenSymbols.map((symbol) => `$${symbol}`),
      ...reviewTarget.contractAddresses
    ].join(", ") || reviewTarget.projectName}.`,
    reviewTarget.thesis ? `Contest thesis: ${reviewTarget.thesis}` : "",
    reviewTarget.requiredTopics.length ? `Preferred topics: ${reviewTarget.requiredTopics.join("; ")}` : "",
    `The article must explicitly discuss ${reviewTarget.projectName} or clearly connect its thesis to ${reviewTarget.projectName}'s contest topic.`,
    "General AI agent, DeFAI, trading, crypto, or web3 posts must score below 25 unless they directly connect the idea back to the contest target project.",
    "A post about another project can score above 25 only if it clearly compares that project to the contest target project or explains what the target project should learn from it.",
    "If project relevance is weak, set relevance <= 4 and total score <= 20 even if the writing is clear.",
    `Reward clear explanations of ${reviewTarget.projectName}, the configured task theme, concrete workflows, proof, verification, settlement, and why the workflow matters.`,
    "Do not require transaction hashes or production-grade proof to give a fair medium score.",
    "Score 70-90 for strong original writing with specific workflow detail, examples, and a clear AI2Human thesis.",
    "Score 45-69 for relevant posts that explain the concept but stay somewhat promotional or light on specifics.",
    "Score 25-44 for short but relevant posts with limited detail.",
    "Score below 25 for pure token hype, copied text, off-topic content, or claims with almost no explanation.",
    input.imageVisible
      ? "This submission includes an attached image from the live X post. Inspect it and include visual brand fit, readability, and originality in your judgment."
      : "",
    "Keep the review balanced and public-facing: mention the strongest point first, then the main limitation, without insulting the author."
  ].filter(Boolean).join(" ");
  const user = JSON.stringify({
    articleUrl: input.articleUrl,
    title: input.title,
    content: input.content
  });
  return { system, user };
}

function buildBannerImageReviewPrompt(input: {
  title: string;
  content: string;
  articleUrl: string;
  reviewTarget?: ArticleContestReviewTarget;
  imageVisible: boolean;
}) {
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const system = [
    "You score banner image submissions for AI2Human.",
    "Return strict JSON with keys: score, review, rubric.",
    "Rubric keys must be relevance, originality, clarity, evidence, narrative.",
    "Each rubric value is 0-20. score is 0-100.",
    "Do not wrap the JSON in markdown. Do not add prose outside JSON.",
    `Target project: ${reviewTarget.projectName}.`,
    "The submitted asset is intended to be a DexScreener banner for the target project.",
    input.imageVisible
      ? "Inspect the banner image directly and judge the actual visual quality, readability, composition, and brand fit."
      : "The image itself is not visible in this request. Score conservatively from the design note only and explicitly say confidence is lower because visual inspection was unavailable.",
    "Interpret rubric keys like this:",
    "relevance = fit for the target project and DexScreener banner use case.",
    "originality = whether the concept feels distinct instead of generic.",
    "clarity = readability, hierarchy, and whether the message is easy to grasp quickly.",
    "evidence = craftsmanship, polish, and whether the design note supports clear execution choices.",
    "narrative = visual energy, emotional pull, and whether the composition makes someone want to click or remember the project.",
    "Penalize generic crypto banners with weak branding, clutter, low readability, or no clear connection to the target project.",
    "Reward banners that make the project look more credible, memorable, and clickable.",
    "Keep the review balanced and public-facing: mention the strongest point first, then the main limitation, without insulting the submitter."
  ].join(" ");
  const user = JSON.stringify({
    imageUrl: input.articleUrl,
    title: input.title,
    designNote: input.content
  });
  return { system, user };
}

function buildImagePostReviewPrompt(input: {
  title: string;
  content: string;
  articleUrl: string;
  contentSource?: "x_live" | "snapshot_fallback";
  xFetchError?: string;
  reviewTarget?: ArticleContestReviewTarget;
  imageVisible: boolean;
}) {
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const sourceInstruction = input.contentSource === "snapshot_fallback"
    ? [
        "The text field is the user-submitted fallback because live X fetching failed or was partial.",
        "Lower confidence slightly and say clearly that fallback text was used.",
        input.xFetchError ? `X fetch failure: ${input.xFetchError}` : ""
      ].filter(Boolean).join(" ")
    : "The text field is live text fetched from the submitted X post or thread.";

  const system = [
    "You score image-post submissions for an AI2Human creative reward event.",
    sourceInstruction,
    "Return strict JSON with keys: score, review, rubric.",
    "Rubric keys must be relevance, originality, clarity, evidence, narrative.",
    "Each rubric value is 0-20. score is 0-100.",
    "Do not wrap JSON in markdown. Do not add prose outside JSON.",
    `Target project: ${reviewTarget.projectName}.`,
    "This contest is for an X post with an attached image that could work as a DexScreener-style header/banner.",
    input.imageVisible
      ? "Inspect the attached image directly. The image is the main judging surface."
      : "The attached image could not be inspected directly. Score conservatively and say confidence is lower.",
    "The post text is only a short supporting rationale for the banner.",
    "Weight your judgment roughly like this: image quality and brand fit 75%, text rationale 25%.",
    "Do not reward longer text. Ignore filler, repeated slogans, generic promo claims, token price talk, or copied marketing copy.",
    "A short, clear reason is better than a long thread.",
    "If the text does not explain the banner idea, cap evidence and narrative even if the image is decent.",
    "Reward submissions where the image clearly fits AI2Human's identity: execution network, human fallback, proof, verification, settlement, serious product energy.",
    "Penalize off-topic memes, unrelated market screenshots, cluttered layouts, unreadable text, weak composition, or generic crypto art with no clear AI2Human connection.",
    "Relevance = fit for AI2Human and DexScreener banner use.",
    "Originality = whether the creative concept feels distinct, not template-like.",
    "Clarity = readability, hierarchy, and whether the banner works quickly at header size.",
    "Evidence = whether the short reason clearly explains the design decision and matches the visual.",
    "Narrative = whether the image and reason together create a memorable AI2Human story.",
    "Keep the review balanced and public-facing: mention the strongest point first, then the main limitation, without insulting the author."
  ].filter(Boolean).join(" ");

  const user = JSON.stringify({
    articleUrl: input.articleUrl,
    title: input.title,
    textReason: input.content
  });
  return { system, user };
}

function normalizeModelReview(input: {
  provider: ArticleReviewProviderConfig;
  content: string;
  latencyMs: number;
}): ArticleModelReviewResult {
  const parsed = tryParseModelJson(input.content) as {
    score?: number;
    review?: string;
    rubric?: Record<string, number>;
  };
  const rubric = parsed.rubric || {};
  return {
    providerId: input.provider.id,
    providerLabel: input.provider.label,
    model: input.provider.model,
    weight: input.provider.weight,
    status: "scored",
    score: clampScore(parsed.score),
    review: String(parsed.review || "AI review completed.").slice(0, 1600),
    latencyMs: input.latencyMs,
    rubric: {
      relevance: clampRubricScore(rubric.relevance),
      originality: clampRubricScore(rubric.originality),
      clarity: clampRubricScore(rubric.clarity),
      evidence: clampRubricScore(rubric.evidence),
      narrative: clampRubricScore(rubric.narrative)
    }
  };
}

function reviewClaimsImageWasNotInspected(review?: string) {
  const text = String(review || "").toLowerCase();
  if (!text) return false;
  if (/\bwithout\b.{0,80}\b(seeing|viewing|inspecting|access)\b.{0,80}\b(image|banner|visual)\b/.test(text)) {
    return true;
  }
  if (/\b(cannot|can't|could not|unable to)\b.{0,80}\b(see|view|inspect|access|evaluate|assess)\b.{0,80}\b(image|banner|visual)\b/.test(text)) {
    return true;
  }
  if (/\b(image|banner|visual)\b.{0,50}\b(not visible|unavailable|not inspected|not viewable|not accessible)\b/.test(text)) {
    return true;
  }
  return [
    "cannot view the attached image",
    "cannot view the actual image",
    "cannot inspect the attached image",
    "cannot inspect the actual image",
    "cannot directly inspect",
    "cannot directly view",
    "could not be inspected",
    "could not inspect",
    "could not view",
    "unable to inspect",
    "unable to view",
    "without being able to view",
    "without seeing the actual image",
    "without seeing the actual banner",
    "without seeing the actual banner image",
    "without seeing the image",
    "without direct image access",
    "without direct access to view",
    "without direct access to the image",
    "without the actual image",
    "image cannot be directly inspected",
    "image itself is not visible",
    "image is not visible",
    "visual execution cannot be assessed",
    "visual assessment relies on contextual assumptions"
  ].some((phrase) => text.includes(phrase));
}

function rejectImageBlindReviews(reviews: ArticleModelReviewResult[], transport: "data_url" | "remote_url") {
  return reviews.map((review) => {
    if (review.status !== "scored" || !reviewClaimsImageWasNotInspected(review.review)) {
      return review;
    }
    return {
      providerId: review.providerId,
      providerLabel: review.providerLabel,
      model: review.model,
      weight: review.weight,
      status: "failed" as const,
      latencyMs: review.latencyMs,
      error: `Model said the image was not inspected via ${transport}.`
    };
  });
}

async function requestConfirmedImageReviews(input: {
  providers: ArticleReviewProviderConfig[];
  prompt: { system: string; user: string };
  modelImage: Awaited<ReturnType<typeof prepareImageForModel>>;
}) {
  const attempts: Array<{ url: string; transport: "data_url" | "remote_url" }> = [
    { url: input.modelImage.url, transport: input.modelImage.transport }
  ];
  if (input.modelImage.remoteUrl && input.modelImage.remoteUrl !== input.modelImage.url) {
    attempts.push({ url: input.modelImage.remoteUrl, transport: "remote_url" });
  }
  if (input.modelImage.transport === "data_url") {
    attempts.push({ url: input.modelImage.url, transport: "data_url" });
    attempts.push({ url: input.modelImage.remoteUrl, transport: "remote_url" });
  }

  const allReviews: ArticleModelReviewResult[] = [];
  for (const attempt of attempts) {
    const rawReviews = await Promise.all(
      input.providers.map((provider) =>
        provider.protocol === "anthropic"
          ? requestAnthropicArticleReview({ provider, ...input.prompt, imageUrl: attempt.url })
          : requestOpenAiCompatibleArticleReview({ provider, ...input.prompt, imageUrl: attempt.url })
      )
    );
    const reviews = rejectImageBlindReviews(rawReviews, attempt.transport);
    allReviews.push(...reviews);
    if (reviews.some((item) => item.status === "scored")) break;
  }
  return allReviews;
}

async function requestOpenAiCompatibleArticleReview(input: {
  provider: ArticleReviewProviderConfig;
  system: string;
  user: string;
  imageUrl?: string;
}): Promise<ArticleModelReviewResult> {
  const startedAt = Date.now();
  const { provider } = input;
  if (!provider.apiKey) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "skipped",
      latencyMs: 0,
      error: `${provider.label} API key is not configured`
    };
  }
  if (!provider.baseUrl) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "skipped",
      latencyMs: 0,
      error: `${provider.label} base URL is not configured`
    };
  }

  let response: Response;
  try {
    response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: input.system
          },
          {
            role: "user",
            content: input.imageUrl
              ? [
                  { type: "text", text: input.user },
                  { type: "image_url", image_url: { url: input.imageUrl } }
                ]
              : input.user
          }
        ]
      })
    });
  } catch (error) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `request failed (${error instanceof Error ? error.message : "network error"})`
    };
  }

  if (!response.ok) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `HTTP ${response.status}`
    };
  }

  const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: "empty response"
    };
  }

  try {
    return normalizeModelReview({ provider, content, latencyMs: Date.now() - startedAt });
  } catch (error) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `invalid JSON (${error instanceof Error ? error.message : "unknown parse error"})`
    };
  }
}

async function requestAnthropicArticleReview(input: {
  provider: ArticleReviewProviderConfig;
  system: string;
  user: string;
  imageUrl?: string;
}): Promise<ArticleModelReviewResult> {
  const startedAt = Date.now();
  const { provider } = input;
  if (!provider.apiKey) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "skipped",
      latencyMs: 0,
      error: `${provider.label} API key is not configured`
    };
  }

  let response: Response;
  const baseUrl = (provider.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
  if (input.imageUrl) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "skipped",
      latencyMs: 0,
      error: `${provider.label} image review is not supported in the current adapter`
    };
  }
  try {
    response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        "x-api-key": provider.apiKey,
        "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: parseModelMaxTokens(provider, provider.id === "mimo" ? 3000 : 1800),
        temperature: 0.2,
        system: input.system,
        messages: [{ role: "user", content: input.user }]
      })
    });
  } catch (error) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `request failed (${error instanceof Error ? error.message : "network error"})`
    };
  }

  if (!response.ok) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `HTTP ${response.status}`
    };
  }

  const data = await response.json().catch(() => null) as { content?: Array<{ type?: string; text?: string; thinking?: string }> } | null;
  const contentItems = Array.isArray(data?.content) ? data.content : [];
  const content = contentItems.map((item) => item.text || "").join("\n").trim();
  if (!content) {
    const thinkingLength = contentItems.reduce((sum, item) => sum + String(item.thinking || "").length, 0);
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: thinkingLength > 0
        ? `empty text response (thinking-only response, ${thinkingLength} chars)`
        : "empty response"
    };
  }

  try {
    return normalizeModelReview({ provider, content, latencyMs: Date.now() - startedAt });
  } catch (error) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      weight: provider.weight,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      error: `invalid JSON (${error instanceof Error ? error.message : "unknown parse error"})`
    };
  }
}

function mergeRubricScores(results: ArticleModelReviewResult[]) {
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0) || 1;
  const metric = (key: keyof Omit<ArticleReviewRubric, "audit">) =>
    clampRubricScore(results.reduce((sum, item) => sum + (Number(item.rubric?.[key]) || 0) * item.weight, 0) / totalWeight);
  return {
    relevance: metric("relevance"),
    originality: metric("originality"),
    clarity: metric("clarity"),
    evidence: metric("evidence"),
    narrative: metric("narrative")
  };
}

function aggregateArticleModelReviews(input: {
  modelReviews: ArticleModelReviewResult[];
  startedAt: number;
}): ArticleScoreResult {
  const scored = input.modelReviews.filter((item) => item.status === "scored" && item.score != null);
  if (!scored.length) {
    const configured = input.modelReviews.map((item) => `${item.providerLabel}: ${item.error || item.status}`).join("; ");
    return failedArticleScore(`No AI review provider returned a usable score. ${configured}`, "multi-model-consensus", input.startedAt);
  }

  const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0) || 1;
  const score = clampScore(scored.reduce((sum, item) => sum + Number(item.score) * item.weight, 0) / totalWeight);
  const strongest = [...scored].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const weakest = [...scored].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
  const modelSummary = scored.map((item) => `${item.providerLabel} ${Number(item.score).toFixed(1)}`).join(", ");
  const disagreement = strongest && weakest ? Math.abs((strongest.score || 0) - (weakest.score || 0)) : 0;

  return {
    score,
    provider: scored.length > 1 ? "multi_model" : "ai",
    model: scored.length > 1 ? "weighted-consensus" : scored[0]?.model,
    latencyMs: Date.now() - input.startedAt,
    modelReviews: input.modelReviews,
    review: [
      scored.length > 1
        ? `Weighted multi-model review used ${scored.length} models (${modelSummary}). Final score is the weighted consensus.`
        : `${scored[0]?.providerLabel || "AI"} review used ${scored[0]?.model || "configured model"}.`,
      strongest?.review ? `Strongest positive signal: ${strongest.review}` : "",
      disagreement >= 18
        ? `Model disagreement was noticeable (${disagreement.toFixed(1)} points), so admin should treat this as a review requiring human judgment before public announcement.`
        : ""
    ].filter(Boolean).join(" ").slice(0, 1800),
    rubric: mergeRubricScores(scored)
  };
}

export async function scoreArticleSubmission(input: {
  title: string;
  content: string;
  articleUrl: string;
  contentSource?: "x_live" | "snapshot_fallback";
  xFetchError?: string;
  reviewTarget?: ArticleContestReviewTarget;
  imageUrl?: string;
}): Promise<ArticleScoreResult> {
  const startedAt = Date.now();
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const relevanceGate = projectRelevanceGateScore({
    title: input.title,
    content: input.content,
    articleUrl: input.articleUrl,
    startedAt,
    reviewTarget
  });
  if (relevanceGate) return relevanceGate;

  const providers = getArticleReviewProviderConfigs();
  if (!providers.length) {
    return failedArticleScore("No article review providers are enabled", "multi-model-consensus", startedAt);
  }

  const prompt = buildArticleReviewPrompt({ ...input, reviewTarget, imageVisible: Boolean(input.imageUrl) });
  const modelReviews = await Promise.all(
    providers.map((provider) =>
      provider.protocol === "anthropic"
        ? requestAnthropicArticleReview({ provider, ...prompt, imageUrl: input.imageUrl })
        : requestOpenAiCompatibleArticleReview({ provider, ...prompt, imageUrl: input.imageUrl })
    )
  );
  if (modelReviews.some((item) => item.status === "scored")) {
    return aggregateArticleModelReviews({ modelReviews, startedAt });
  }

  const fallbackPrompt = buildArticleReviewPrompt({ ...input, reviewTarget, imageVisible: false });
  const fallbackReviews = await Promise.all(
    providers.map((provider) =>
      provider.protocol === "anthropic"
        ? requestAnthropicArticleReview({ provider, ...fallbackPrompt })
        : requestOpenAiCompatibleArticleReview({ provider, ...fallbackPrompt })
    )
  );
  if (!fallbackReviews.some((item) => item.status === "scored")) {
    return failedArticleScore("No article review provider returned a usable score", "multi-model-consensus", startedAt);
  }
  const aggregated = aggregateArticleModelReviews({ modelReviews: fallbackReviews, startedAt });
  return input.imageUrl
    ? {
        ...aggregated,
        review: `Attached image was not inspected directly. ${aggregated.review}`
      }
    : aggregated;
}

async function scoreImagePostSubmission(input: {
  title: string;
  content: string;
  articleUrl: string;
  contentSource?: "x_live" | "snapshot_fallback";
  xFetchError?: string;
  reviewTarget?: ArticleContestReviewTarget;
  imageUrl: string;
}): Promise<ArticleScoreResult> {
  const startedAt = Date.now();
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const providers = getImageReviewProviderConfigs();
  if (!providers.length) {
    return failedArticleScore("No image-post review providers are enabled", "image-post-consensus", startedAt);
  }

  const prompt = buildImagePostReviewPrompt({
    ...input,
    reviewTarget,
    imageVisible: true
  });
  const modelImage = await prepareImageForModel(input.imageUrl);
  const modelReviews = await requestConfirmedImageReviews({ providers, prompt, modelImage });
  if (modelReviews.some((item) => item.status === "scored")) {
    return aggregateArticleModelReviews({ modelReviews, startedAt });
  }

  return failedArticleScore(
    `No image-post review provider returned a usable score after confirmed visual inspection. ${modelImage.error || ""}`.trim(),
    "image-post-consensus",
    startedAt
  );
}

async function scoreBannerImageSubmission(input: {
  title: string;
  content: string;
  articleUrl: string;
  reviewTarget?: ArticleContestReviewTarget;
}): Promise<ArticleScoreResult> {
  const startedAt = Date.now();
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const providers = getImageReviewProviderConfigs();
  if (!providers.length) {
    return failedArticleScore("No image review providers are enabled", "banner-image-consensus", startedAt);
  }

  const visionPrompt = buildBannerImageReviewPrompt({
    ...input,
    reviewTarget,
    imageVisible: true
  });
  const modelImage = await prepareImageForModel(input.articleUrl);
  const visionReviews = await requestConfirmedImageReviews({ providers, prompt: visionPrompt, modelImage });
  if (visionReviews.some((item) => item.status === "scored")) {
    return aggregateArticleModelReviews({ modelReviews: visionReviews, startedAt });
  }

  return failedArticleScore(
    `No model returned a usable banner score after confirmed visual inspection. ${modelImage.error || ""}`.trim(),
    "banner-image-consensus",
    startedAt
  );
}

export async function reviewArticleSubmission(input: {
  submission: ArticleSubmission;
  minimumWinnerScore: number;
  reviewTarget?: ArticleContestReviewTarget;
  task?: Pick<Task, "campaign" | "rewardDistribution">;
  now?: string;
}): Promise<ArticleSubmissionReviewResult> {
  const { submission, minimumWinnerScore } = input;
  const reviewTarget = input.reviewTarget || getArticleContestReviewTarget();
  const now = input.now || new Date().toISOString();
  const requiresAttachedImage = Boolean(input.task?.campaign?.requiresImage);
  if (isBannerImageContestTask(input.task)) {
    const imageAsset = await fetchPublicImageAsset(submission.articleUrl);
    const reviewContent = submission.contentSnapshot.trim();
    const audit: ArticleReviewAudit = {
      contentSource: imageAsset.ok ? "x_live" : "snapshot_fallback",
      fetchSource: imageAsset.ok ? "html" : "snapshot_fallback",
      fetchAttempts: imageAsset.attempts,
      xFetchError: imageAsset.ok ? undefined : imageAsset.error,
      reviewedTextExcerpt: reviewedTextExcerpt(reviewContent),
      reviewedTextLength: reviewContent.length,
      minimumWinnerScore
    };

    if (!imageAsset.ok) {
      const error = `${imageAsset.error} Attempts: ${imageAsset.attempts.join(" -> ")}`;
      return {
        submission: {
          ...submission,
          status: "invalid",
          aiScore: 0,
          aiReview: error,
          aiRubric: {
            relevance: 0,
            originality: 0,
            clarity: 0,
            evidence: 0,
            narrative: 0,
            audit: {
              ...audit,
              provider: "ai_error"
            }
          },
          rank: undefined,
          prizeAmount: undefined,
          reviewedAt: now,
          updatedAt: now
        },
        debug: {
          submissionId: submission.id,
          xHandle: submission.xHandle,
          walletAddress: submission.walletAddress,
          provider: "ai_error",
          source: "image_not_found",
          contentSource: "snapshot_fallback",
          contentLength: reviewContent.length,
          excerpt: reviewedTextExcerpt(reviewContent),
          fetchAttempts: imageAsset.attempts,
          error
        }
      };
    }

    const score = await scoreBannerImageSubmission({
      title: submission.title,
      content: reviewContent,
      articleUrl: imageAsset.url,
      reviewTarget
    });
    const sourceLabel = "Banner image submission";
    const debug = {
      submissionId: submission.id,
      xHandle: submission.xHandle,
      walletAddress: submission.walletAddress,
      score: score.score,
      provider: score.provider,
      model: score.model,
      latencyMs: score.latencyMs,
      source: "banner_image",
      contentSource: "x_live",
      contentLength: reviewContent.length,
      excerpt: reviewedTextExcerpt(reviewContent),
      fetchAttempts: imageAsset.attempts,
      fallbackReason: score.fallbackReason
    };

    if (score.provider === "ai_error") {
      return {
        submission: {
          ...submission,
          status: "submitted",
          aiScore: undefined,
          aiReview: `Source: ${sourceLabel}. ${score.review}`,
          aiRubric: {
            ...score.rubric,
            audit: {
              ...audit,
              provider: score.provider,
              model: score.model,
              latencyMs: score.latencyMs,
              modelReviews: score.modelReviews,
              activeModelCount: score.modelReviews?.filter((item) => item.status === "scored").length,
              skippedModelCount: score.modelReviews?.filter((item) => item.status !== "scored").length
            }
          },
          rank: undefined,
          prizeAmount: undefined,
          reviewedAt: now,
          updatedAt: now
        },
        debug
      };
    }

    return {
      submission: {
        ...submission,
        status: "submitted",
        aiScore: score.score,
        aiReview: `Source: ${sourceLabel}. ${score.review}`,
        aiRubric: {
          ...score.rubric,
          audit: {
            ...audit,
            provider: score.provider,
            model: score.model,
            latencyMs: score.latencyMs,
            reviewTargetProject: reviewTarget.projectName,
            aggregateStrategy: score.provider === "multi_model" ? "weighted_consensus" : undefined,
            activeModelCount: score.modelReviews?.filter((item) => item.status === "scored").length,
            skippedModelCount: score.modelReviews?.filter((item) => item.status !== "scored").length,
            modelReviews: score.modelReviews
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug
    };
  }
  const liveContent = await fetchXArticleContent(submission.articleUrl);
  const reviewContent = liveContent.ok ? liveContent.text : submission.contentSnapshot.trim();
  const contentSource = liveContent.ok ? "x_live" as const : "snapshot_fallback" as const;
  const xFetchError = liveContent.ok ? "" : `${liveContent.error} Attempts: ${liveContent.attempts.join(" -> ")}`;
  const attachedImageUrl = liveContent.ok ? liveContent.mediaUrls?.[0] : undefined;
  const audit = {
    contentSource,
    fetchSource: liveContent.ok ? liveContent.source : "snapshot_fallback" as const,
    fetchAttempts: liveContent.attempts,
    xFetchError: liveContent.ok ? undefined : xFetchError,
    reviewedTextExcerpt: reviewedTextExcerpt(reviewContent),
    reviewedTextLength: reviewContent.length,
    imageUrl: attachedImageUrl,
    minimumWinnerScore
  };

  if (
    liveContent.ok &&
    liveContent.authorHandle &&
    (!xHandlesMatch(liveContent.authorHandle, submission.authorHandle) ||
      !xHandlesMatch(liveContent.authorHandle, submission.xHandle))
  ) {
    const error = `Live X author @${liveContent.authorHandle} does not match submitted author @${submission.authorHandle}.`;
    return {
      submission: {
        ...submission,
        status: "invalid",
        aiScore: 0,
        aiReview: error,
        aiRubric: {
          relevance: 0,
          originality: 0,
          clarity: 0,
          evidence: 0,
          narrative: 0,
          audit: {
            ...audit,
            provider: "ai_error"
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug: {
        submissionId: submission.id,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        provider: "ai_error",
        source: liveContent.source,
        contentSource,
        contentLength: reviewContent.length,
        excerpt: reviewedTextExcerpt(reviewContent),
        fetchAttempts: liveContent.attempts,
        error
      }
    };
  }

  if (requiresAttachedImage && !attachedImageUrl) {
    const error = liveContent.ok
      ? "The submitted X post does not include a detectable image attachment. This contest requires at least one attached image."
      : `We could not verify an attached image on this X post. ${xFetchError}`;
    return {
      submission: {
        ...submission,
        status: "invalid",
        aiScore: 0,
        aiReview: error,
        aiRubric: {
          relevance: 0,
          originality: 0,
          clarity: 0,
          evidence: 0,
          narrative: 0,
          audit: {
            ...audit,
            provider: "ai_error"
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug: {
        submissionId: submission.id,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        provider: "ai_error",
        source: liveContent.ok ? liveContent.source : "image_required",
        contentSource,
        contentLength: reviewContent.length,
        excerpt: reviewedTextExcerpt(reviewContent),
        fetchAttempts: liveContent.attempts,
        error
      }
    };
  }

  if (!liveContent.ok && hasDefinitiveXNotFound(liveContent.attempts)) {
    const error = `The submitted X link could not be found. Please submit a public, existing X post, article, or thread URL. ${xFetchError}`;
    return {
      submission: {
        ...submission,
        status: "invalid",
        aiScore: 0,
        aiReview: error,
        aiRubric: {
          relevance: 0,
          originality: 0,
          clarity: 0,
          evidence: 0,
          narrative: 0,
          audit: {
            ...audit,
            provider: "ai_error"
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug: {
        submissionId: submission.id,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        provider: "ai_error",
        source: "x_not_found",
        contentSource,
        contentLength: reviewContent.length,
        excerpt: reviewedTextExcerpt(reviewContent),
        fetchAttempts: liveContent.attempts,
        error
      }
    };
  }

  if (!liveContent.ok && reviewContent.length < 200) {
    const error = `X live content fetch failed and no usable article text fallback was provided. ${xFetchError}`;
    return {
      submission: {
        ...submission,
        status: "invalid",
        aiScore: 0,
        aiReview: error,
        aiRubric: {
          relevance: 0,
          originality: 0,
          clarity: 0,
          evidence: 0,
          narrative: 0,
          audit: {
            ...audit,
            provider: "ai_error"
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug: {
        submissionId: submission.id,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        provider: "ai_error",
        source: "snapshot_fallback",
        contentSource,
        contentLength: reviewContent.length,
        excerpt: reviewedTextExcerpt(reviewContent),
        fetchAttempts: liveContent.attempts,
        error
      }
    };
  }

  if (requiresAttachedImage && attachedImageUrl) {
    const imageCheck = await validateDexscreenerHeaderImage(attachedImageUrl);
    if (!imageCheck.ok) {
      const error = imageCheck.error;
      return {
        submission: {
          ...submission,
          status: "invalid",
          aiScore: 0,
          aiReview: error,
          aiRubric: {
            relevance: 0,
            originality: 0,
            clarity: 0,
            evidence: 0,
            narrative: 0,
            audit: {
              ...audit,
              provider: "ai_error"
            }
          },
          rank: undefined,
          prizeAmount: undefined,
          reviewedAt: now,
          updatedAt: now
        },
        debug: {
          submissionId: submission.id,
          xHandle: submission.xHandle,
          walletAddress: submission.walletAddress,
          provider: "ai_error",
          source: liveContent.ok ? liveContent.source : "image_validation_failed",
          contentSource,
          contentLength: reviewContent.length,
          excerpt: reviewedTextExcerpt(reviewContent),
          fetchAttempts: imageCheck.attempts,
          error
        }
      };
    }
  }

  const score = requiresAttachedImage && attachedImageUrl
    ? await scoreImagePostSubmission({
        title: submission.title,
        content: reviewContent,
        articleUrl: submission.articleUrl,
        contentSource,
        xFetchError,
        reviewTarget,
        imageUrl: attachedImageUrl
      })
    : await scoreArticleSubmission({
        title: submission.title,
        content: reviewContent,
        articleUrl: submission.articleUrl,
        contentSource,
        xFetchError,
        reviewTarget,
        imageUrl: attachedImageUrl
      });
  const sourceLabel = liveContent.ok
    ? `X live content (${liveContent.source})${attachedImageUrl ? " with attached image" : ""}`
    : `submitted article text fallback; live X fetch failed (${xFetchError})`;
  const debug = {
    submissionId: submission.id,
    xHandle: submission.xHandle,
    walletAddress: submission.walletAddress,
    score: score.score,
    provider: score.provider,
    model: score.model,
    latencyMs: score.latencyMs,
    source: liveContent.ok ? liveContent.source : "snapshot_fallback",
    contentSource,
    contentLength: reviewContent.length,
    excerpt: reviewedTextExcerpt(reviewContent),
    fetchAttempts: liveContent.attempts,
    fallbackReason: score.fallbackReason
  };

  if (score.provider === "ai_error") {
    return {
      submission: {
        ...submission,
        status: "submitted",
        aiScore: undefined,
        aiReview: `Source: ${sourceLabel}. ${score.review}`,
        aiRubric: {
          ...score.rubric,
          audit: {
            ...audit,
            provider: score.provider,
            model: score.model,
            latencyMs: score.latencyMs,
            modelReviews: score.modelReviews,
            activeModelCount: score.modelReviews?.filter((item) => item.status === "scored").length,
            skippedModelCount: score.modelReviews?.filter((item) => item.status !== "scored").length
          }
        },
        rank: undefined,
        prizeAmount: undefined,
        reviewedAt: now,
        updatedAt: now
      },
      debug
    };
  }

  return {
    submission: {
      ...submission,
      status: "submitted",
      aiScore: score.score,
      aiReview: `Source: ${sourceLabel}. ${score.review}`,
      aiRubric: {
        ...score.rubric,
        audit: {
          ...audit,
          provider: score.provider,
          model: score.model,
          latencyMs: score.latencyMs,
          relevanceGate: score.model === "project-relevance-gate",
          relevanceSignals: detectProjectSignals(`${submission.articleUrl}\n${submission.title}\n${reviewContent}`, reviewTarget),
          reviewTargetProject: reviewTarget.projectName,
          aggregateStrategy: score.provider === "multi_model" ? "weighted_consensus" : undefined,
          activeModelCount: score.modelReviews?.filter((item) => item.status === "scored").length,
          skippedModelCount: score.modelReviews?.filter((item) => item.status !== "scored").length,
          modelReviews: score.modelReviews
        }
      },
      rank: undefined,
      prizeAmount: undefined,
      reviewedAt: now,
      updatedAt: now
    },
    debug
  };
}

export function assignArticleContestPrizes(
  submissions: ArticleSubmission[],
  distribution?: RewardDistribution
) {
  const prizes = getArticleContestPrizes(distribution);
  const minimumWinnerScore = getArticleContestMinimumWinnerScore(distribution);
  const copyRisks = detectSubmissionCopyRisks(submissions);
  const annotatedSubmissions = submissions.map((submission) => {
    const copyRisk = copyRisks.get(submission.id);
    if (!copyRisk || !submission.aiRubric) return submission;
    return {
      ...submission,
      aiRubric: {
        ...submission.aiRubric,
        audit: {
          ...(submission.aiRubric.audit || {}),
          ...copyRisk
        }
      }
    };
  });
  const ranked = annotatedSubmissions
    .filter((submission) => {
      if (submission.status === "invalid" || submission.status === "rejected") return false;
      if (submission.aiRubric?.audit?.prizeIneligible) return false;
      if (submission.status === "paid") return true;
      return (submission.aiScore || 0) >= minimumWinnerScore;
    })
    .sort((a, b) => {
      const scoreDelta = (b.aiScore || 0) - (a.aiScore || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return +new Date(a.submittedAt) - +new Date(b.submittedAt);
    });

  const winners = new Map<string, { rank: number; amount: string }>();
  let cursor = 0;
  for (const prize of prizes) {
    for (let slot = 0; slot < prize.slots; slot += 1) {
      const submission = ranked[cursor];
      if (!submission) break;
      winners.set(submission.id, { rank: prize.rank, amount: prize.amount });
      cursor += 1;
    }
  }

  return annotatedSubmissions.map((submission) => {
    const winner = winners.get(submission.id);
    if (!winner) {
      const audit: ArticleReviewAudit = {
        ...(submission.aiRubric?.audit || {}),
        minimumWinnerScore
      };
      const aiRubric: ArticleReviewRubric | undefined = submission.aiRubric
        ? { ...submission.aiRubric, audit }
        : undefined;
      return {
        ...submission,
        status: (
          submission.status === "paid" ||
          submission.status === "invalid" ||
          submission.status === "rejected"
        ) ? submission.status : "reviewed" as const,
        aiRubric,
        rank: undefined,
        prizeAmount: undefined
      };
    }
    const audit: ArticleReviewAudit = {
      ...(submission.aiRubric?.audit || {}),
      minimumWinnerScore
    };
    return {
      ...submission,
      status: submission.status === "paid" ? submission.status : "winner" as const,
      aiRubric: submission.aiRubric ? { ...submission.aiRubric, audit } : undefined,
      rank: winner.rank,
      prizeAmount: winner.amount
    };
  });
}

function normalizeCopyText(text: string) {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactCopyText(text: string) {
  return normalizeCopyText(text).replace(/\s+/g, "");
}

function charShingles(value: string, size = 12) {
  const compact = compactCopyText(value);
  const shingles = new Set<string>();
  if (compact.length < size) return shingles;
  for (let index = 0; index <= compact.length - size; index += 3) {
    shingles.add(compact.slice(index, index + size));
  }
  return shingles;
}

function shingleContainment(a: Set<string>, b: Set<string>) {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  if (!smaller.size || !larger.size) return 0;
  let overlap = 0;
  for (const item of smaller) {
    if (larger.has(item)) overlap += 1;
  }
  return Math.round((overlap / smaller.size) * 1000) / 1000;
}

function detectSubmissionCopyRisks(submissions: ArticleSubmission[]) {
  const risks = new Map<string, Pick<ArticleReviewAudit, "copyRisk" | "copyRiskReason" | "copyMatchedSubmissionId" | "copySimilarity">>();
  const reviewed = submissions
    .filter((submission) => {
      if (submission.status === "invalid" || submission.status === "rejected") return false;
      return compactCopyText(submission.contentSnapshot || "").length >= 320;
    })
    .sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));

  const fingerprints = reviewed.map((submission) => ({
    submission,
    compact: compactCopyText(submission.contentSnapshot || ""),
    shingles: charShingles(submission.contentSnapshot || "")
  }));

  for (let index = 0; index < fingerprints.length; index += 1) {
    const current = fingerprints[index];
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = fingerprints[previousIndex];
      if (!current.compact || !previous.compact) continue;
      const similarity = current.compact === previous.compact
        ? 1
        : shingleContainment(current.shingles, previous.shingles);
      const minLength = Math.min(current.compact.length, previous.compact.length);
      const copyRisk = similarity >= 0.94 && minLength >= 500
        ? "high"
        : similarity >= 0.86 && minLength >= 700
          ? "possible"
          : undefined;
      if (!copyRisk) continue;
      risks.set(current.submission.id, {
        copyRisk,
        copySimilarity: similarity,
        copyMatchedSubmissionId: previous.submission.id,
        copyRiskReason: copyRisk === "high"
          ? "Very similar article text to an earlier submission. Soft flag only; admin should review before payout."
          : "Possible article text overlap with an earlier submission. Soft flag only; not automatically disqualified."
      });
      break;
    }
  }

  return risks;
}

export function xHandlesMatch(a: string, b: string) {
  return normalizeXHandle(a) === normalizeXHandle(b);
}
