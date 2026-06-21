export function getRewardTaskUnavailableReason(task) {
  const taskState = String(task?.taskState || "").trim();
  const lifecycleStatus = String(task?.campaign?.agentLifecycle?.status || "").trim();
  const visibleLifecycleStatuses = new Set(["published", "completed", "closed", "refunded"]);

  if (lifecycleStatus && !visibleLifecycleStatuses.has(lifecycleStatus)) {
    return "This activity is not published yet.";
  }
  if (taskState === "full") {
    return "All reward slots have been claimed.";
  }
  if (taskState === "refunded") {
    return "This activity has been refunded.";
  }
  if (taskState === "closed") {
    return "This activity is not open.";
  }
  if (taskState && taskState !== "open") {
    return "This activity is not open.";
  }
  return "";
}

export function isRewardTaskOpen(task) {
  return !getRewardTaskUnavailableReason(task);
}
