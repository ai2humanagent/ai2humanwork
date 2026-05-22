import { tasks } from '@/lib/data';
import TaskDetailClient from './TaskDetailClient';

export function generateStaticParams() {
  return tasks.map((task) => ({ id: task.id }));
}

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return <TaskDetailClient id={params.id} />;
}
