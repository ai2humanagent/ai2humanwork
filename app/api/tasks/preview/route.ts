import { NextResponse } from "next/server";
import { buildAgentTaskPreview } from "../../../lib/agentTaskPreview.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(buildAgentTaskPreview(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview task";
    const status = typeof (error as { status?: unknown })?.status === "number"
      ? (error as { status: number }).status
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
