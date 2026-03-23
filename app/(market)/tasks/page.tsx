import TaskListClient from "./TaskListClient";

export default function TasksPage({
  searchParams
}: {
  searchParams?: { created?: string };
}) {
  return <TaskListClient justCreated={searchParams?.created === "1"} />;
}
