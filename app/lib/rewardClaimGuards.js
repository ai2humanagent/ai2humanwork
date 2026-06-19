const DEFAULT_REQUIRED_SUBTASK_KEYS = ["0", "1", "2", "3"];

export function normalizeRewardWallet(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeRewardXHandle(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

export function buildRewardClaimIdempotencyKey(taskId, wallet) {
  return `twitter_task:${taskId}:${normalizeRewardWallet(wallet)}`;
}

export function isRewardPaymentForTask(payment, task) {
  if (!task?.poolAddress) return true;
  return payment?.method === "prize_pool_claim" && Boolean(payment?.txHash);
}

export function findExistingRewardClaim(payments, task, taskId, wallet) {
  const normalizedWallet = normalizeRewardWallet(wallet);
  const idempotencyKey = buildRewardClaimIdempotencyKey(taskId, normalizedWallet);
  return (payments || []).find(
    (payment) =>
      payment.taskId === taskId &&
      payment.source === "twitter_task" &&
      isRewardPaymentForTask(payment, task) &&
      (normalizeRewardWallet(payment.receiverAddress) === normalizedWallet ||
        payment.idempotencyKey === idempotencyKey)
  ) || null;
}

export function findConflictingXRewardClaim(participants, taskId, xHandle, wallet) {
  const normalizedHandle = normalizeRewardXHandle(xHandle);
  const normalizedWallet = normalizeRewardWallet(wallet);
  if (!normalizedHandle) return null;
  return (participants || []).find(
    (participant) =>
      participant.taskId === taskId &&
      normalizeRewardXHandle(participant.xHandle) === normalizedHandle &&
      normalizeRewardWallet(participant.walletAddress) !== normalizedWallet
  ) || null;
}

export function countRewardClaims(payments, task, taskId) {
  return (payments || []).filter(
    (payment) =>
      payment.taskId === taskId &&
      payment.source === "twitter_task" &&
      isRewardPaymentForTask(payment, task)
  ).length;
}

export function findMissingVerifiedSubtask(progress, taskId, wallet, requiredKeys = DEFAULT_REQUIRED_SUBTASK_KEYS) {
  const normalizedWallet = normalizeRewardWallet(wallet);
  const taskProgress = (progress || []).filter(
    (entry) => entry.taskId === taskId && normalizeRewardWallet(entry.walletAddress) === normalizedWallet
  );
  return requiredKeys.find((key) => {
    const entry = taskProgress.find((item) => String(item.subtaskKey) === String(key));
    return !entry || entry.status !== "verified";
  }) || "";
}
