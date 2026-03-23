import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";
import { checkAdminAuth } from "../../../../lib/adminAuth";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";
import { isValidWalletAddress } from "../../../../lib/xlayerSettlement";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const name = String(body.name || "Human").trim() || "Human";
  const walletAddress = String(body.walletAddress || "").trim();

  let updated: unknown = null;
  let transitionError = "";

  if (walletAddress && !isValidWalletAddress(walletAddress)) {
    return NextResponse.json(
      { error: "walletAddress must be a valid EVM address." },
      { status: 400 }
    );
  }

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    if (!canTransition(task.status, "human_assigned")) {
      transitionError = explainInvalidTransition(task.status, "human_assigned");
      return;
    }

    const previousStatus = task.status;
    task.assignee = {
      type: "human",
      name,
      walletAddress: walletAddress || undefined
    };
    task.status = "human_assigned";
    task.updatedAt = new Date().toISOString();
    appendTransitionEvidence(task, {
      by: "system",
      from: previousStatus,
      to: "human_assigned",
      action: `Human assigned (${name})`
    });
    appendEvidence(task, {
      by: "system",
      type: "note",
      content: `agent_event: dispatcher_agent | Routed the task to ${name}${
        walletAddress ? ` with payout wallet ${walletAddress}` : ""
      }.`
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
