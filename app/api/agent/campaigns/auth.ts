import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { verifyAgentApiKey } from "../../../lib/agentRegistry";
import { verifyIssuedDeveloperApiKey } from "../../../lib/developerApiKeys";

function readProvidedKey(request: Request) {
  const direct = request.headers.get("x-agent-api-key") || "";
  if (direct.trim()) return direct.trim();
  return (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export async function requireAgentCampaignAuth(request: Request) {
  const expected = process.env.AGENT_CAMPAIGN_API_KEY || "";
  const provided = readProvidedKey(request);
  if (!provided) {
    return NextResponse.json(
      {
        error: "Missing agent API key.",
        code: "AGENT_API_KEY_REQUIRED",
        nextAction: "Create an API key at https://ai2human.io/developers/api-keys and send it as x-agent-api-key."
      },
      { status: 401 }
    );
  }

  if (expected && provided === expected) return null;

  try {
    const db = await readDb();
    if (verifyIssuedDeveloperApiKey(provided, db.users)) return null;
    const requestedAgentId = request.headers.get("x-agent-id") || "";
    const candidates = requestedAgentId
      ? db.agents.filter((item) => item.id === requestedAgentId)
      : db.agents;
    if (candidates.some((agent) => agent.apiKeyHash && verifyAgentApiKey(provided, agent.apiKeyHash))) {
      return null;
    }
  } catch {
    return NextResponse.json(
      { error: "Unable to verify agent API key right now." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: "Invalid agent API key.",
      code: "AGENT_API_KEY_INVALID",
      nextAction: "Check the key or create a new one at https://ai2human.io/developers/api-keys."
    },
    { status: 401 }
  );
}
