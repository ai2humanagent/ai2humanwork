import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAuthContext } from "../../../lib/auth";
import { createDeveloperApiKey } from "../../../lib/developerApiKeys";
import { updateProfileDb, type DeveloperApiKeyRecord } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SCOPES = new Set(["Agent API", "LLM Gateway", "x402 Cloud", "Read-only", "IP allowlist"]);

function normalizeScopes(value: unknown) {
  const scopes = Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter((item) => ALLOWED_SCOPES.has(item))
    : [];
  return scopes.length ? [...new Set(scopes)] : ["Agent API", "Read-only"];
}

function serializeKey(record: DeveloperApiKeyRecord) {
  return {
    id: record.id,
    name: record.name,
    maskedKey: `${record.keyPrefix}••••••••`,
    scopes: record.scopes,
    state: record.state,
    createdAt: record.createdAt,
    requests: record.requests
  };
}

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user.walletAddress) {
    return NextResponse.json({ error: "Connect a wallet before managing API keys." }, { status: 400 });
  }
  const keys = [...(auth.user.developerApiKeys || [])]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map(serializeKey);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user.walletAddress) {
    return NextResponse.json({ error: "Connect a wallet before creating an API key." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const keyName = String(body.apiKeyName || "").trim().slice(0, 120);
  if (keyName.length < 2) {
    return NextResponse.json({ error: "API key name must be at least 2 characters." }, { status: 400 });
  }

  const scopes = normalizeScopes(body.scopes);
  if (!scopes.includes("Agent API")) {
    return NextResponse.json({ error: "Agent API scope is required for Agent Skills." }, { status: 400 });
  }
  if ((auth.user.developerApiKeys || []).filter((item) => item.state === "active").length >= 10) {
    return NextResponse.json(
      { error: "Revoke an existing key before creating another one." },
      { status: 409 }
    );
  }

  const id = `devkey_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const { apiKey, record } = createDeveloperApiKey(id, keyName, auth.user.id, scopes);
  const createdAt = record.createdAt;
  const savedRecord = await updateProfileDb((db) => {
    const user = db.users.find((item) => item.id === auth.user.id);
    if (!user) throw new Error("Session user not found.");
    const existing = user.developerApiKeys || [];
    user.developerApiKeys = [record, ...existing];
    return { result: record, user };
  });

  return NextResponse.json(
    {
      apiKey,
      key: {
        id,
        name: keyName,
        maskedKey: `${savedRecord.keyPrefix}••••••••`,
        scopes,
        state: "active",
        createdAt,
        requests: 0
      },
      warning: "Copy this key now. AI2Human stores only its hash and cannot show it again."
    },
    { status: 201 }
  );
}
