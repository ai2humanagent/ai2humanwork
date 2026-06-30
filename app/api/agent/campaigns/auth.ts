import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import { verifyAgentApiKey } from "../../../lib/agentRegistry";

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return String(value || "").trim();
}

export function isPublicTestCampaignInput(input: unknown) {
  const body = readObject(input);
  const fundingMode = readString(body.fundingMode);
  const environment = readString(body.environment);
  const rewardDistribution = readObject(body.rewardDistribution);
  const totalPool = readString(rewardDistribution.totalPool || body.budget);
  const maxWinners = Number(rewardDistribution.maxWinners || 0);

  return (
    environment === "test" &&
    fundingMode === "test_no_payout" &&
    !readString(body.poolAddress) &&
    !readString(body.depositAmount) &&
    !readString(body.expectedAgent) &&
    !readString(body.campaignId) &&
    (!totalPool || /^(?:\d+(?:\.\d+)?\s*)?USDC$/i.test(totalPool)) &&
    (!Number.isFinite(maxWinners) || maxWinners <= 100)
  );
}

export function isPublicAgentCampaignRequest(request: Request, input: unknown) {
  const provided = request.headers.get("x-agent-api-key") || "";
  return !provided && isPublicTestCampaignInput(input);
}

export async function requireAgentCampaignAuth(
  request: Request,
  options: { allowPublicTest?: boolean; input?: unknown } = {}
) {
  const expected = process.env.AGENT_CAMPAIGN_API_KEY || "";
  const provided = request.headers.get("x-agent-api-key") || "";
  if (!provided) {
    if (options.allowPublicTest && isPublicTestCampaignInput(options.input)) {
      return null;
    }

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
