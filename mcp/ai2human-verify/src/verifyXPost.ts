import type { CheckResult, VerifyResult } from "./types.js";

const FXTWITTER_API = "https://api.fxtwitter.com/status/";

type FxTweet = {
  tweet?: {
    text?: string;
    created_at?: string;
    author?: { screen_name?: string; name?: string };
    media?: { all?: Array<{ url?: string; thumbnail_url?: string }> };
  };
};

export function parseXPostUrl(
  raw: string
): { ok: true; url: string; handle: string; id: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    return { ok: false, error: "Not a valid URL." };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "x.com" && host !== "twitter.com") {
    return { ok: false, error: "Only x.com / twitter.com links are accepted." };
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const [handle, marker, id] = parts;
  if (!handle || !marker || !id) {
    return { ok: false, error: "URL must include the author handle and post id." };
  }
  if (handle.toLowerCase() === "i") {
    return { ok: false, error: "Use the public post URL, not an /i/ link." };
  }
  if (marker !== "status" || !/^\d+$/.test(id)) {
    return { ok: false, error: "Use a numeric status URL, e.g. https://x.com/handle/status/123..." };
  }
  return { ok: true, url: `https://x.com/${handle}/status/${id}`, handle, id };
}

function normalizeHandle(value: string): string {
  return String(value || "").replace(/^@/, "").trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesHashtag(text: string, tag: string): boolean {
  const value = String(tag || "").replace(/^#/, "").toLowerCase();
  if (!value) return false;
  const normalized = ` ${text.toLowerCase()} `;
  return new RegExp(`(^|[^a-z0-9_])#${escapeRegExp(value)}([^a-z0-9_]|$)`).test(normalized);
}

function includesMention(text: string, mention: string): boolean {
  const value = String(mention || "").replace(/^@/, "").toLowerCase();
  if (!value) return false;
  const normalized = ` ${text.toLowerCase()} `;
  return new RegExp(`(^|[^a-z0-9_])@?${escapeRegExp(value)}([^a-z0-9_]|$)`).test(normalized);
}

export async function verifyXPostClaim(input: {
  postUrl: string;
  expectedAuthorHandle?: string;
  requiredHashtags?: string[];
  requiredMentions?: string[];
  contentKeywords?: string[];
  maxAgeHours?: number;
}): Promise<VerifyResult> {
  const checks: CheckResult[] = [];
  const parsed = parseXPostUrl(input.postUrl);
  if (!parsed.ok) {
    return {
      verdict: "fail",
      checks: [{ name: "url", passed: false, detail: parsed.error }]
    };
  }
  checks.push({ name: "url", passed: true, detail: parsed.url });

  let data: FxTweet;
  try {
    const res = await fetch(`${FXTWITTER_API}${parsed.id}`);
    data = (await res.json().catch(() => ({}))) as FxTweet;
  } catch {
    return {
      verdict: "unverifiable",
      checks: [...checks, { name: "fetch_live_post", passed: false, detail: "Could not reach the X lookup service." }]
    };
  }

  const tweet = data?.tweet;
  const text = tweet?.text || "";
  const author = normalizeHandle(tweet?.author?.screen_name || "");
  if (!tweet || !text) {
    return {
      verdict: "unverifiable",
      checks: [...checks, { name: "fetch_live_post", passed: false, detail: "Post not found or not public." }]
    };
  }
  checks.push({
    name: "fetch_live_post",
    passed: true,
    detail: `source=fxtwitter, author=@${author || "unknown"}`
  });

  if (input.expectedAuthorHandle) {
    const expected = normalizeHandle(input.expectedAuthorHandle);
    const ok = Boolean(author) && author === expected;
    checks.push({
      name: "author_match",
      passed: ok,
      detail: ok ? `@${author}` : `post is @${author || "unknown"}, expected @${expected}`
    });
  }

  const hashtags = (input.requiredHashtags || []).map(String);
  const mentions = (input.requiredMentions || []).map(String);
  const keywords = (input.contentKeywords || []).map(String);
  const matched = [
    ...hashtags.filter((h) => includesHashtag(text, h)),
    ...mentions.filter((m) => includesMention(text, m)),
    ...keywords.filter((k) => k && text.toLowerCase().includes(k.toLowerCase()))
  ];
  const wanted = [...hashtags, ...mentions, ...keywords].filter(Boolean);
  if (wanted.length > 0) {
    const ok = matched.length > 0;
    checks.push({
      name: "content_signals",
      passed: ok,
      detail: ok
        ? `matched: ${[...new Set(matched)].join(", ")}`
        : "no campaign keyword, hashtag, or mention found in the post"
    });
  }

  if (input.maxAgeHours && tweet.created_at) {
    const ageHours = (Date.now() - +new Date(tweet.created_at)) / 3_600_000;
    const ok = Number.isFinite(ageHours) && ageHours <= input.maxAgeHours;
    checks.push({
      name: "max_age",
      passed: ok,
      detail: ok ? `${ageHours.toFixed(1)}h old` : `post is ${ageHours.toFixed(1)}h old (limit ${input.maxAgeHours}h)`
    });
  }

  const failed = checks.filter((c) => !c.passed);
  return {
    verdict: failed.length === 0 ? "pass" : "fail",
    checks,
    evidence: {
      postUrl: parsed.url,
      authorHandle: author ? `@${author}` : undefined,
      source: "fxtwitter",
      textExcerpt: text.slice(0, 240),
      matched: [...new Set(matched)],
      publishedAt: tweet.created_at
    }
  };
}
