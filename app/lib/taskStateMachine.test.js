import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, explainInvalidTransition } from "./taskStateMachine.js";

test("allows expected transitions in the core loop", () => {
  assert.equal(canTransition("created", "ai_failed"), true);
  assert.equal(canTransition("created", "human_assigned"), true);
  assert.equal(canTransition("ai_failed", "human_assigned"), true);
  assert.equal(canTransition("human_assigned", "human_done"), true);
  assert.equal(canTransition("human_done", "verified"), true);
  assert.equal(canTransition("verified", "paid"), true);
});

test("blocks invalid transition jumps", () => {
  assert.equal(canTransition("created", "paid"), false);
  assert.equal(canTransition("ai_failed", "paid"), false);
  assert.equal(canTransition("paid", "verified"), false);
});

test("invalid transition message includes allowed targets", () => {
  const message = explainInvalidTransition("created", "paid");
  assert.equal(message.includes("created -> paid"), true);
  assert.equal(message.includes("ai_running"), true);
  assert.equal(message.includes("human_assigned"), true);
});
