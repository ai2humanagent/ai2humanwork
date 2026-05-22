import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";

/** GET /api/agents/[id] — agent detail */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDb();
  const agent = db.agents.find((a) => a.id === id);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const publishedTasks = db.tasks.filter((t) => t.agentId === agent.id);

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      handle: agent.handle,
      description: agent.description,
      walletAddress: agent.walletAddress,
      skills: agent.skills,
      rating: agent.rating,
      tasksPublished: publishedTasks.length,
      totalPaid: agent.totalPaid,
      verified: agent.verified,
      createdAt: agent.createdAt
    },
    recentTasks: publishedTasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      budget: t.budget
    }))
  });
}
