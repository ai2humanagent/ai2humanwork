import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const name = String(body.name || "Human").trim() || "Human";

  let updated: unknown = null;

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    task.assignee = { type: "human", name };
    task.status = "human_assigned";
    task.updatedAt = new Date().toISOString();
    task.evidence.unshift({
      id: crypto.randomUUID(),
      by: "system",
      type: "note",
      content: `Human assigned: ${name}`,
      createdAt: new Date().toISOString()
    });
    updated = task;
  });

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
