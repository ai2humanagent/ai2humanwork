import type { ArticleSubmission, RewardDistribution } from "./store";
import { normalizeXHandle } from "./xIdentity";

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
  rubric: Record<string, number>;
  provider: "ai" | "ai_error";
  model?: string;
  latencyMs?: number;
  fallbackReason?: string;
};

export type XArticleContentResult = {
  ok: true;
  source: "x_api" | "syndication" | "oembed" | "html";
  text: string;
  authorHandle?: string;
  title?: string;
} | {
  ok: false;
  error: string;
  attempts: string[];
};

const DEFAULT_PRIZES = [
  { rank: 1, amount: "50 USDC", slots: 1, label: "1st place" },
  { rank: 2, amount: "20 USDC", slots: 1, label: "2nd place" },
  { rank: 3, amount: "10 USDC", slots: 2, label: "3rd place" }
];

function clampScore(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num * 10) / 10));
}

function clampRubricScore(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(20, Math.round(num * 10) / 10));
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

export async function fetchXArticleContent(articleUrl: string): Promise<XArticleContentResult> {
  const parsed = parseXArticleUrl(articleUrl);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, attempts: ["parse_url"] };
  }

  const attempts: string[] = [];

  try {
    attempts.push("x_api");
    const bearer = await getXBearerToken();
    if (bearer) {
      const endpoint = `https://api.twitter.com/2/tweets/${parsed.articleId}?tweet.fields=text,author_id,created_at,lang&expansions=author_id&user.fields=username,name`;
      const { response, text } = await fetchText(endpoint, {
        headers: { Authorization: `Bearer ${bearer}` }
      });
      if (response.ok) {
        const data = JSON.parse(text) as {
          data?: { text?: string };
          includes?: { users?: Array<{ username?: string; name?: string }> };
        };
        const liveText = String(data.data?.text || "").trim();
        if (liveText.length >= 40) {
          return {
            ok: true,
            source: "x_api",
            text: liveText,
            authorHandle: data.includes?.users?.[0]?.username || parsed.authorHandle,
            title: data.includes?.users?.[0]?.name
          };
        }
        attempts.push("x_api_empty");
      } else {
        attempts.push(`x_api_http_${response.status}`);
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
          title: data.user?.name
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
          title: data.author_name
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
          authorHandle: parsed.authorHandle
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

export function isArticleContestDistribution(distribution?: RewardDistribution) {
  return distribution?.mode === "ranked_article_contest";
}

export function isSubmissionDeadlinePassed(deadline: string | undefined) {
  if (!deadline || deadline === "TBD") return false;
  const timestamp = +new Date(deadline);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() > timestamp;
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

export async function scoreArticleSubmission(input: {
  title: string;
  content: string;
  articleUrl: string;
  contentSource?: "x_live" | "snapshot_fallback";
  xFetchError?: string;
}): Promise<ArticleScoreResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = Date.now();
  if (!apiKey) {
    return failedArticleScore("OPENAI_API_KEY is not configured", model, startedAt);
  }
  const sourceInstruction = input.contentSource === "snapshot_fallback"
    ? [
        "The content field is the user-submitted snapshot because live X fetching failed.",
        "You may score it, but the review must explicitly say it used snapshot fallback and should note lower confidence.",
        input.xFetchError ? `X fetch failure: ${input.xFetchError}` : ""
      ].filter(Boolean).join(" ")
    : "The content field is live text fetched from the submitted X URL. Judge only that fetched X content.";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You score X article submissions for ai2human.",
            sourceInstruction,
            "Return strict JSON with keys: score, review, rubric.",
            "Rubric keys must be relevance, originality, clarity, evidence, narrative.",
            "Each rubric value is 0-20. score is 0-100.",
            "Do not wrap the JSON in markdown. Do not add prose outside JSON.",
            "Reward concrete explanation of agent-human task execution, proof, verification, and settlement.",
            "Penalize generic hype, copied text, weak structure, and claims without examples."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            articleUrl: input.articleUrl,
            title: input.title,
            content: input.content
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return failedArticleScore(`AI provider returned HTTP ${response.status}`, model, startedAt);
  }

  const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return failedArticleScore("AI provider returned an empty response", model, startedAt);
  }

  try {
    const parsed = tryParseModelJson(content) as {
      score?: number;
      review?: string;
      rubric?: Record<string, number>;
    };
    const rubric = parsed.rubric || {};
    return {
      score: clampScore(parsed.score),
      review: String(parsed.review || "AI review completed.").slice(0, 1000),
      provider: "ai",
      model,
      latencyMs: Date.now() - startedAt,
      rubric: {
        relevance: clampRubricScore(rubric.relevance),
        originality: clampRubricScore(rubric.originality),
        clarity: clampRubricScore(rubric.clarity),
        evidence: clampRubricScore(rubric.evidence),
        narrative: clampRubricScore(rubric.narrative)
      }
    };
  } catch (error) {
    return failedArticleScore(
      `AI response was not valid JSON (${error instanceof Error ? error.message : "unknown parse error"})`,
      model,
      startedAt
    );
  }
}

export function assignArticleContestPrizes(
  submissions: ArticleSubmission[],
  distribution?: RewardDistribution
) {
  const prizes = getArticleContestPrizes(distribution);
  const ranked = submissions
    .filter((submission) => submission.status !== "invalid" && submission.status !== "rejected")
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

  return submissions.map((submission) => {
    const winner = winners.get(submission.id);
    if (!winner) {
      return {
        ...submission,
        status: submission.status === "paid" ? submission.status : "reviewed" as const,
        rank: undefined,
        prizeAmount: undefined
      };
    }
    return {
      ...submission,
      status: submission.status === "paid" ? submission.status : "winner" as const,
      rank: winner.rank,
      prizeAmount: winner.amount
    };
  });
}

export function xHandlesMatch(a: string, b: string) {
  return normalizeXHandle(a) === normalizeXHandle(b);
}
