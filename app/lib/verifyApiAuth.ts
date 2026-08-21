import { NextResponse } from "next/server";
import crypto from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function apiJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}

export type VerifyApiAuth = { ok: true; isDemo: boolean } | { ok: false; response: NextResponse };

export function requireApiKey(request: Request): VerifyApiAuth {
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const xApiKey = request.headers.get("x-api-key")?.trim() || "";
  const provided = bearer || xApiKey;

  const configured = (process.env.VERIFY_API_KEYS || process.env.VERIFY_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const demoKey = (process.env.VERIFY_DEMO_KEY || "").trim();

  if (configured.length === 0) {
    return {
      ok: false,
      response: apiJson({ error: "Verification API is not configured (missing VERIFY_API_KEY)." }, 500)
    };
  }
  if (demoKey && safeEqual(provided, demoKey)) {
    return { ok: true, isDemo: true };
  }
  const valid = Boolean(provided) && configured.some((key) => safeEqual(provided, key));
  if (!valid) {
    return { ok: false, response: apiJson({ error: "Invalid or missing API key." }, 401) };
  }
  return { ok: true, isDemo: false };
}
