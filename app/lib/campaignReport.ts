import type { ArticleSubmission, PaymentEntry, Task } from "./store";
import { getArticleContestMinimumWinnerScore } from "./articleContest";

export type CampaignLifecycleStep = {
  key: "draft" | "funded" | "open" | "closed" | "reviewed" | "paying" | "completed" | "refunded";
  label: string;
  state: "done" | "current" | "pending";
  description: string;
};

export type CampaignLifecycleStatus = CampaignLifecycleStep["key"];

export type PublicArticleWinner = {
  id: string;
  rank: number;
  rankLabel: string;
  xHandle: string;
  walletAddress: string;
  articleUrl: string;
  title: string;
  score: number;
  prizeAmount: string;
  status: string;
  sourceLabel: string;
  modelConsensusLabel: string;
  modelReviews: Array<{
    providerLabel: string;
    model?: string;
    status: string;
    score?: number;
  }>;
  reviewedTextExcerpt: string;
  reviewSummary: string;
  rubric: Array<{ key: string; value: number }>;
  paymentTxHash?: string;
  paymentExplorerUrl?: string;
};

function isPast(date: string | undefined) {
  if (!date || date === "TBD") return false;
  const timestamp = +new Date(date);
  return Number.isFinite(timestamp) && Date.now() > timestamp;
}

function splitSourceAndReason(review: string | undefined) {
  if (!review) return { source: "Review pending", reason: "" };
  const prefix = "Source: ";
  if (!review.startsWith(prefix)) return { source: "AI review", reason: review };
  const body = review.slice(prefix.length);
  const separator = body.indexOf(". ");
  if (separator < 0) return { source: body, reason: "" };
  return {
    source: body.slice(0, separator),
    reason: body.slice(separator + 2)
  };
}

export function articleReviewSourceLabel(submission: ArticleSubmission) {
  const audit = submission.aiRubric?.audit;
  if (audit?.contentSource === "snapshot_fallback") {
    return "Article text fallback";
  }
  if (audit?.contentSource === "x_live") {
    if (audit.fetchSource === "oembed") return "Live X embed";
    if (audit.fetchSource === "x_api") return "Live X API";
    if (audit.fetchSource === "syndication") return "Live X syndication";
    return `Live X${audit.fetchSource ? ` - ${audit.fetchSource}` : ""}`;
  }
  const parsed = splitSourceAndReason(submission.aiReview);
  if (parsed.source.toLowerCase().includes("x live content")) {
    return parsed.source.replace("X live content", "Live X");
  }
  return "Legacy review";
}

function publicReviewSummary(submission: ArticleSubmission) {
  const { reason } = splitSourceAndReason(submission.aiReview);
  if (!reason) return "AI review completed. Full rubric is recorded in the audit trail.";

  const balanced = reason
    .replace(/\s+/g, " ")
    .replace(/\bzero concrete evidence\b/gi, "limited concrete evidence")
    .replace(/\bno concrete evidence\b/gi, "limited concrete evidence")
    .replace(/\bgeneric hype\b/gi, "light promotional framing")
    .replace(/\bwithout substance\b/gi, "with limited detail")
    .trim();

  const howeverIndex = balanced.search(/\bHowever\b/i);
  const summary = howeverIndex > 80 ? balanced.slice(0, howeverIndex).trim() : balanced;
  return summary.slice(0, 360);
}

function rankLabel(rank: number) {
  if (rank === 1) return "First Prize";
  if (rank === 2) return "Second Prize";
  if (rank === 3) return "Third Prize";
  return `Rank ${rank}`;
}

function rubricEntries(submission: ArticleSubmission) {
  const rubric = submission.aiRubric;
  if (!rubric) return [];
  return (["relevance", "originality", "clarity", "evidence", "narrative"] as const)
    .flatMap((key) => {
      const value = rubric[key];
      return typeof value === "number" ? [{ key, value }] : [];
    });
}

function modelReviews(submission: ArticleSubmission) {
  return (submission.aiRubric?.audit?.modelReviews || []).map((item) => ({
    providerLabel: item.providerLabel,
    model: item.model,
    status: item.status,
    score: item.score
  }));
}

function modelConsensusLabel(submission: ArticleSubmission) {
  const reviews = submission.aiRubric?.audit?.modelReviews || [];
  if (!reviews.length) {
    return submission.aiRubric?.audit?.model ? `Model: ${submission.aiRubric.audit.model}` : "";
  }
  const active = reviews.filter((item) => item.status === "scored").length;
  const total = reviews.length;
  if (submission.aiRubric?.audit?.aggregateStrategy === "weighted_consensus" || active > 1) {
    return `Weighted consensus · ${active}/${total} models`;
  }
  return `${active}/${total} model active`;
}

