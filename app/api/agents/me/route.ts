import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { verifyAgentApiKey } from "../../../lib/agentRegistry";

export const runtime = "nodejs";

/** GET /api/agents/me — authenticated agent dashboard data
 *  Requires: Authorization: Bearer <apiKey>
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const apiKey = auth.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const db = await readDb();
  const agent = db.agents.find(
    (a) => a.apiKeyHash && verifyAgentApiKey(apiKey, a.apiKeyHash)
  );

  if (!agent) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Get agent's tasks
  const tasks = db.tasks.filter((t) => t.agentId === agent.id);

  // Get payments for agent's tasks
  const payments = db.payments.filter((p) =>
    tasks.some((t) => t.id === p.taskId)
  );

  // Calculate total spent
  let totalSpent = 0;
  for (const p of payments) {
    const match = String(p.amount || "").replace(/,/g, "").match(/[\d.]+/);
    if (match) totalSpent += parseFloat(match[0]);
  }

  // Get questers for each task
  const taskSummaries = tasks.map((t) => {
    const taskQuesters = db.questProgress.filter(
      (qp) => qp.taskId === t.id && (qp.status === "action_done" || qp.status === "verified")
    );
    const uniqueWallets = new Set(taskQuesters.map((qp) => qp.walletAddress));
    const verifiedCount = new Set(
      taskQuesters.filter((qp) => qp.status === "verified").map((qp) => qp.walletAddress)
    ).size;
    const taskPayments = payments.filter((p) => p.taskId === t.id);

    return {
      id: t.id,
      title: t.title,
      status: t.status,
      budget: t.budget,
      rewardDistribution: t.rewardDistribution,
      createdAt: t.createdAt,
      participants: uniqueWallets.size,
      verified: verifiedCount,
      claimed: taskPayments.length
    };
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      handle: agent.handle,
      description: agent.description,
      walletAddress: agent.walletAddress,
      skills: agent.skills,
      rating: agent.rating,
      verified: agent.verified,
      createdAt: agent.createdAt
    },
    stats: {
      totalTasks: tasks.length,
      totalSpent: `${totalSpent.toFixed(4).replace(/\.?0+$/, "")} USDC`,
      totalParticipants: new Set(
        db.questProgress
          .filter((qp) => tasks.some((t) => t.id === qp.taskId))
          .map((qp) => qp.walletAddress)
      ).size,
      totalClaims: payments.length
    },
    tasks: taskSummaries
  });
}
