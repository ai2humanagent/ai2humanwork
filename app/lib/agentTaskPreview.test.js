import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildAgentTaskPreview } from "./agentTaskPreview.js";

const root = process.cwd();

function readExample(name) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "public", "agent", "examples", name), "utf8")
  );
}

test("agent human task example can be previewed without creating a task", () => {
  const payload = readExample("create-human-task.json");
  const result = buildAgentTaskPreview(payload);

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.preview.budget, "20 USDC");
  assert.equal(result.preview.taskState, "open");
  assert.equal(result.preview.campaign.action, "engage");
  assert.ok(result.preview.acceptance.includes("same X handle"));
});

test("agent lucky draw example preserves reward distribution", () => {
  const payload = readExample("create-lucky-draw-task.json");
  const result = buildAgentTaskPreview(payload);

  assert.equal(result.ok, true);
  assert.equal(result.readyToCreate, true);
  assert.equal(result.preview.rewardDistribution.mode, "lucky_draw");
  assert.equal(result.preview.rewardDistribution.totalPool, "20 USDC");
  assert.equal(result.preview.rewardDistribution.perWinner, "2 USDC");
  assert.equal(result.preview.rewardDistribution.maxWinners, 10);
  assert.equal(result.preview.campaignLinks.telegramUrl, "https://t.me/novaagentlabs");
  assert.ok(result.preview.acceptance.includes("Join the Telegram group: https://t.me/novaagentlabs"));
});

test("agent lucky draw preview requires requester-provided campaign links", () => {
  const payload = readExample("create-lucky-draw-task.json");
  delete payload.campaignLinks;
  const result = buildAgentTaskPreview(payload);

  assert.equal(result.ok, false);
  assert.equal(result.readyToCreate, false);
  assert.deepEqual(result.missingInputs, [
    "campaignLinks.followHandle",
    "campaignLinks.telegramUrl",
    "campaignLinks.repostUrl",
    "campaignLinks.likeUrl"
  ]);
});

test("agent lucky draw preview requires funding mode and environment", () => {
  const payload = readExample("create-lucky-draw-task.json");
  delete payload.fundingMode;
  delete payload.environment;
  const result = buildAgentTaskPreview(payload);

  assert.equal(result.ok, false);
  assert.equal(result.readyToCreate, false);
  assert.ok(result.missingInputs.includes("fundingMode"));
  assert.ok(result.missingInputs.includes("environment"));
  assert.ok(result.nextQuestions.some((item) => item.field === "fundingMode"));
});

test("agent preview requires requester-provided target URLs for campaign templates", () => {
  const payload = readExample("create-human-task.json");
  payload.targetUrl = "https://x.com/yourproject/status/...";
  const result = buildAgentTaskPreview(payload);

  assert.equal(result.ok, false);
  assert.equal(result.readyToCreate, false);
  assert.ok(result.missingInputs.includes("targetUrl"));
});

test("agent preview rejects empty payloads", () => {
  assert.throws(() => buildAgentTaskPreview({}), /Title or templateId is required/);
});
