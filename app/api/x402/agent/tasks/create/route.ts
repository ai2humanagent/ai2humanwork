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
const DEFAULT_HUMAN_EXECUTION_ETA = "24h";
const PAYMENT_REPLAY_HEADERS = [
  X402_PAYMENT_HEADER,
  "X-PAYMENT-SIGNATURE",
  "PAYMENT-SIGNATURE",
  "PAYMENT",
  "X-OKX-PAYMENT"
];

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

function readPaymentReplayHeader(request: Request) {
  for (const header of PAYMENT_REPLAY_HEADERS) {
    const value = request.headers.get(header);
    if (value?.trim()) {
      return {
        name: header,
        value: value.trim()
      };
    }
  }
  return null;
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
    serviceContract: {
      realtime: false,
      expectedDeliveryWindow: DEFAULT_HUMAN_EXECUTION_ETA,
      chargeTiming: "charged_before_human_execution",
      buyerNotice:
        "This endpoint creates an AI2Human human-execution task after payment. The immediate replay returns a task URL and proof schema; human notes/screenshots are delivered after execution.",
      finalDeliverable:
        "Human review notes, screenshot or evidence URLs, verification result, and settlement-ready proof bundle."
    },
    resource: {
      url: request.url,
      // This service creates tasks through POST. Keep the advertised action stable
      // even when an A2MCP validator probes the endpoint with a bare GET request.
      method: "POST",
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
              },
              requestType: {
                type: "string",
                description: "Original requested task type, e.g. landing_page_review, mobile_check, link_verification, local_check."
              },
              device: {
                type: "string",
                description: "Optional device or viewport to check, e.g. iPhone mobile, desktop Chrome."
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
          completionLoop: "agent request -> human execution -> structured proof -> verify -> settle",
          realtime: false,
          expectedDeliveryWindow: DEFAULT_HUMAN_EXECUTION_ETA,
          finalDeliverable: "review notes + screenshots/evidence + verification result"
        }
      }
    ]
  };
}