export function getPublicArticleWinners(task: Task, submissions: ArticleSubmission[]) {
  const minimumScore = getArticleContestMinimumWinnerScore(task.rewardDistribution);
  return submissions
    .filter((submission) => {
      if (!submission.rank || !submission.prizeAmount) return false;
      if (submission.status !== "winner" && submission.status !== "paid") return false;
      return (submission.aiScore || 0) >= minimumScore;
    })
    .sort((a, b) => {
      const rankDelta = (a.rank || 999) - (b.rank || 999);
      if (rankDelta !== 0) return rankDelta;
      return (b.aiScore || 0) - (a.aiScore || 0);
    })
    .map<PublicArticleWinner>((submission) => ({
      id: submission.id,
      rank: submission.rank || 0,
      rankLabel: rankLabel(submission.rank || 0),
      xHandle: submission.xHandle,
      walletAddress: submission.walletAddress,
      articleUrl: submission.articleUrl,
      title: submission.title,
      score: submission.aiScore || 0,
      prizeAmount: submission.prizeAmount || "",
      status: submission.status,
      sourceLabel: articleReviewSourceLabel(submission),
      modelConsensusLabel: modelConsensusLabel(submission),
      modelReviews: modelReviews(submission),
      reviewedTextExcerpt: submission.aiRubric?.audit?.reviewedTextExcerpt || "",
      reviewSummary: publicReviewSummary(submission),
      rubric: rubricEntries(submission),
      paymentTxHash: submission.paymentTxHash,
      paymentExplorerUrl: submission.paymentExplorerUrl
    }));
}

export function deriveCampaignLifecycle(input: {
  task: Task;
  articleSubmissions?: ArticleSubmission[];
  payments?: PaymentEntry[];
}) {
  const { task } = input;
  const submissions = input.articleSubmissions || [];
  const payments = input.payments || [];
  const mode = task.rewardDistribution?.mode || "fcfs";
  const isArticleContest = mode === "ranked_article_contest";
  const hasSubmissions = submissions.length > 0;
  const hasFinalReview = isArticleContest && (task.evidence || []).some((item) =>
    String(item.content || "").startsWith("article_review:")
  );
  const publicWinners = isArticleContest ? getPublicArticleWinners(task, submissions) : [];
  const hasWinners = isArticleContest
    ? publicWinners.length > 0
    : Boolean(task.drawResult?.winners?.length || payments.length);
  const paidWinnerCount = isArticleContest
    ? submissions.filter((submission) => submission.status === "paid").length
    : payments.length;
  const expectedWinnerCount = isArticleContest
    ? publicWinners.length
    : task.rewardDistribution?.maxWinners || task.drawResult?.winners?.length || payments.length || 1;
  const isRefunded = task.taskState === "refunded";
  const isCompleted = !isRefunded && expectedWinnerCount > 0 && paidWinnerCount >= expectedWinnerCount;
  const isPaying = !isCompleted && hasWinners && paidWinnerCount > 0;
  const isClosed = task.taskState === "closed" || task.taskState === "full" || isPast(task.deadline);
  const funded = Boolean(task.poolAddress || task.escrowDepositId || task.rewardDistribution?.totalPool);

  const currentKey: CampaignLifecycleStep["key"] = isRefunded
    ? "refunded"
    : isCompleted
      ? "completed"
      : isPaying
        ? "paying"
        : hasFinalReview
          ? "reviewed"
          : isClosed
            ? "closed"
            : hasSubmissions || task.taskState === "open"
              ? "open"
              : funded
                ? "funded"
                : "draft";

  const order: CampaignLifecycleStep["key"][] = [
    "draft",
    "funded",
    "open",
    "closed",
    "reviewed",
    "paying",
    "completed",
    "refunded"
  ];
  const currentIndex = order.indexOf(currentKey);
  const descriptions: Record<CampaignLifecycleStep["key"], string> = {
    draft: "Campaign record exists and is being prepared.",
    funded: "Reward pool and campaign terms are configured.",
    open: "Participants can complete the task or submit entries.",
    closed: "New entries are closed and results can be reviewed.",
    reviewed: "Eligible entries have been scored and winners are selected.",
    paying: "Winner payouts are in progress.",
    completed: "Winner payouts are complete.",
    refunded: "Remaining campaign funds were returned."
  };
  const labels: Record<CampaignLifecycleStep["key"], string> = {
    draft: "Draft",
    funded: "Funded",
    open: "Open",
    closed: "Closed",
    reviewed: "Reviewed",
    paying: "Paying",
    completed: "Completed",
    refunded: "Refunded"
  };

  return order.map<CampaignLifecycleStep>((key, index) => ({
    key,
    label: labels[key],
    description: descriptions[key],
    state: index < currentIndex ? "done" : index === currentIndex ? "current" : "pending"
  }));
}

export function getCampaignLifecycleStatus(input: {
  task: Task;
  articleSubmissions?: ArticleSubmission[];
  payments?: PaymentEntry[];
}) {
  const current = deriveCampaignLifecycle(input).find((step) => step.state === "current");
  return current?.key || "draft";
}

export function campaignLifecycleLabel(status: CampaignLifecycleStatus | string | undefined) {
  if (status === "draft") return "Draft";
  if (status === "funded") return "Funded";
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  if (status === "reviewed") return "Reviewed";
  if (status === "paying") return "Paying";
  if (status === "completed") return "Completed";
  if (status === "refunded") return "Refunded";
  return "Draft";
}
