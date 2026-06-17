import { NextResponse } from "next/server";
import { readDb } from "../../../../lib/store";
import { buildAgentCampaignPreview } from "../../../../lib/agentCampaignProtocol.js";
import { requireAgentCampaignAuth } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const db = await readDb();
    return NextResponse.json(await buildAgentCampaignPreview(db, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
