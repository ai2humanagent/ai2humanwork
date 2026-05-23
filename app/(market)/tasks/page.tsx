import TaskListClient from "./TaskListClient";

export default function TasksPage({
  searchParams
}: {
  searchParams?: { created?: string; q?: string };
}) {
  return <TaskListClient justCreated={searchParams?.created === "1"} searchQuery={searchParams?.q} />;
}
