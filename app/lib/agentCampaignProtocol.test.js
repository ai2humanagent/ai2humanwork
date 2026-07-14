import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildAgentCampaignPreview,
  buildAgentCampaignTask
} from "./agentCampaignProtocol.js";

const root = process.cwd();

function readExample(name) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "public", "agent", "examples", name), "utf8")
  );
}

test("agent campaign preview exposes funding and winner protocol", async () => {
  const db = { tasks: [] };
  const payload = readExample("create-lucky-draw-task.json");
  const result = await buildAgentCampaignPreview(db, payload);

  assert.equal(result.readyToCreate, true);
  assert.equal(result.readyToPublish, true);
  assert.equal(result.fundingPlan.fundingMode, "test_no_payout");
  assert.equal(result.fundingPlan.payoutDisabled, true);
  assert.equal(result.winnerDistribution.strategy, "instant_qualified_claim");
  assert.equal(result.contractPreflight.required, false);
});

test("agent campaign task starts as draft by default", async () => {
  const db = { tasks: [] };
  const payload = readExample("create-lucky-draw-task.json");
  const preview = await buildAgentCampaignPreview(db, payload);
  const task = buildAgentCampaignTask(payload, preview);

  assert.equal(task.taskState, "closed");
  assert.equal(task.status, "created");
  assert.equal(task.campaign.agentLifecycle.status, "draft");
  assert.equal(task.campaign.payoutDisabled, true);
  assert.equal(task.drawResult.winners.length, 0);
});

test("agent campaign creation ignores publishNow and always starts as a draft", async () => {
  const db = { tasks: [] };
  const payload = { ...readExample("create-lucky-draw-task.json"), publishNow: true };
  const preview = await buildAgentCampaignPreview(db, payload);
  const task = buildAgentCampaignTask(payload, preview);

  assert.equal(task.taskState, "closed");
  assert.equal(task.campaign.agentLifecycle.status, "draft");
});

test("A2MCP service requests preserve non-X proof schema", async () => {
  const db = { tasks: [] };
  const payload = {
    serviceRequest: true,
    requestType: "landing_page_review",
    requesterName: "OKX.AI Buyer",
    requesterHandle: "@ai2humannetwork",
    title: "Review the AI2Human landing page on mobile",
    targetUrl: "https://ai2human.io",
    brief: "Open the landing page on mobile and report layout issues with screenshots.",
    budget: "TBD",
    deadline: "24h",
    fundingMode: "unfunded_campaign",
    environment: "production",
    proofRequirements: [
      "Open the original target URL and inspect the requested page or flow.",
      "Capture at least one screenshot or evidence URL from the reviewed page.",
      "Write concise review notes covering what was checked and what changed or failed.",
      "Add a final pass/fail/needs_review verdict."
    ],
    verificationChecks: [
      "Review notes are present and specific to the target URL.",
      "At least one screenshot or evidence URL is attached.",
      "Final verdict is present."
    ],
    submissionFields: ["reviewNotes", "screenshotUrls", "deviceViewport", "verdict", "summary"],
    deliverable: {
      status: "pending_human_execution",
      statusEvent: "task_created_waiting_for_human_proof",
      estimatedDelivery: "24h"
    }
  };
  const preview = await buildAgentCampaignPreview(db, payload);
  const task = buildAgentCampaignTask(payload, preview);

  assert.equal(task.campaign.platform, "real_world");
  assert.equal(task.campaign.action, "landing_page_review");
  assert.equal(task.campaign.label, "Agent Service Request");
  assert.deepEqual(task.campaign.submissionFields, [
    "reviewNotes",
    "screenshotUrls",
    "deviceViewport",
    "verdict",
    "summary"
  ]);
  assert.equal(task.campaign.submissionFields.includes("executorHandle"), false);
  assert.equal(task.campaign.submissionFields.includes("postUrl"), false);
});

test("agent campaign contract preflight blocks reused pool addresses", async () => {
  const poolAddress = "0x1111111111111111111111111111111111111111";
  const payload = {
    ...readExample("create-lucky-draw-task.json"),
    environment: "production",
    fundingMode: "prize_pool_contract",
    poolAddress
  };
  const db = {
    tasks: [
      {
        id: "existing",
        poolAddress,
        campaign: {}
      }
    ]
  };
  const result = await buildAgentCampaignPreview(db, payload);

  assert.equal(result.contractPreflight.required, true);
  assert.equal(result.contractPreflight.ok, false);
  assert.equal(result.contractPreflight.status, "pool_already_bound");
});

test("managed pool campaigns do not ask requester for a pool address before draft creation", async () => {
  const db = { tasks: [] };
  const payload = {
    ...readExample("create-lucky-draw-task.json"),
    environment: "production",
    fundingMode: "ai2human_managed_pool",
    poolAddress: undefined
  };
  const result = await buildAgentCampaignPreview(db, payload);

  assert.equal(result.readyToCreate, true);
  assert.equal(result.readyToPublish, false);
  assert.equal(result.fundingPlan.createsManagedPrizePool, true);
  assert.equal(result.contractPreflight.required, true);
  assert.equal(result.contractPreflight.status, "managed_pool_not_created");
  assert.equal(result.missingInputs.includes("poolAddress"), false);
});
