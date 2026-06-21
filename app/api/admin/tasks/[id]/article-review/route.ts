import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminAuthContext } from "../../../../../lib/adminAuth";
import { readDb, updateDb, type ArticleSubmission, type Task } from "../../../../../lib/store";
import { appendEvidence } from "../../../../../lib/taskEvidence";
import {
  applyArticleEngagementWeights,
  assignArticleContestPrizes,
  getArticleReviewProviderConfigs,
  getArticleContestReviewTarget,
  getArticleContestMinimumWinnerScore,
  isArticleContestDistribution,
  isSubmissionDeadlinePassed,
  reviewArticleSubmission
} from "../../../../../lib/articleContest";
import { anchorArticleReviewOnBase, ARTICLE_REVIEW_ANCHOR_PREFIX } from "../../../../../lib/reviewAnchor";
import { getPrizePoolSignerAddress } from "../../../../../lib/prizePool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasFinalArticleReview(task: Task) {
  return (task.evidence || []).some((item) => String(item.content || "").startsWith("article_review:"));
}

function csvSet(value: string | undefined) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function getPrizeIneligibleRules() {
  const wallets = csvSet(process.env.ARTICLE_CONTEST_PRIZE_INELIGIBLE_WALLETS);
  const handles = csvSet(process.env.ARTICLE_CONTEST_PRIZE_INELIGIBLE_HANDLES);
  const signer = getPrizePoolSignerAddress().toLowerCase();
  if (signer) wallets.add(signer);
  return { wallets, handles };
}

function applyPrizeIneligibleRules(submissions: ArticleSubmission[]) {
  const { wallets, handles } = getPrizeIneligibleRules();
  return submissions.map((submission) => {
    const walletIneligible = wallets.has((submission.walletAddress || "").toLowerCase());
    const handleIneligible = handles.has(normalizeHandle(submission.xHandle)) || handles.has(normalizeHandle(submission.authorHandle));
    if (!walletIneligible && !handleIneligible) return submission;
    const reason = walletIneligible
      ? "Official/backend signer wallet is prize-ineligible."
      : "Official/team X handle is prize-ineligible.";
    return {
      ...submission,
      aiReview: [
        submission.aiReview || "",
        `Prize eligibility: this submission is displayed for transparency but excluded from prize ranking. ${reason}`
      ].filter(Boolean).join(" "),
      aiRubric: {
        ...(submission.aiRubric || {}),
        audit: {
          ...(submission.aiRubric?.audit || {}),
          prizeIneligible: true,
          prizeIneligibleReason: reason
        }
      }
    };
  });
}

