import { NextResponse } from "next/server";
import { buildB20AgentSkillPreview } from "../../../../lib/b20AgentSkill.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(buildB20AgentSkillPreview(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview B20 skill config.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
