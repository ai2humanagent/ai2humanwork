import { NextResponse } from "next/server";
import {
  PolicyNotFoundError,
  runClaim
} from "../../../lib/verify-engine/engine";
import { policies } from "../../../lib/verify-engine/policies";
import type {
  EvidenceDimension,
  VerifyConfig
} from "../../../lib/verify-engine/types";
import { apiJson, requireApiKey } from "../../../lib/verifyApiAuth";
import { clientIp, rateLimitExceeded } from "../../../lib/verifyRateLimit";

export const runtime = "nodejs";

const DEMO_CLAIM_TYPES = ["eligibility_check", "delivery_confirmed"];
const DEMO_LIMIT = { count: 10, windowMs: 60_000 };
const KEY_LIMIT = { count: 120, windowMs: 60_000 };

/**
 * POST /api/v1/verify_claim
 * Body: { claimType, evidence, config? }
 * Auth: Authorization: Bearer <VERIFY_API_KEY> or x-api-key
 */
export async function POST(request: Request) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  const limiter = auth.isDemo
    ? { ...DEMO_LIMIT, key: `demo:${clientIp(request)}` }
    : { ...KEY_LIMIT, key: `key:${clientIp(request)}` };
  if (rateLimitExceeded(limiter.key, limiter.count, limiter.windowMs)) {
    return apiJson({ error: "Rate limit exceeded. Try again shortly." }, 429);
  }

  const body = await request.json().catch(() => ({}));
  const claimType = String(body.claimType || "").trim();
  const evidence = (body.evidence && typeof body.evidence === "object" ? body.evidence : {}) as EvidenceDimension;
  const config = (body.config && typeof body.config === "object" ? body.config : {}) as VerifyConfig | undefined;

  if (!claimType) {
    return apiJson({ error: "claimType is required. See GET /api/v1/verify/policies." }, 400);
  }
  if (auth.isDemo && !DEMO_CLAIM_TYPES.includes(claimType)) {
    return apiJson(
      { error: `Demo key is limited to: ${DEMO_CLAIM_TYPES.join(", ")}. Get a full key from the AI2Human team.` },
      403
    );
  }

  try {
    const record = await runClaim({ claimType, evidence, config, registry: policies });
    return apiJson(record);
  } catch (err) {
    if (err instanceof PolicyNotFoundError) {
      return apiJson({ error: err.message }, 400);
    }
    return apiJson({ error: err instanceof Error ? err.message : "Verification failed." }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}
