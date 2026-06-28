import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

type ApiKeyRequestInput = {
  projectName: string;
  contactName: string;
  email: string;
  xHandle: string;
  website: string;
  agentPlatform: string;
  expectedVolume: string;
  rewardBudget: string;
  useCases: string[];
  needsWebhooks: boolean;
  needsX402: boolean;
  notes: string;
  walletAddress: string;
  honeypot?: string;
};

function cleanString(value: unknown, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function normalizeHandle(value: unknown) {
  const raw = cleanString(value, 80).replace(/^https?:\/\/(www\.)?x\.com\//i, "");
  return raw ? `@${raw.replace(/^@+/, "").split(/[/?#]/)[0]}` : "";
}

function normalizeBody(body: Record<string, unknown>): ApiKeyRequestInput {
  return {
    projectName: cleanString(body.projectName, 120),
    contactName: cleanString(body.contactName, 100),
    email: cleanString(body.email, 160).toLowerCase(),
    xHandle: normalizeHandle(body.xHandle),
    website: cleanString(body.website, 240),
    agentPlatform: cleanString(body.agentPlatform, 120),
    expectedVolume: cleanString(body.expectedVolume, 80),
    rewardBudget: cleanString(body.rewardBudget, 80),
    useCases: Array.isArray(body.useCases)
      ? body.useCases.map((item) => cleanString(item, 80)).filter(Boolean).slice(0, 8)
      : [],
    needsWebhooks: Boolean(body.needsWebhooks),
    needsX402: Boolean(body.needsX402),
    notes: cleanString(body.notes, 1200),
    walletAddress: cleanString(body.walletAddress, 80),
    honeypot: cleanString(body.honeypot, 80)
  };
}

function validate(input: ApiKeyRequestInput) {
  const errors: Record<string, string> = {};
  if (!input.projectName) errors.projectName = "Project name is required.";
  if (!input.contactName) errors.contactName = "Contact name is required.";
  if (!EMAIL_RE.test(input.email)) errors.email = "A valid work email is required.";
  if (!input.xHandle || input.xHandle.length < 3) errors.xHandle = "Project X handle is required.";
  if (input.website && !URL_RE.test(input.website)) errors.website = "Website must start with https://";
  if (!input.agentPlatform) errors.agentPlatform = "Select the agent platform you plan to use.";
  if (!input.expectedVolume) errors.expectedVolume = "Select expected campaign volume.";
  if (!input.rewardBudget) errors.rewardBudget = "Select expected reward budget.";
  if (input.useCases.length === 0) errors.useCases = "Select at least one use case.";
  return errors;
}

async function notifyAdmin(input: ApiKeyRequestInput, requestId: string) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.DEVELOPER_REQUEST_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "";
  const from = process.env.EMAIL_FROM || process.env.FALLBACK_ALERT_FROM_EMAIL || "AI2Human <noreply@ai2human.io>";
  if (!apiKey || !to) return { attempted: false };

  const lines = [
    `Request: ${requestId}`,
    `Project: ${input.projectName}`,
    `Contact: ${input.contactName} <${input.email}>`,
    `X: ${input.xHandle}`,
    `Website: ${input.website || "not provided"}`,
    `Platform: ${input.agentPlatform}`,
    `Volume: ${input.expectedVolume}`,
    `Budget: ${input.rewardBudget}`,
    `Use cases: ${input.useCases.join(", ")}`,
    `Webhooks: ${input.needsWebhooks ? "yes" : "no"}`,
    `x402: ${input.needsX402 ? "yes" : "no"}`,
    `Wallet: ${input.walletAddress || "not provided"}`,
    "",
    input.notes || "No notes."
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: `AI2Human API key request: ${input.projectName}`,
        text: lines.join("\n")
      })
    });
    return { attempted: true, ok: response.ok, status: response.status };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : "notification failed"
    };
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = normalizeBody(body);
  if (input.honeypot) {
    return NextResponse.json({ ok: true, requestId: "req_filtered", status: "received" }, { status: 202 });
  }

  const errors = validate(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Unable to submit request.", errors }, { status: 400 });
  }

  const requestId = `devkey_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const createdAt = new Date().toISOString();
  let persistence: "supabase" | "notification_only" = "notification_only";

  if (supabase) {
    const { error } = await supabase.from("developer_api_key_requests").insert({
      id: requestId,
      project_name: input.projectName,
      contact_name: input.contactName,
      email: input.email,
      x_handle: input.xHandle,
      website: input.website || null,
      agent_platform: input.agentPlatform,
      expected_volume: input.expectedVolume,
      reward_budget: input.rewardBudget,
      use_cases: input.useCases,
      needs_webhooks: input.needsWebhooks,
      needs_x402: input.needsX402,
      wallet_address: input.walletAddress || null,
      notes: input.notes || null,
      status: "pending_review",
      created_at: createdAt,
      updated_at: createdAt
    });
    if (!error) {
      persistence = "supabase";
    } else {
      console.warn("[DeveloperApiKeyRequest] supabase_insert_failed", { requestId, error: error.message });
    }
  }

  const notification = await notifyAdmin(input, requestId);

  return NextResponse.json(
    {
      ok: true,
      requestId,
      status: "pending_review",
      persistence,
      notification,
      nextSteps: [
        "We review the project and risk profile.",
        "Approved projects receive an AI2HUMAN_AGENT_KEY.",
        "Use the key in OpenClaw, Bankr, or your own agent with x-agent-api-key."
      ]
    },
    { status: 201 }
  );
}
