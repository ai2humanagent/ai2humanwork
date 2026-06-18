export function isAbsoluteDeadlinePassed(deadline, nowMs = Date.now()) {
  if (!deadline || deadline === "TBD") return false;
  const timestamp = +new Date(deadline);
  if (!Number.isFinite(timestamp)) return false;
  return nowMs > timestamp;
}

export function deriveDeadlineAwareTaskState(task, nowMs = Date.now()) {
  const taskState = task?.taskState;
  if (taskState === "full" || taskState === "closed" || taskState === "refunded") {
    return taskState;
  }
  if (taskState === "open" && isAbsoluteDeadlinePassed(task?.deadline, nowMs)) {
    return "closed";
  }
  return taskState;
}

export function applyDeadlineAwareTaskState(task, nowMs = Date.now()) {
  const taskState = deriveDeadlineAwareTaskState(task, nowMs);
  return taskState === task?.taskState ? task : { ...task, taskState };
}
