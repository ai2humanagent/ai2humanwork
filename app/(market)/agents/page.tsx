import { readDb } from "../../lib/store";
import AgentDirectoryClient from "./AgentDirectoryClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const db = await readDb();

  const agents = db.agents.map((a, i) => ({
    rank: String(i + 1),
    name: a.name,
    agentId: a.handle,
    tasks: String(a.tasksPublished),
    rating: String(a.rating),
    earned: a.totalPaid,
    skills: a.skills
  }));

  return <AgentDirectoryClient agents={agents} />;
}