function buildAnchorPayload(input: {
  task: Task;
  ranked: Awaited<ReturnType<typeof assignArticleContestPrizes>>;
  minimumWinnerScore: number;
  reviewTarget: ReturnType<typeof getArticleContestReviewTarget>;
  reviewedAt: string;
  requestId: string;
}) {
  return {
    version: "a2h-review-anchor-v1",
    requestId: input.requestId,
    task: {
      id: input.task.id,
      title: input.task.title,
      deadline: input.task.deadline,
      mode: input.task.rewardDistribution?.mode,
      totalPool: input.task.rewardDistribution?.totalPool || input.task.budget,
      minimumWinnerScore: input.minimumWinnerScore,
      reviewTarget: {
        projectName: input.reviewTarget.projectName,
        projectHandles: input.reviewTarget.projectHandles,
        projectAliases: input.reviewTarget.projectAliases
      }
    },
    reviewedAt: input.reviewedAt,
    submissions: [...input.ranked]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((submission) => ({
        id: submission.id,
        walletAddress: submission.walletAddress,
        xHandle: submission.xHandle,
        articleUrl: submission.articleUrl,
        title: submission.title,
        status: submission.status,
        aiScore: submission.aiScore ?? null,
        aiReview: submission.aiReview ?? null,
        aiRubric: submission.aiRubric ?? null,
        rank: submission.rank ?? null,
        prizeAmount: submission.prizeAmount ?? null,
        reviewedAt: submission.reviewedAt ?? null
      }))
  };
}

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
  const requestedForce = Boolean(body.force);
  const closeNow = Boolean(body.closeNow);
  const requestedSubmissionIds = Array.isArray(body.submissionIds)
    ? new Set(body.submissionIds.map((item: unknown) => String(item || "").trim()).filter(Boolean))
    : null;
  const refreshOnly = requestedForce && !closeNow;
  const requestId = crypto.randomUUID();
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!isArticleContestDistribution(task.rewardDistribution)) {
    return NextResponse.json({ error: "This task is not a ranked article contest." }, { status: 400 });
  }
  if (hasFinalArticleReview(task)) {
    return NextResponse.json(
      { error: "This article contest has already been finalized. Duplicate AI review is blocked." },
      { status: 409 }
    );
  }
  if (!refreshOnly && !closeNow && !isSubmissionDeadlinePassed(task.deadline)) {
    return NextResponse.json({ error: "Submission deadline has not passed yet." }, { status: 400 });
  }

  const submissions = db.articleSubmissions.filter((item) => item.taskId === taskId);
  console.info("[ArticleContest] review:start", {
    requestId,
    taskId,
    requestedForce,
    force: requestedForce,
    refreshOnly,
    closeNow,
    deadline: task.deadline,
    submissionCount: submissions.length,
    requestedSubmissionCount: requestedSubmissionIds?.size || 0,
    providers: getArticleReviewProviderConfigs().map((provider) => ({
      id: provider.id,
      label: provider.label,
      model: provider.model,
      weight: provider.weight,
      configured: Boolean(provider.apiKey)
    }))
  });
  if (!submissions.length) {
    return NextResponse.json({ error: "No article submissions to review." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const minimumWinnerScore = getArticleContestMinimumWinnerScore(task.rewardDistribution);
  const reviewTarget = getArticleContestReviewTarget(task);
  const scoreDebug: Array<{
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
  }> = [];
  const scored: ArticleSubmission[] = [];
  let reprocessed = 0;
  let reusedPreviews = 0;
  const missingScores: string[] = [];
  for (const submission of submissions) {
    if (requestedSubmissionIds && !requestedSubmissionIds.has(submission.id)) {
      reusedPreviews += 1;
      scored.push(submission);
      continue;
    }
    if (submission.status === "paid") {
      scored.push(submission);
      continue;
    }
    if (!requestedForce && submission.aiScore != null && submission.reviewedAt) {
      reusedPreviews += 1;
      scored.push(submission);
      continue;
    }
    if (!requestedForce) {
      missingScores.push(submission.id);
      scored.push(submission);
      continue;
    }
    const result = await reviewArticleSubmission({ submission, minimumWinnerScore, reviewTarget, task, now });
    reprocessed += 1;
    scoreDebug.push(result.debug);
    scored.push(result.submission);
  }
  if (missingScores.length > 0 && !requestedForce) {
    return NextResponse.json(
      {
        error: `Cannot lock final results yet. ${missingScores.length} submission${missingScores.length === 1 ? "" : "s"} do not have a current score. Scores should only change when a user submits or updates. Use the explicit rerun action only if you need to fill missing scores.`,
        missingScores
      },
      { status: 409 }
    );
  }

  if (refreshOnly) {
    await updateDb((nextDb) => {
      nextDb.articleSubmissions = nextDb.articleSubmissions.map((submission) => {
        if (submission.taskId !== taskId) return submission;
        return scored.find((item) => item.id === submission.id) || submission;
      });
      const targetTask = nextDb.tasks.find((item) => item.id === taskId);
      if (targetTask) {
        appendEvidence(targetTask, {
          by: "system",
          type: "log",
          content: `article_score_refresh:${JSON.stringify({
            requestId,
            taskId,
            refreshed: reprocessed,
            reusedPreviews,
            missingScores,
            scoreDebug
          })}`,
          createdAt: now
        });
      }
    });

    return NextResponse.json({
      success: true,
      requestId,
      refreshOnly: true,
      reviewed: scored.length,
      reprocessed,
      reusedPreviews,
      winners: assignArticleContestPrizes(scored, task.rewardDistribution).filter((submission) => submission.rank && submission.prizeAmount).length,
      submissions: assignArticleContestPrizes(scored, task.rewardDistribution)
    });
  }

  const engagementWeighted = applyPrizeIneligibleRules(await applyArticleEngagementWeights(scored));
  const ranked = assignArticleContestPrizes(engagementWeighted, task.rewardDistribution);
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
    requestedForce,
    force: requestedForce,
    reviewed: ranked.length,
    reprocessed,
    reusedPreviews,
    winners: winners.length,
    minimumWinnerScore,
    scoreWeights: {
      content: 0.85,
      engagement: 0.15
    },
    reviewTarget,
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
  const anchorPayload = buildAnchorPayload({
    task,
    ranked,
    minimumWinnerScore,
    reviewTarget,
    reviewedAt: now,
    requestId
  });
  const anchorResult = await anchorArticleReviewOnBase({
    taskId,
    reviewedAt: now,
    reviewedCount: ranked.length,
    winnerCount: winners.length,
    payload: anchorPayload
  });
  if (!anchorResult.ok) {
    console.error("[ArticleContest] review:anchor_failed", {
      requestId,
      taskId,
      error: anchorResult.error
    });
    return NextResponse.json(
      { error: `Final review could not be anchored on Base: ${anchorResult.error}` },
      { status: 500 }
    );
  }
  const reviewAnchor = anchorResult.record;
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
      if (targetTask.taskState !== "refunded" && targetTask.taskState !== "full") {
        targetTask.taskState = "closed";
      }
      targetTask.status = "verified";
      targetTask.updatedAt = now;
      appendEvidence(targetTask, {
        by: "system",
        type: "log",
        content: `article_review:${JSON.stringify(reviewLog)}`,
        createdAt: now
      });
      appendEvidence(targetTask, {
        by: "system",
        type: "log",
        content: `${ARTICLE_REVIEW_ANCHOR_PREFIX}${JSON.stringify(reviewAnchor)}`,
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
    reprocessed,
    reusedPreviews,
    winners: winners.length,
    reviewAnchor,
    submissions: ranked
  });
}
