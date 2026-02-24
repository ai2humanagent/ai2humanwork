export const ALLOWED_TRANSITIONS = Object.freeze({
  created: Object.freeze(["ai_running", "ai_done", "ai_failed"]),
  ai_running: Object.freeze(["ai_done", "ai_failed"]),
  ai_failed: Object.freeze(["human_assigned"]),
  ai_done: Object.freeze(["verified", "ai_failed"]),
  human_assigned: Object.freeze(["human_done", "ai_failed"]),
  human_done: Object.freeze(["verified", "ai_failed"]),
  verified: Object.freeze(["paid", "ai_failed"]),
  paid: Object.freeze([])
});

export function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function explainInvalidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.length) {
    return `Invalid transition: ${from} -> ${to}. ${from} is terminal.`;
  }
  return `Invalid transition: ${from} -> ${to}. Allowed: ${allowed.join(", ")}.`;
}

