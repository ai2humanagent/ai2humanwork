function isRewardDistribution(task) {
  const mode = task?.rewardDistribution?.mode;
  return mode === "lucky_draw" || mode === "fcfs" || mode === "equal";
}

function isPaidRewardPayment(payment, task) {
  if (!payment || payment.taskId !== task.id) return false;
  if (payment.source !== "twitter_task") return false;
  if (payment.status && payment.status !== "paid") return false;
  if (task.poolAddress) {
    return payment.method === "prize_pool_claim" && Boolean(payment.txHash);
  }
  return true;
}

function parseDeadlineMs(deadline) {
  if (!deadline || typeof deadline !== "string") return null;
  const ms = Date.parse(deadline);
  return Number.isFinite(ms) ? ms : null;
}

export function reconcileRewardCampaigns(db, nowMs = Date.now()) {
  const updates = [];

  for (const task of db.tasks || []) {
    if (!isRewardDistribution(task)) continue;
    if (!task.rewardDistribution?.maxWinners) continue;

    const maxWinners = Number(task.rewardDistribution.maxWinners || 0);
    if (!Number.isFinite(maxWinners) || maxWinners <= 0) continue;

    const paidPayments = (db.payments || []).filter((payment) => isPaidRewardPayment(payment, task));
    const paidCount = paidPayments.length;
    const lifecycle = task.campaign?.agentLifecycle || {};
    const before = {
      status: task.status,
      taskState: task.taskState,
      lifecycleStatus: lifecycle.status
    };

    if (paidCount >= maxWinners && task.taskState !== "full") {
      const updatedAt = new Date(nowMs).toISOString();
      task.status = "paid";
      task.taskState = "full";
      task.updatedAt = updatedAt;
      task.campaign = {
        ...(task.campaign || {}),
        agentLifecycle: {
          ...lifecycle,
          status: "completed",
          completedAt: lifecycle.completedAt || updatedAt
        }
      };
      updates.push({
        taskId: task.id,
        action: "marked_full",
        paidCount,
        maxWinners,
        before,
        after: {
          status: task.status,
          taskState: task.taskState,
          lifecycleStatus: task.campaign.agentLifecycle.status
        }
      });
      continue;
    }

    const deadlineMs = parseDeadlineMs(task.deadline);
    if (
      deadlineMs !== null &&
      nowMs > deadlineMs &&
      task.taskState === "open" &&
      paidCount < maxWinners
    ) {
      const updatedAt = new Date(nowMs).toISOString();
      task.taskState = "closed";
      task.updatedAt = updatedAt;
      task.campaign = {
        ...(task.campaign || {}),
        agentLifecycle: {
          ...lifecycle,
          status: "closed",
          closedAt: lifecycle.closedAt || updatedAt
        }
      };
      updates.push({
        taskId: task.id,
        action: "marked_closed",
        paidCount,
        maxWinners,
        before,
        after: {
          status: task.status,
          taskState: task.taskState,
          lifecycleStatus: task.campaign.agentLifecycle.status
        }
      });
    }
  }

  return updates;
}
