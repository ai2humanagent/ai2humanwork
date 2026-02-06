import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const note = String(body.note || "Evidence submitted").trim();
  const by = body.by === "human" ? "human" : "system";

  let updated: unknown = null;

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    task.evidence.unshift({
      id: crypto.randomUUID(),
      by,
      type: "note",
      content: note || "Evidence submitted",
      createdAt: new Date().toISOString()
    });
    task.status = "human_done";
    task.updatedAt = new Date().toISOString();
    updated = task;
  });

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
