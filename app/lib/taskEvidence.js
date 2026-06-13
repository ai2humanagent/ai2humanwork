import crypto from "crypto";

export function appendEvidence(task, payload) {
  const { by, type, content, createdAt } = payload;
  if (!Array.isArray(task.evidence)) {
    task.evidence = [];
  }
  task.evidence.unshift({
    id: crypto.randomUUID(),
    by,
    type,
    content,
    createdAt: createdAt || new Date().toISOString()
  });
}

export function appendTransitionEvidence(task, { by, from, to, action }) {
  appendEvidence(task, {
    by,
    type: "log",
    content: `${action}: ${from} -> ${to}`
  });
}
