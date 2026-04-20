import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";
import { getOnchainOsPrecheck } from "../../../../lib/onchainOs";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}));
  const outcome = body.outcome === "fail" ? "fail" : "success";
  const note = String(body.note || "AI execution");

  let updated: unknown = null;
  let transitionError = "";

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    const precheck = getOnchainOsPrecheck(task, outcome);

    const nextStatus = outcome === "success" ? "ai_done" : "ai_failed";
    const previousStatus = task.status;
    if (!canTransition(task.status, nextStatus)) {
      transitionError = explainInvalidTransition(task.status, nextStatus);
      return;
    }

    task.assignee = { type: "ai", name: "Agent" };
    task.status = nextStatus;
    task.updatedAt = new Date().toISOString();
    appendTransitionEvidence(task, {
      by: "ai",
      from: previousStatus,
      to: nextStatus,
      action: outcome === "success" ? "AI execution success" : "AI execution failed"
    });
    appendEvidence(task, {
      by: "ai",
      type: "note",
      content: `AI note: ${note}`
    });
    appendEvidence(task, {
      by: "ai",
      type: "note",
      content: `agent_event: onchainos_precheck | ${precheck.precheckMessage}`
    });
    appendEvidence(task, {
      by: "ai",
      type: "note",
      content: `agent_event: planner_agent | ${precheck.plannerMessage}`
    });
    updated = task;
  });

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
