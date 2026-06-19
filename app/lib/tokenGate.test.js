import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "viem";
import {
  checkTokenGateForWallet,
  describeTokenGate,
  shouldCheckTokenGate,
  tokenGateErrorMessage
} from "./tokenGate.js";

const HOLDER = "0x0000000000000000000000000000000000000001";
const TOKEN = "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3";

function gatedTask(overrides = {}) {
  return {
    id: "task-a2h-holder-only",
    campaign: {
      eligibility: {
        tokenGate: {
          network: "base",
          chainId: 8453,
          contractAddress: TOKEN,
          symbol: "A2H",
          decimals: 18,
          minimumBalance: "1000",
          ...overrides
        }
      }
    }
  };
}

test("token gate is optional when a task has no holder requirement", async () => {
  const result = await checkTokenGateForWallet({ id: "open-task", campaign: {} }, HOLDER, "quest_action", {
    readBalance: async () => {
      throw new Error("should not read chain");
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.required, false);
});

test("token gate checks configured ERC20 balance against minimum", async () => {
  const task = gatedTask();
  const pass = await checkTokenGateForWallet(task, HOLDER, "article_submit", {
    readBalance: async () => parseUnits("1200", 18)
  });
  assert.equal(pass.ok, true);
  assert.equal(pass.balanceFormatted, "1200");

  const fail = await checkTokenGateForWallet(task, HOLDER, "article_submit", {
    readBalance: async () => parseUnits("999.9", 18)
  });
  assert.equal(fail.ok, false);
  assert.equal(fail.reason, "insufficient_balance");
  assert.match(tokenGateErrorMessage(fail, "article_submit"), /Hold at least 1000 \$A2H/);
});

test("token gate can be scoped to specific participation actions", async () => {
  const task = gatedTask({ requiredAt: ["reward_claim"] });
  assert.equal(shouldCheckTokenGate(task, "article_submit"), false);
  assert.equal(shouldCheckTokenGate(task, "reward_claim"), true);
});

test("token gate description is safe for task UI", () => {
  const description = describeTokenGate(gatedTask({ minimumBalance: "1", holderLabel: "$A2H holder" }));
  assert.equal(description.text, "Hold at least 1 $A2H on Base to participate.");
  assert.equal(description.contractAddress, TOKEN);
});
