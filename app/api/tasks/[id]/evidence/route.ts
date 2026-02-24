import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const note = String(body.note || "Evidence submitted").trim();
  const url = String(body.url || "").trim();
  const by = body.by === "human" ? "human" : "system";
  const type = body.type === "photo" ? "photo" : "note";

  let updated: unknown = null;
  let transitionError = "";

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    task.evidence.unshift({
      id: crypto.randomUUID(),
      by,
      type,
      content: type === "photo" ? url || "Photo evidence" : note || "Evidence submitted",
      createdAt: new Date().toISOString()
    });

    if (task.status === "human_assigned") {
      if (!canTransition(task.status, "human_done")) {
        transitionError = explainInvalidTransition(task.status, "human_done");
        return;
      }
      task.status = "human_done";
    }

    task.updatedAt = new Date().toISOString();
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
