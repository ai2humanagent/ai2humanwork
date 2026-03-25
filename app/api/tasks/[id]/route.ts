import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";

function findAlternateClaimTask(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  currentTaskId: string
) {
  const currentTask = tasks.find((item) => item.id === currentTaskId);
  if (!currentTask) return null;

  return (
    tasks.find((candidate) => {
      if (candidate.id === currentTask.id) return false;
      if (!["created", "ai_failed"].includes(candidate.status)) return false;
      return (
        candidate.title === currentTask.title &&
        candidate.campaign?.platform === currentTask.campaign?.platform &&
        candidate.campaign?.action === currentTask.campaign?.action
      );
    }) || null
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === params.id);
  const payment =
    db.payments.find((item) => item.taskId === params.id && item.source === "task") ||
    db.payments.find((item) => item.taskId === params.id && item.source !== "x402_access") ||
    null;
  const alternateClaimTask = findAlternateClaimTask(db.tasks, params.id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task, payment, alternateClaimTask });
}
