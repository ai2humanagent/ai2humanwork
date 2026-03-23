import { NextResponse } from "next/server";
import { getAuthContext } from "../../../../lib/auth";
import { readDb, updateDb } from "../../../../lib/store";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.id === auth.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (!user.humanId) {
    return NextResponse.json(
      { error: "Create an operator profile before claiming tasks." },
      { status: 400 }
    );
  }
  if (!user.walletAddress) {
    return NextResponse.json(
      { error: "Connect a payout wallet before claiming tasks." },
      { status: 400 }
    );
  }

  const human = db.humans.find((item) => item.id === user.humanId);
  if (!human) {
    return NextResponse.json({ error: "Operator profile not found." }, { status: 404 });
  }

  let updated = null;
  let transitionError = "";
  let claimError = "";

  await updateDb((draft) => {
    const task = draft.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    if (task.assignee?.type === "human" && task.assignee.name !== human.name) {
      claimError = "Task has already been claimed by another operator.";
      return;
    }

    if (task.status !== "human_assigned" && !canTransition(task.status, "human_assigned")) {
      transitionError = explainInvalidTransition(task.status, "human_assigned");
      return;
    }

    const previousStatus = task.status;
    task.assignee = {
      type: "human",
      name: human.name,
      walletAddress: user.walletAddress
    };
    task.status = "human_assigned";
    task.updatedAt = new Date().toISOString();

    if (previousStatus !== "human_assigned") {
      appendTransitionEvidence(task, {
        by: "system",
        from: previousStatus,
        to: "human_assigned",
        action: `Operator claimed task (${human.name})`
      });
    }
    appendEvidence(task, {
      by: "system",
      type: "note",
      content: `agent_event: dispatcher_agent | ${human.name} self-claimed the task from the market.`
    });
    updated = task;
  });

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (claimError) {
    return NextResponse.json({ error: claimError }, { status: 409 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
