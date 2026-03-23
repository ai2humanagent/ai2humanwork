const AGENT_ROLE_CONFIG = [
  {
    id: "planner_agent",
    title: "Planner Agent",
    kind: "agent",
    description: "Detects the blocker and decides whether the task can stay autonomous."
  },
  {
    id: "dispatcher_agent",
    title: "Dispatcher Agent",
    kind: "agent",
    description: "Routes blocked work to a payout-ready operator."
  },
  {
    id: "human_operator",
    title: "Human Operator",
    kind: "human",
    description: "Executes the real-world step and returns structured proof."
  },
  {
    id: "verifier_agent",
    title: "Verifier Agent",
    kind: "agent",
    description: "Checks proof structure, handle/URL integrity, and duplicate submissions."
  },
  {
    id: "settlement_agent",
    title: "Settlement Agent",
    kind: "agent",
    description: "Releases payout only after verification clears."
  },
  {
    id: "x402_gate_agent",
    title: "x402 Gate Agent",
    kind: "agent",
    description: "Payment-gates the verification bundle and unlocks it on X Layer."
  }
];

function parseAgentEvents(task) {
  const evidence = Array.isArray(task?.evidence) ? task.evidence : [];
  const map = new Map();

  for (const item of evidence) {
    const content = String(item?.content || "").trim();
    const match = content.match(/^agent_event:\s*([a-z0-9_]+)\s*\|\s*(.+)$/i);
    if (!match) continue;

    map.set(match[1].toLowerCase(), {
      createdAt: item.createdAt,
      content: match[2].trim()
    });
  }

  return map;
}

function hasEvidence(task, prefix) {
  return Array.isArray(task?.evidence)
    ? task.evidence.some((item) => String(item?.content || "").startsWith(prefix))
    : false;
}

function getRoleState(task, roleId) {
  const status = task?.status;
  const x402Unlocked = hasEvidence(task, "x402_bundle_paid:");

  switch (roleId) {
    case "planner_agent":
      if (status === "ai_running") return "active";
      if (status === "ai_failed") return "blocked";
      if (["ai_done", "human_assigned", "human_done", "verified", "paid"].includes(status)) {
        return "done";
      }
      return "waiting";
    case "dispatcher_agent":
      if (status === "ai_failed") return "active";
      if (["human_assigned", "human_done", "verified", "paid"].includes(status)) return "done";
      return "waiting";
    case "human_operator":
      if (status === "human_assigned") return "active";
      if (["human_done", "verified", "paid"].includes(status)) return "done";
      return "waiting";
    case "verifier_agent":
      if (status === "human_done") return "active";
      if (["verified", "paid"].includes(status)) return "done";
      return "waiting";
    case "settlement_agent":
      if (status === "verified") return "active";
      if (status === "paid") return "done";
      return "waiting";
    case "x402_gate_agent":
      if (x402Unlocked) return "done";
      if (["human_done", "verified", "paid"].includes(status)) return "ready";
      return "waiting";
    default:
      return "waiting";
  }
}

function getFallbackMessage(task, roleId) {
  switch (roleId) {
    case "planner_agent":
      if (task?.status === "ai_failed") return "Flagged a real-world constraint and requested fallback.";
      if (["ai_done", "human_assigned", "human_done", "verified", "paid"].includes(task?.status)) {
        return "Finished the autonomous planning pass.";
      }
      return "Waiting to inspect the task.";
    case "dispatcher_agent":
      if (task?.status === "ai_failed") return "Searching for a payout-ready operator.";
      if (["human_assigned", "human_done", "verified", "paid"].includes(task?.status)) {
        return "Dispatched the task to a human executor.";
      }
      return "Idle until the planner escalates.";
    case "human_operator":
      if (task?.status === "human_assigned") return "Completing the social action and collecting proof.";
      if (["human_done", "verified", "paid"].includes(task?.status)) {
        return "Submitted structured evidence for review.";
      }
      return "Waiting for assignment.";
    case "verifier_agent":
      if (task?.status === "human_done") return "Reviewing proof completeness and integrity.";
      if (["verified", "paid"].includes(task?.status)) return "Proof passed verification.";
      return "Waiting for human evidence.";
    case "settlement_agent":
      if (task?.status === "verified") return "Ready to release payment on X Layer.";
      if (task?.status === "paid") return "Recorded the settlement receipt.";
      return "Locked until verification passes.";
    case "x402_gate_agent":
      if (hasEvidence(task, "x402_bundle_paid:")) return "Unlocked the verification bundle with an onchain payment.";
      if (["human_done", "verified", "paid"].includes(task?.status)) {
        return "Verification bundle can now be unlocked via x402.";
      }
      return "Hidden until there is proof to unlock.";
    default:
      return "";
  }
}

export function getTaskAgentArchitecture(task) {
  const events = parseAgentEvents(task);

  return AGENT_ROLE_CONFIG.map((role) => {
    const lastEvent = events.get(role.id);
    return {
      ...role,
      state: getRoleState(task, role.id),
      message: lastEvent?.content || getFallbackMessage(task, role.id),
      updatedAt: lastEvent?.createdAt || task?.updatedAt || task?.createdAt || null
    };
  });
}
