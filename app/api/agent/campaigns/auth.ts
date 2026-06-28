import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { verifyAgentApiKey } from "../../../lib/agentRegistry";

export async function requireAgentCampaignAuth(request: Request) {
  const expected = process.env.AGENT_CAMPAIGN_API_KEY || "";
  const provided = request.headers.get("x-agent-api-key") || "";
  if (!provided) {
    return NextResponse.json(
      { error: "Missing agent campaign credentials. Provide x-agent-api-key." },
      { status: 401 }
    );
  }

  if (expected && provided === expected) return null;

  const agentId = request.headers.get("x-agent-id") || "";
  if (agentId && provided) {
    try {
      const db = await readDb();
      const agent = db.agents.find((item) => item.id === agentId);
      if (agent?.apiKeyHash && verifyAgentApiKey(provided, agent.apiKeyHash)) {
        return null;
      }
    } catch {
      return NextResponse.json(
        { error: "Unable to verify agent campaign credentials right now." },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid or missing agent campaign credentials." },
    { status: 401 }
  );
}
