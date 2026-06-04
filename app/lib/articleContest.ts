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
  provider: "ai" | "heuristic";
  model?: string;
  latencyMs?: number;
  fallbackReason?: string;
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

function normalizeUrlHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
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

function heuristicScore(title: string, content: string, fallbackReason: string): ArticleScoreResult {
  const text = `${title}\n${content}`.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const hasStructure = /(^|\n)(1\.|2\.|3\.|#|- |\*)/.test(text);
  const mentionsA2h = /(ai2human|a2h|agent|human|proof|verify|settle|usdc|on-chain|onchain)/i.test(text);
  const evidence = /(example|proof|screenshot|transaction|wallet|task|operator|fallback)/i.test(text);

  const rubric = {
    relevance: clampScore(mentionsA2h ? 24 : 12),
    originality: clampScore(Math.min(20, 8 + wordCount / 40)),
    clarity: clampScore(hasStructure ? 18 : 12),
    evidence: clampScore(evidence ? 18 : 10),
    narrative: clampScore(Math.min(20, 8 + wordCount / 55))
  };
  const score = clampScore(Object.values(rubric).reduce((sum, item) => sum + item, 0));
  return {
    score,
    rubric,
    provider: "heuristic",
    fallbackReason,
    review: `Heuristic review used: ${fallbackReason}. Score reflects relevance, originality, clarity, evidence, and narrative strength.`
  };
}

export async function scoreArticleSubmission(input: {
  title: string;
  content: string;
  articleUrl: string;
}): Promise<ArticleScoreResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = Date.now();
  if (!apiKey) {
    return heuristicScore(input.title, input.content, "OPENAI_API_KEY is not configured");
  }

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
            "Return strict JSON with keys: score, review, rubric.",
            "Rubric keys must be relevance, originality, clarity, evidence, narrative.",
            "Each rubric value is 0-20. score is 0-100.",
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
    return heuristicScore(
      input.title,
      input.content,
      `AI provider returned HTTP ${response.status}`
    );
  }

  const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return heuristicScore(input.title, input.content, "AI provider returned an empty response");
  }

  try {
    const parsed = JSON.parse(content) as {
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
        relevance: clampScore(rubric.relevance),
        originality: clampScore(rubric.originality),
        clarity: clampScore(rubric.clarity),
        evidence: clampScore(rubric.evidence),
        narrative: clampScore(rubric.narrative)
      }
    };
  } catch {
    return heuristicScore(input.title, input.content, "AI response was not valid JSON");
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
