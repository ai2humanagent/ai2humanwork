import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { verifyAgentApiKey } from "../../../lib/agentRegistry";

export async function requireAgentCampaignAuth(request: Request) {
  const expected = process.env.AGENT_CAMPAIGN_API_KEY || "";
  const provided = request.headers.get("x-agent-api-key") || "";
  if (expected && provided === expected) return null;

  const agentId = request.headers.get("x-agent-id") || "";
  if (agentId && provided) {
    const db = await readDb();
    const agent = db.agents.find((item) => item.id === agentId);
    if (agent?.apiKeyHash && verifyAgentApiKey(provided, agent.apiKeyHash)) {
      return null;
    }
  }

  if (!expected && !agentId && !provided) return null;

  return NextResponse.json(
    { error: "Invalid or missing agent campaign credentials." },
    { status: 401 }
  );
}
