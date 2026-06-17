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
