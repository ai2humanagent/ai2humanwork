import { NextResponse } from "next/server";
import { updateDb } from "../../../lib/store";
import { reconcileRewardCampaigns } from "../../../lib/rewardCampaignAutomation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  return scheme?.toLowerCase() === "bearer" ? (token || "").trim() : "";
}

function checkCronAuth(request: Request) {
  const configured = String(process.env.CRON_SECRET || "").trim();
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, status: 500, error: "CRON_SECRET is not configured." }
      : { ok: true, status: 200, error: "" };
  }
  const token = readBearerToken(request) || String(request.headers.get("x-cron-secret") || "").trim();
  return token && token === configured
    ? { ok: true, status: 200, error: "" }
    : { ok: false, status: 401, error: "Invalid cron secret." };
}

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const nowMs = Date.now();
  const updates = await updateDb((db) => reconcileRewardCampaigns(db, nowMs));

  const response = NextResponse.json({
    success: true,
    checkedAt: new Date(nowMs).toISOString(),
    updated: updates.length,
    updates
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}
