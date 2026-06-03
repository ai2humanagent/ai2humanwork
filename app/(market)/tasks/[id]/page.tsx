import { notFound } from "next/navigation";
import { readDb } from "../../../lib/store";
import TaskDetailClient from "./TaskDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AlternateClaimTask = {
  id: string;
  deadline: string;
  status: "created" | "ai_failed";
};

function findLatestTaskById(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  taskId: string
) {
  const matches = tasks.filter((item) => item.id === taskId);
  if (matches.length <= 1) return matches[0] ?? null;
  return matches.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
}

function findAlternateClaimTask(
  tasks: Awaited<ReturnType<typeof readDb>>["tasks"],
  currentTaskId: string
): AlternateClaimTask | null {
  const currentTask = findLatestTaskById(tasks, currentTaskId);
  if (!currentTask) return null;

  const candidate = tasks.find((candidate) => {
      if (candidate.id === currentTask.id) return false;
      if (candidate.status !== "created" && candidate.status !== "ai_failed") return false;
      return (
        candidate.title === currentTask.title &&
        candidate.campaign?.platform === currentTask.campaign?.platform &&
        candidate.campaign?.action === currentTask.campaign?.action
      );
    });

  if (!candidate) return null;
  if (candidate.status !== "created" && candidate.status !== "ai_failed") return null;

  return {
    id: candidate.id,
    deadline: candidate.deadline,
    status: candidate.status
  };
}

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const task = findLatestTaskById(db.tasks, id);
  const payment =
    db.payments.find((item) => item.taskId === id && item.source === "task") ||
    db.payments.find((item) => item.taskId === id && item.source !== "x402_access") ||
    null;
  const alternateClaimTask = findAlternateClaimTask(db.tasks, id);

  if (!task) {
    notFound();
  }

  return (
    <TaskDetailClient
      initialTask={task}
      initialPayment={payment}
      initialAlternateClaimTask={alternateClaimTask}
    />
  );
}
