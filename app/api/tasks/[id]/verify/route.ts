import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";
import { checkAdminAuth } from "../../../../lib/adminAuth";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = checkAdminAuth(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let updated: unknown = null;
  let transitionError = "";

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    if (!canTransition(task.status, "verified")) {
      transitionError = explainInvalidTransition(task.status, "verified");
      return;
    }

    task.status = "verified";
    task.updatedAt = new Date().toISOString();
    task.evidence.unshift({
      id: crypto.randomUUID(),
      by: "system",
      type: "note",
      content: "Verified by reviewer",
      createdAt: new Date().toISOString()
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
