import crypto from "crypto";
import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import {
  attachManagedPrizePool,
  buildAgentCampaignPreview,
  buildAgentCampaignTask
} from "../../../../../lib/agentCampaignProtocol.js";
import { readDb, updateDb, upsertTaskOnly, type Task } from "../../../../../lib/store";
import {
  XLAYER_CAIP2_NETWORK,
  X402_PAYMENT_HEADER,
  X402_PAYMENT_REQUIRED_HEADER,
  X402_PAYMENT_RESPONSE_HEADER,
  X402_SCHEME,
  X402_VERSION,
  encodeBase64Json
} from "../../../../../lib/x402Shared";
import { requireAgentCampaignAuth } from "../../../../agent/campaigns/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SERVICE_PRICE = "0.01";
const DEFAULT_PAY_TO = "0x0000000000000000000000000000000000000000";
const DEFAULT_USDT0 = "0x779ded0c9e1022225f8e0630b35a9b54be713736";

function normalizePrivateKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function parseBaseUnits(amount: string, decimals = 6) {
  const raw = String(amount || DEFAULT_SERVICE_PRICE).trim();
  const [wholeRaw, fractionRaw = ""] = raw.split(".");
  const whole = wholeRaw.replace(/[^\d]/g, "") || "0";
  const fraction = fractionRaw.replace(/[^\d]/g, "").slice(0, decimals).padEnd(decimals, "0");
  return `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
}

function getBaseUrl(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.io";
}

function getPaymentConfig() {
  const displayAmount = readString(process.env.AI2HUMAN_A2MCP_PRICE, DEFAULT_SERVICE_PRICE);
  const decimals = Number(process.env.AI2HUMAN_A2MCP_TOKEN_DECIMALS || 6);
  const privateKey = readString(process.env.AI2HUMAN_A2MCP_PRIVATE_KEY || process.env.XLAYER_X402_PRIVATE_KEY || process.env.XLAYER_SETTLEMENT_PRIVATE_KEY);
  let facilitatorAddress = "";
  try {
    facilitatorAddress = privateKey ? privateKeyToAccount(normalizePrivateKey(privateKey)).address : "";
  } catch {
    facilitatorAddress = "";
  }
  return {
    displayAmount,
    amountBaseUnits: parseBaseUnits(displayAmount, Number.isFinite(decimals) ? decimals : 6),
    network: readString(process.env.AI2HUMAN_A2MCP_X402_NETWORK, XLAYER_CAIP2_NETWORK),
    payTo: readString(
      process.env.AI2HUMAN_A2MCP_PAY_TO ||
        process.env.XLAYER_X402_PAY_TO_ADDRESS ||
        process.env.XLAYER_SETTLEMENT_TO_ADDRESS ||
        facilitatorAddress,
      DEFAULT_PAY_TO
    ),
    asset: readString(process.env.AI2HUMAN_A2MCP_ASSET_ADDRESS || process.env.XLAYER_X402_ASSET_ADDRESS, DEFAULT_USDT0),
    symbol: readString(process.env.AI2HUMAN_A2MCP_SYMBOL || process.env.XLAYER_X402_SYMBOL, "USDT0"),
    tokenName: readString(process.env.AI2HUMAN_A2MCP_TOKEN_NAME || process.env.XLAYER_X402_TOKEN_NAME, "USD Tether"),
    tokenVersion: readString(process.env.AI2HUMAN_A2MCP_TOKEN_VERSION || process.env.XLAYER_X402_TOKEN_VERSION),
    decimals: Number.isFinite(decimals) ? decimals : 6,
    strict: process.env.AI2HUMAN_A2MCP_REQUIRE_PAYMENT !== "false"
  };
}

function buildX402Challenge(request: Request) {
  const config = getPaymentConfig();
  return {
    x402Version: X402_VERSION,
    resource: {
      url: request.url,
      method: request.method,
      contentType: "application/json",
      service: "AI2Human Task Router",
      outputSchema: {
        input: {
          type: "http",
          method: "POST",
          bodyType: "json",
          body: {
            type: "object",
            required: ["title", "description", "targetUrl"],
            properties: {
              title: { type: "string", description: "Task title to create on AI2Human." },
              description: { type: "string", description: "Human execution or verification brief." },
              targetUrl: { type: "string", description: "Target URL, post, site, or evidence location." },
              budget: { type: "string", description: "Suggested task budget, if known." },
              deadline: { type: "string", description: "Suggested task deadline, if known." },
              proofRequired: {
                type: "array",
                items: { type: "string" },
                description: "Structured proof items required from the human executor."
              }
            }
          }
        }
      }
    },
    accepts: [
      {
        scheme: X402_SCHEME,
        network: config.network,
        amount: config.amountBaseUnits,
        maxAmountRequired: config.amountBaseUnits,
        resource: request.url,
        description: "Create an AI2Human human-executed task through the OKX.AI A2MCP service.",
        mimeType: "application/json",
        payTo: config.payTo,
        maxTimeoutSeconds: 300,
        asset: config.asset,
        extra: {
          service: "AI2Human Task Router",
          symbol: config.symbol,
          decimals: config.decimals,
          name: config.tokenName,
          version: config.tokenVersion || undefined,
          displayAmount: config.displayAmount,
          completionLoop: "agent request -> human execution -> structured proof -> verify -> settle"
        }
      }
    ]
  };
}

function normalizeA2mcpTaskInput(input: Record<string, unknown>, paid: boolean) {
  const task = readObject(input.task);
  const source = Object.keys(task).length ? task : input;
  const proofRequired = Array.isArray(source.proofRequired)
    ? source.proofRequired.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const title = readString(source.title, "Human-verified agent task");
  const description = readString(
    source.description || source.brief,
    "Complete the requested human step, submit structured proof, and wait for verification before settlement."
  );
  const targetUrl = readString(source.targetUrl || source.url, "https://ai2human.io");
  const requesterName = readString(source.requesterName || source.projectName || source.agentName, "OKX.AI Agent");
  const requesterHandle = readString(source.requesterHandle || source.projectHandle, "@ai2humannetwork");
  const budget = readString(source.budget || source.reward, paid ? "TBD" : "0 USDC");
  const deadline = readString(source.deadline, "24h");
  const requestedFundingMode = readString(source.fundingMode);
  const requestedEnvironment = readString(source.environment);

  const environment = paid ? readString(requestedEnvironment, "production") : "test";
  const fundingMode = paid ? "ai2human_managed_pool" : "test_no_payout";
  const brief = [
    description,
    proofRequired.length ? `Required proof: ${proofRequired.join(", ")}.` : "",
    "The result must be auditable: task -> human execution -> structured proof -> verify -> settle."
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    templateId: readString(source.templateId, "community_proof_task"),
    requesterName,
    requesterHandle,
    title,
    targetUrl,
    budget,
    deadline,
    blockedHumanStep: readString(
      source.blockedHumanStep,
      "A human operator must complete or verify the step and submit proof."
    ),
    proofPhrase: readString(source.proofPhrase),
    brief,
    completionLoop: "task -> human execution -> structured proof -> verify -> settle",
    environment,
    fundingMode,
    publishNow: false,
    authenticatedTest: !paid,
    rewardDistribution: source.rewardDistribution,
    campaignLinks: source.campaignLinks,
    eligibility: source.eligibility,
    distribution: Array.isArray(source.distribution) ? source.distribution : ["ai2human", "okxai"],
    okxAi: {
      aspType: "A2MCP",
      service: "AI2Human Task Router",
      source: "okx_ai_a2mcp",
      paid
    }
  };
}

async function createTask(input: Record<string, unknown>) {
  let db: Awaited<ReturnType<typeof readDb>>;
  let dbWarning = "";
  try {
    db = await readDb();
  } catch (error) {
    db = { tasks: [], users: [] } as unknown as Awaited<ReturnType<typeof readDb>>;
    dbWarning = error instanceof Error ? error.message : "Database read failed.";
  }

  const preview = await buildAgentCampaignPreview(db, input);
  if (!preview.readyToCreate) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Task is missing required inputs.",
        missingInputs: preview.missingInputs,
        nextQuestions: preview.nextQuestions,
        preview
      }
    };
  }

  let task = buildAgentCampaignTask(input, preview) as Task;
  let creationPreview = preview;
  const managed = await attachManagedPrizePool(db, input, task, preview);
  task = managed.task as Task;
  creationPreview = managed.preview;

  if (input.authenticatedTest) {
    await upsertTaskOnly(task);
  } else {
    await updateDb((draft) => {
      if (draft.tasks.some((item) => item.id === task.id)) {
        task.id = `a2mcp-task-${crypto.randomUUID().slice(0, 12)}`;
      }
      draft.tasks.unshift(task);
    });
  }

  return {
    ok: true,
    status: 201,
    body: {
      ok: true,
      service: "AI2Human Task Router",
      taskId: task.id,
      ai2humanUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.io"}/tasks/${task.id}`,
      okxAiSyncStatus: "ready_for_listing",
      status: task.campaign?.agentLifecycle?.status || "draft",
      task,
      preview: {
        ...creationPreview,
        warnings: dbWarning
          ? [
              ...(creationPreview.warnings || []),
              `Created with fallback state warning: ${dbWarning}`
            ]
          : creationPreview.warnings
      },
      proofSchema: task.campaign
        ? {
            proofRequirements: task.campaign.proofRequirements,
            verificationChecks: task.campaign.verificationChecks,
            submissionFields: task.campaign.submissionFields
          }
        : null
    }
  };
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const config = getPaymentConfig();
  return NextResponse.json({
    ok: true,
    service: "AI2Human Task Router",
    aspType: "A2MCP",
    description:
      "Create human-executed or human-verified AI2Human tasks from an agent call, returning task URL, proof schema, verification requirements, and settlement status.",
    endpoint: `${baseUrl}/api/x402/agent/tasks/create`,
    x402: {
      supported: true,
      mode: config.strict ? "x402_payment_or_agent_api_key" : "agent_api_key_or_optional_x402_payment",
      price: `${config.displayAmount} ${config.symbol}`,
      network: config.network,
      payTo: config.payTo,
      asset: config.asset
    },
    completionLoop: "agent request -> human execution -> structured proof -> verify -> settle",
    registration: {
      okxAiRole: "ASP",
      serviceType: "Agent-to-MCP",
      serviceName: "AI2Human Task Router"
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = readObject(await request.json());
    const paymentHeader = request.headers.get(X402_PAYMENT_HEADER);
    const paid = Boolean(paymentHeader);
    const config = getPaymentConfig();
    const hasApiCredential = Boolean(
      request.headers.get("x-agent-api-key") || request.headers.get("authorization")
    );

    if (!paid) {
      const authError = await requireAgentCampaignAuth(request);
      if (authError) {
        if (!config.strict || hasApiCredential) return authError;

        const challenge = buildX402Challenge(request);
        const encodedChallenge = encodeBase64Json(challenge);
        return NextResponse.json(
          {
            error: "Agent API key or x402 payment required.",
            code: "AGENT_AUTH_OR_PAYMENT_REQUIRED",
            apiKeyUrl: "https://ai2human.io/developers/api-keys",
            ...challenge
          },
          {
            status: 402,
            headers: {
              "Cache-Control": "no-store",
              "Access-Control-Expose-Headers": `${X402_PAYMENT_REQUIRED_HEADER}, ${X402_PAYMENT_RESPONSE_HEADER}`,
              [X402_PAYMENT_REQUIRED_HEADER]: encodedChallenge
            }
          }
        );
      }
    }

    const normalized = normalizeA2mcpTaskInput(body, paid);
    const created = await createTask(normalized);
    const responseBody = {
      ...created.body,
      a2mcp: {
        service: "AI2Human Task Router",
        paid,
        authenticatedTest: !paid,
        x402HeaderReceived: paid,
        paymentMode: paid ? "x402_header_received" : "api_key_test_no_payout",
        note: paid
          ? "Payment header received. Production settlement verification should be enforced by OKX Payment SDK before broad launch."
          : "API-key test mode is limited to test_no_payout task creation."
      }
    };

    return NextResponse.json(responseBody, {
      status: created.status,
      headers: paid
        ? {
            "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
            [X402_PAYMENT_RESPONSE_HEADER]: encodeBase64Json({
              success: true,
              service: "AI2Human Task Router",
              taskId: created.body.taskId,
              settledAt: new Date().toISOString()
            })
          }
        : undefined
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create AI2Human A2MCP task."
      },
      { status: 400 }
    );
  }
}
