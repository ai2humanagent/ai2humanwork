import { notFound } from "next/navigation";
import { readDb } from "../../../lib/store";
import TaskDetailClient from "./TaskDetailClient";

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

export default async function TaskDetailPage({
  params
}: {
  params: { id: string };
}) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === params.id);
  const payment =
    db.payments.find((item) => item.taskId === params.id && item.source === "task") ||
    db.payments.find((item) => item.taskId === params.id && item.source !== "x402_access") ||
    null;
  const alternateClaimTask = findAlternateClaimTask(db.tasks, params.id);

  if (!task) {
    notFound();
  }

  return (
    <TaskDetailClient
      initialTask={task}
      initialPayment={payment}
      initialAlternateClaimTask={
        alternateClaimTask
          ? {
              id: alternateClaimTask.id,
              deadline: alternateClaimTask.deadline,
              status: alternateClaimTask.status
            }
          : null
      }
    />
  );
}
