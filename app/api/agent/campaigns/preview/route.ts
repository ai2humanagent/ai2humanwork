import { NextResponse } from "next/server";
import { readDb } from "../../../../lib/store";
import { buildAgentCampaignPreview } from "../../../../lib/agentCampaignProtocol.js";
import { isPublicAgentCampaignRequest, requireAgentCampaignAuth } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publicAccess = isPublicAgentCampaignRequest(request, body);
    const authError = await requireAgentCampaignAuth(request, { allowPublicTest: true, input: body });
    if (authError) return authError;

    let db: Awaited<ReturnType<typeof readDb>>;
    let dbWarning = "";
    try {
      db = await readDb();
    } catch (error) {
      db = { tasks: [] } as unknown as Awaited<ReturnType<typeof readDb>>;
      dbWarning = error instanceof Error ? error.message : "Database read failed during preview.";
    }
    const preview = await buildAgentCampaignPreview(db, body);
    return NextResponse.json({
      ...preview,
      publicAccess,
      warnings: dbWarning
        ? [
            ...(preview.warnings || []),
            publicAccess
              ? "Public test preview used fallback state because persistence is temporarily unavailable."
              : `Preview used fallback DB state: ${dbWarning}`
          ]
        : preview.warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
