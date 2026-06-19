export function hasFinalArticleReview(task) {
  return (task?.evidence || []).some((item) => String(item.content || "").startsWith("article_review:"));
}

export function isArticleContestDistribution(distribution) {
  return distribution?.mode === "ranked_article_contest";
}

export function parseUsdcAmount(value) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function isDueForAutomaticArticleReview(task, submissions = [], nowMs = Date.now()) {
  if (!isArticleContestDistribution(task?.rewardDistribution)) return false;
  if (!submissions.some((submission) => submission.taskId === task.id)) return false;
  if (hasFinalArticleReview(task)) return false;
  if (!task?.deadline || task.deadline === "TBD") return false;
  return isSubmissionDeadlinePassedAt(task.deadline, nowMs);
}

export function isSubmissionDeadlinePassedAt(deadline, nowMs = Date.now()) {
  if (!deadline || deadline === "TBD") return false;
  const timestamp = +new Date(deadline);
  if (!Number.isFinite(timestamp)) return false;
  return nowMs > timestamp;
}

export function shouldAutoPayArticleContest(task, options = {}) {
  if (!options.enabled) return false;
  const maxPoolUsdc = Number(options.maxPoolUsdc ?? 0);
  if (!Number.isFinite(maxPoolUsdc) || maxPoolUsdc <= 0) return false;
  const pool = parseUsdcAmount(task?.rewardDistribution?.totalPool || task?.budget || "0");
  return pool > 0 && pool <= maxPoolUsdc;
}
