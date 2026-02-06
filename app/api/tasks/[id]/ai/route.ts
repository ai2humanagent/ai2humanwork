import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const outcome = body.outcome === "fail" ? "fail" : "success";
  const note = String(body.note || "AI execution");

  let updated: unknown = null;

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    task.assignee = { type: "ai", name: "Agent" };
    task.status = outcome === "success" ? "ai_done" : "ai_failed";
    task.updatedAt = new Date().toISOString();
    task.evidence.unshift({
      id: crypto.randomUUID(),
      by: "ai",
      type: "log",
      content:
        outcome === "success"
          ? `AI success: ${note}`
          : `AI failed: ${note}`,
      createdAt: new Date().toISOString()
    });
    updated = task;
  });

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
