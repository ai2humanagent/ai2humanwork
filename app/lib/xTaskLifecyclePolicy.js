function clean(value) {
  return String(value || "").trim();
}

const MANAGED_POOL_CREATED_VIA = new Set(["x_bot_v1", "web_task_creator_v1"]);

export function isExpiredXTaskRefundCandidate(task, nowMs = Date.now()) {
  const lifecycle = task?.campaign?.agentLifecycle;
  const deadlineMs = Date.parse(task?.deadline || "");
  const workflowState = clean(lifecycle?.workflowState);
  const managedAndFunded = Boolean(
    MANAGED_POOL_CREATED_VIA.has(clean(lifecycle?.createdVia)) &&
    task?.campaign?.environment === "production" &&
    task?.campaign?.fundingMode === "ai2human_managed_pool" &&
    task?.campaign?.payoutDisabled !== true &&
    task?.poolAddress &&
    ["funded", "refund_pending"].includes(clean(lifecycle?.fundingState))
  );
  if (!managedAndFunded || !Number.isFinite(deadlineMs)) return false;
  if (["cancelled", "expired", "refund_pending"].includes(workflowState)) return true;
  // A task that was claimed and moved into in_progress but never completed also
  // becomes a refund candidate once its deadline has passed.
  return (
    deadlineMs < nowMs &&
    (workflowState === "live" || workflowState === "in_progress")
  );
}

export function isExpiredUnfundedXTaskCandidate(task, nowMs = Date.now()) {
  const lifecycle = task?.campaign?.agentLifecycle;
  const deadlineMs = Date.parse(task?.deadline || "");
  const workflowState = clean(lifecycle?.workflowState);
  const fundingState = clean(lifecycle?.fundingState);
  return Boolean(
    MANAGED_POOL_CREATED_VIA.has(clean(lifecycle?.createdVia)) &&
    task?.campaign?.environment === "production" &&
    task?.campaign?.fundingMode === "ai2human_managed_pool" &&
    task?.campaign?.payoutDisabled !== true &&
    Number.isFinite(deadlineMs) &&
    deadlineMs < nowMs &&
    ["draft", "awaiting_funding"].includes(workflowState) &&
    ["funding_pending", "failed"].includes(fundingState)
  );
}
