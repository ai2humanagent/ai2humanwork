import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  let updated: unknown = null;

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    task.status = "paid";
    task.updatedAt = new Date().toISOString();
    task.evidence.unshift({
      id: crypto.randomUUID(),
      by: "system",
      type: "note",
      content: "Payment settled (mock)",
      createdAt: new Date().toISOString()
    });
    updated = task;
  });

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
