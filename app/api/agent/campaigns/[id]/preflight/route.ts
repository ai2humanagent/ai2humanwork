import { NextResponse } from "next/server";
import { readDb } from "../../../../../lib/store";
import { runAgentCampaignContractPreflight } from "../../../../../lib/agentCampaignProtocol.js";
import { requireAgentCampaignAuth } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id);
  if (!task) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const campaign = (task.campaign || {}) as NonNullable<typeof task.campaign> & { poolAddress?: string };
  const input = {
    ...body,
    taskId: id,
    budget: task.budget,
    fundingMode: body.fundingMode || campaign.fundingMode,
    environment: body.environment || campaign.environment,
    poolAddress: body.poolAddress || task.poolAddress || campaign.poolAddress,
    expectedAgent: body.expectedAgent
  };
  const contractPreflight = await runAgentCampaignContractPreflight(db, input, task.rewardDistribution);
  return NextResponse.json({ taskId: id, contractPreflight });
}
