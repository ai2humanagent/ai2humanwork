import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminAuthContext } from "../../../../../lib/adminAuth";
import { readDb, updateDb } from "../../../../../lib/store";
import { appendEvidence } from "../../../../../lib/taskEvidence";
import {
  assignArticleContestPrizes,
  fetchXArticleContent,
  isArticleContestDistribution,
  isSubmissionDeadlinePassed,
  scoreArticleSubmission
} from "../../../../../lib/articleContest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const force = Boolean(body.force);
  const closeNow = Boolean(body.closeNow);
  const requestId = crypto.randomUUID();
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!isArticleContestDistribution(task.rewardDistribution)) {
    return NextResponse.json({ error: "This task is not a ranked article contest." }, { status: 400 });
  }
  if (!force && !closeNow && !isSubmissionDeadlinePassed(task.deadline)) {
    return NextResponse.json({ error: "Submission deadline has not passed yet." }, { status: 400 });
  }

  const submissions = db.articleSubmissions.filter((item) => item.taskId === taskId);
  console.info("[ArticleContest] review:start", {
    requestId,
    taskId,
    force,
    closeNow,
    deadline: task.deadline,
    submissionCount: submissions.length,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    hasApiKey: Boolean(process.env.OPENAI_API_KEY)
  });
  if (!submissions.length) {
    return NextResponse.json({ error: "No article submissions to review." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const scoreDebug: Array<{
    submissionId: string;
    xHandle: string;
    walletAddress: string;
    score?: number;
    provider?: string;
    model?: string;
    latencyMs?: number;
    source?: string;
    fallbackReason?: string;
    error?: string;
  }> = [];
  const scored = await Promise.all(
    submissions.map(async (submission) => {
      if (submission.status === "paid") return submission;
      const liveContent = await fetchXArticleContent(submission.articleUrl);
      if (!liveContent.ok) {
        scoreDebug.push({
          submissionId: submission.id,
          xHandle: submission.xHandle,
          walletAddress: submission.walletAddress,
          score: 0,
          provider: "x_fetch",
          error: liveContent.error,
          fallbackReason: liveContent.attempts.join(" | ")
        });
        return {
          ...submission,
          status: "invalid" as const,
          aiScore: 0,
          aiReview: `X live content fetch failed. ${liveContent.error} Attempts: ${liveContent.attempts.join(" -> ")}`,
          aiRubric: {
            relevance: 0,
            originality: 0,
            clarity: 0,
            evidence: 0,
            narrative: 0
          },
          rank: undefined,
          prizeAmount: undefined,
          reviewedAt: now,
          updatedAt: now
        };
      }
      const score = await scoreArticleSubmission({
        title: submission.title,
        content: liveContent.text,
        articleUrl: submission.articleUrl
      });
      scoreDebug.push({
        submissionId: submission.id,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        score: score.score,
        provider: score.provider,
        model: score.model,
        latencyMs: score.latencyMs,
        source: liveContent.source,
        fallbackReason: score.fallbackReason
      });
      if (score.provider !== "ai") {
        return {
          ...submission,
          status: "invalid" as const,
          aiScore: 0,
          aiReview: `Source: X live content (${liveContent.source}). ${score.review}`,
          aiRubric: score.rubric,
          rank: undefined,
          prizeAmount: undefined,
          reviewedAt: now,
          updatedAt: now
        };
      }
      return {
        ...submission,
        status: "reviewed" as const,
        aiScore: score.score,
        aiReview: `Source: X live content (${liveContent.source}). ${score.review}`,
        aiRubric: score.rubric,
        reviewedAt: now,
        updatedAt: now
      };
    })
  );
  const ranked = assignArticleContestPrizes(scored, task.rewardDistribution);
  const winners = ranked.filter((submission) => submission.status === "winner" || submission.status === "paid");
  const providerCounts = scoreDebug.reduce<Record<string, number>>((counts, item) => {
    const key = item.provider || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const reviewLog = {
    requestId,
    taskId,
    closedNow: closeNow,
    force,
    reviewed: ranked.length,
    winners: winners.length,
    providerCounts,
    top: ranked
      .filter((submission) => submission.rank)
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, 10)
      .map((submission) => ({
        submissionId: submission.id,
        rank: submission.rank,
        xHandle: submission.xHandle,
        walletAddress: submission.walletAddress,
        score: submission.aiScore,
        prizeAmount: submission.prizeAmount
      })),
    scoreDebug
  };
  console.info("[ArticleContest] review:complete", reviewLog);

  await updateDb((nextDb) => {
    nextDb.articleSubmissions = nextDb.articleSubmissions.map((submission) => {
      if (submission.taskId !== taskId) return submission;
      return ranked.find((item) => item.id === submission.id) || submission;
    });
    const targetTask = nextDb.tasks.find((item) => item.id === taskId);
    if (targetTask) {
      if (closeNow) {
        targetTask.deadline = now;
      }
      targetTask.updatedAt = now;
      appendEvidence(targetTask, {
        by: "system",
        type: "log",
        content: `article_review:${JSON.stringify(reviewLog)}`,
        createdAt: now
      });
    }
  });

  return NextResponse.json({
    success: true,
    requestId,
    deadline: closeNow ? now : task.deadline,
    closedNow: closeNow,
    reviewed: ranked.length,
    winners: winners.length,
    submissions: ranked
  });
}
