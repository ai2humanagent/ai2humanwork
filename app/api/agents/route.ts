import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb } from "../../lib/store";
import {
  generateAgentApiKey,
  hashAgentApiKey,
  type AIAgent
} from "../../lib/agentRegistry";

export const runtime = "nodejs";

/** GET /api/agents — list all agents (public) */
export async function GET() {
  const db = await readDb();
  const agents = db.agents.map((a) => ({
    id: a.id,
    name: a.name,
    handle: a.handle,
    description: a.description,
    walletAddress: a.walletAddress,
    skills: a.skills,
    rating: a.rating,
    tasksPublished: a.tasksPublished,
    totalPaid: a.totalPaid,
    verified: a.verified,
    createdAt: a.createdAt
  }));
  return NextResponse.json({ agents });
}

/** POST /api/agents — register a new agent
 *  Body: { name, handle, description, skills?, walletAddress? }
 *  Returns: { agent, apiKey } — apiKey is shown once
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const handle = String(body.handle || "").trim();
  const description = String(body.description || "").trim();
  const skills: string[] = Array.isArray(body.skills)
    ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  const walletAddress = String(body.walletAddress || "").trim() || undefined;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const db = await readDb();
  if (db.agents.some((a) => a.handle.toLowerCase() === handle.toLowerCase())) {
    return NextResponse.json({ error: "An agent with this handle already exists" }, { status: 409 });
  }

  const apiKey = generateAgentApiKey();
  const agent: AIAgent = {
    id: `agent_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    name,
    handle,
    description,
    apiKeyHash: hashAgentApiKey(apiKey),
    walletAddress,
    skills,
    rating: 0,
    tasksPublished: 0,
    totalPaid: "0 USDC",
    verified: false,
    createdAt: new Date().toISOString()
  };

  await updateDb((db) => {
    if (!Array.isArray(db.agents)) db.agents = [];
    db.agents.push(agent);
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      handle: agent.handle,
      description: agent.description,
      skills: agent.skills,
      verified: agent.verified,
      createdAt: agent.createdAt
    },
    apiKey
  }, { status: 201 });
}
