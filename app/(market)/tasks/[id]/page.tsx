import { notFound } from "next/navigation";
import { readDb } from "../../../lib/store";
import TaskDetailClient from "./TaskDetailClient";

export default async function TaskDetailPage({
  params
}: {
  params: { id: string };
}) {
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === params.id);

  if (!task) {
    notFound();
  }

  return <TaskDetailClient initialTask={task} />;
}