function x402PaymentRequiredResponse(request: Request) {
  const challenge = buildX402Challenge(request);
  const settlementAddress = challenge.accepts[0]?.payTo;
  const encodedChallenge = encodeBase64Json(challenge);

  return NextResponse.json(
    {
      error: "Agent API key or x402 payment required.",
      code: "AGENT_AUTH_OR_PAYMENT_REQUIRED",
      apiKeyUrl: "https://ai2human.io/developers/api-keys",
      settlementAddress,
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

function inferRequestType(source: Record<string, unknown>) {
  const explicit = readString(source.requestType || source.taskType || source.action);
  if (explicit) return explicit;

  const text = [
    source.title,
    source.description,
    source.brief,
    source.targetUrl,
    source.url
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  if (text.includes("landing") || text.includes("homepage")) return "landing_page_review";
  if (text.includes("mobile") || text.includes("iphone") || text.includes("responsive")) return "mobile_page_check";
  if (text.includes("screenshot") || text.includes("visual")) return "visual_review";
  if (text.includes("local") || text.includes("store") || text.includes("location")) return "local_verification";
  return "human_execution_request";
}

function buildProofSchemaForRequest(source: Record<string, unknown>, requestType: string) {
  const explicitProof = Array.isArray(source.proofRequired)
    ? source.proofRequired.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (explicitProof.length > 0) {
    return {
      proofRequirements: explicitProof,
      verificationChecks: [
        "Requested proof items are present.",
        "Evidence is specific to the target URL or requested context.",
        "Execution notes explain what was checked and what was found."
      ],
      submissionFields: ["reviewNotes", "evidenceUrls", "screenshotUrls", "summary"]
    };
  }

  if (requestType === "landing_page_review" || requestType === "mobile_page_check" || requestType === "visual_review") {
    return {
      proofRequirements: [
        "Open the original target URL and inspect the requested page or flow.",
        "Capture at least one screenshot or evidence URL from the reviewed page.",
        "Write concise review notes covering what was checked and what changed or failed.",
        "Include device, viewport, browser, or environment when relevant.",
        "Add a final pass/fail/needs_review verdict."
      ],
      verificationChecks: [
        "Review notes are present and specific to the target URL.",
        "At least one screenshot or evidence URL is attached.",
        "Device, viewport, or environment is stated when relevant.",
        "Final verdict is present."
      ],
      submissionFields: ["reviewNotes", "screenshotUrls", "deviceViewport", "verdict", "summary"]
    };
  }

  return {
    proofRequirements: [
      "Complete or verify the requested human step.",
      "Attach evidence URLs, screenshots, files, or notes that prove the work was performed.",
      "Explain the result in a short execution summary.",
      "Add a final pass/fail/needs_review verdict."
    ],
    verificationChecks: [
      "Execution summary is present.",
      "Evidence is attached or linked.",
      "Final verdict is present."
    ],
    submissionFields: ["executionNotes", "evidenceUrls", "verdict", "summary"]
  };
}

function normalizeA2mcpTaskInput(input: Record<string, unknown>, paid: boolean) {
  const task = readObject(input.task);
  const source = Object.keys(task).length ? task : input;
  const hasRewardDistribution = Boolean(source.rewardDistribution && typeof source.rewardDistribution === "object");
  const title = readString(source.title, "Human-verified agent task");
  const description = readString(
    source.description || source.brief,
    "Complete the requested human step, submit structured proof, and wait for verification before settlement."
  );
  const targetUrl = readString(source.targetUrl || source.url, "https://ai2human.io");
  const requestType = inferRequestType(source);
  const proofSchema = buildProofSchemaForRequest(source, requestType);
  const requesterName = readString(source.requesterName || source.projectName || source.agentName, "OKX.AI Agent");
  const requesterHandle = readString(source.requesterHandle || source.projectHandle, "@ai2humannetwork");
  const budget = readString(source.budget || source.reward, paid ? "TBD" : "0 USDC");
  const deadline = readString(source.deadline, "24h");
  const requestedFundingMode = readString(source.fundingMode);
  const requestedEnvironment = readString(source.environment);

  const environment = paid ? readString(requestedEnvironment, "production") : "test";
  const fundingMode = paid
    ? readString(requestedFundingMode, hasRewardDistribution ? "ai2human_managed_pool" : "unfunded_campaign")
    : "test_no_payout";
  const brief = [
    description,
    `Original request type: ${requestType}.`,
    proofSchema.proofRequirements.length ? `Required proof: ${proofSchema.proofRequirements.join(" ")}` : "",
    "The result must be auditable: task -> human execution -> structured proof -> verify -> settle."
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    serviceRequest: true,
    requestType,
    originalRequest: {
      ...source,
      requestType,
      preservedBy: "ai2human_a2mcp"
    },
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
    proofRequirements: proofSchema.proofRequirements,
    verificationChecks: proofSchema.verificationChecks,
    submissionFields: proofSchema.submissionFields,
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
    },
    deliverable: {
      status: "pending_human_execution",
      statusEvent: "task_created_waiting_for_human_proof",
      estimatedDelivery: readString(source.estimatedDelivery || source.eta, DEFAULT_HUMAN_EXECUTION_ETA),
      finalDeliverable: "human review notes, screenshots/evidence, verification result",
      pollingHint: "Fetch the returned taskUrl to monitor submitted proof and verification status."
    }
  };
}

async function createTask(input: Record<string, unknown>) {
  const deliverable = readObject(input.deliverable);
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
      taskUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.io"}/tasks/${task.id}`,
      statusUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.io"}/tasks/${task.id}`,
      deliverableStatus: readString(deliverable.status, "pending_human_execution"),
      deliverableEvent: readString(deliverable.statusEvent, "task_created_waiting_for_human_proof"),
      estimatedDelivery: readString(deliverable.estimatedDelivery, task.deadline),
      finalDeliverable: readString(deliverable.finalDeliverable, "human proof bundle"),
      polling: {
        mode: "task_url",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.io"}/tasks/${task.id}`,
        note: readString(deliverable.pollingHint, "Open the task URL to track human proof and verification status.")
      },
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
  return x402PaymentRequiredResponse(request);
}

export async function POST(request: Request) {
  try {
    const body = readObject(await request.json());
    const paymentHeader = readPaymentReplayHeader(request);
    const paid = Boolean(paymentHeader?.value);
    const config = getPaymentConfig();
    const hasApiCredential = Boolean(
      request.headers.get("x-agent-api-key") || request.headers.get("authorization")
    );

    if (!paid) {
      const authError = await requireAgentCampaignAuth(request);
      if (authError) {
        if (!config.strict || hasApiCredential) return authError;
        return x402PaymentRequiredResponse(request);
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
        paymentHeaderName: paymentHeader?.name,
        paymentMode: paid ? "x402_header_received" : "api_key_test_no_payout",
        deliverableStatus: created.body.deliverableStatus,
        estimatedDelivery: created.body.estimatedDelivery,
        finalDeliverable: created.body.finalDeliverable,
        taskUrl: created.body.taskUrl,
        statusUrl: created.body.statusUrl,
        note: paid
          ? "Payment replay accepted. AI2Human task created and awaiting human proof; the creation receipt is not the final human proof deliverable."
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
