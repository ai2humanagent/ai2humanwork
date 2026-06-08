import type { ArticleSubmission, ArticleReviewAudit, ArticleReviewRubric, RewardDistribution } from "./store";
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
  rubric: ArticleReviewRubric;
  provider: "ai" | "ai_error";
  model?: string;
  latencyMs?: number;
  fallbackReason?: string;
};

export type XArticleContentResult = {
  ok: true;
  source: "fxtwitter_thread" | "fxtwitter_status" | "x_api_thread" | "x_api" | "syndication" | "oembed" | "html";
  text: string;
  authorHandle?: string;
  title?: string;
  attempts: string[];
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
const DEFAULT_MINIMUM_WINNER_SCORE = 25;

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

type XApiTweet = {
  id: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  note_tweet?: {
    text?: string;
  };
};

type XApiUser = {
  id?: string;
  username?: string;
  name?: string;
};

function readXApiTweetText(tweet: XApiTweet) {
  return String(tweet.note_tweet?.text || tweet.text || "").trim();
}

function userById(users: XApiUser[] | undefined, id: string | undefined) {
  if (!id || !Array.isArray(users)) return undefined;
  return users.find((user) => user.id === id);
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
  author?: {
    screen_name?: string;
    name?: string;
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

function sortFxStatusesChronologically(statuses: FxTwitterStatus[]) {
  return [...statuses].sort((a, b) => {
    const at = Number(a.created_timestamp) || +new Date(a.created_at || "");
    const bt = Number(b.created_timestamp) || +new Date(b.created_at || "");
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    if (a.id && b.id) return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
    return 0;
  });
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
  const tweetFields = "text,author_id,created_at,conversation_id,referenced_tweets,note_tweet";
  const userFields = "username,name";

  let rootTweet: XApiTweet | undefined;
  let rootUser: XApiUser | undefined;
  try {
    attempts.push("x_api_thread_lookup");
    const endpoint = `${apiBase}/2/tweets/${parsed.articleId}?tweet.fields=${encodeURIComponent(tweetFields)}&expansions=author_id&user.fields=${encodeURIComponent(userFields)}`;
    const { response, text } = await fetchText(endpoint, {
      headers: { Authorization: `Bearer ${bearer}` }
    });
    if (!response.ok) {
      attempts.push(`x_api_thread_lookup_http_${response.status}:${text.slice(0, 120)}`);
      return null;
    }
    const data = JSON.parse(text) as {
      data?: XApiTweet;
      includes?: { users?: XApiUser[] };
    };
    rootTweet = data.data;
    rootUser = userById(data.includes?.users, rootTweet?.author_id);
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
    searchUrl.searchParams.set("expansions", "author_id");
    searchUrl.searchParams.set("user.fields", userFields);
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
      includes?: { users?: XApiUser[] };
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
      const endpoint = `${apiBase}/2/tweets/${parsed.articleId}?tweet.fields=text,author_id,created_at,lang,note_tweet&expansions=author_id&user.fields=username,name`;
      const { response, text } = await fetchText(endpoint, {
        headers: { Authorization: `Bearer ${bearer}` }
      });
      if (response.ok) {
        const data = JSON.parse(text) as {
          data?: XApiTweet;
          includes?: { users?: Array<{ username?: string; name?: string }> };
        };
        const liveText = data.data ? readXApiTweetText(data.data) : "";
        if (liveText.length >= 40) {
          return {
            ok: true,
            source: "x_api",
            text: liveText,
            authorHandle: data.includes?.users?.[0]?.username || parsed.authorHandle,
            title: data.includes?.users?.[0]?.name,
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
            "This is a community article contest, not a strict security audit.",
            "Reward clear explanations of ai2human, agent-human cooperation, proof, verification, settlement, and why the workflow matters.",
            "Do not require transaction hashes or production-grade proof to give a fair medium score.",
            "Score 70-90 for strong original writing with specific workflow detail, examples, and a clear ai2human thesis.",
            "Score 45-69 for relevant posts that explain the concept but stay somewhat promotional or light on specifics.",
            "Score 25-44 for short but relevant posts with limited detail.",
            "Score below 25 for pure token hype, copied text, off-topic content, or claims with almost no explanation.",
            "Keep the review balanced and public-facing: mention the strongest point first, then the main limitation, without insulting the author."
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
      review: String(parsed.review || "AI review completed.").slice(0, 1600),
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
  const minimumWinnerScore = getArticleContestMinimumWinnerScore(distribution);
  const ranked = submissions
    .filter((submission) => {
      if (submission.status === "invalid" || submission.status === "rejected") return false;
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

  return submissions.map((submission) => {
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
        status: submission.status === "paid" ? submission.status : "reviewed" as const,
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

export function xHandlesMatch(a: string, b: string) {
  return normalizeXHandle(a) === normalizeXHandle(b);
}
