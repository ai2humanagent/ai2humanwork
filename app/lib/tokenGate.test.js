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
  assert.equal(shouldCheckTokenGate(task, "task_claim"), false);
  assert.equal(shouldCheckTokenGate(task, "reward_claim"), true);
});

test("A2H holder campaigns block both task progress and reward claim below the fixed threshold", async () => {
  const task = gatedTask({
    minimumBalance: "1000000",
    requiredAt: ["quest_action", "reward_claim"]
  });

  assert.equal(shouldCheckTokenGate(task, "quest_action"), true);
  assert.equal(shouldCheckTokenGate(task, "task_claim"), true);
  assert.equal(shouldCheckTokenGate(task, "reward_claim"), true);

  const actionFail = await checkTokenGateForWallet(task, HOLDER, "quest_action", {
    readBalance: async () => parseUnits("999999.999999", 18)
  });
  assert.equal(actionFail.ok, false);
  assert.equal(actionFail.reason, "insufficient_balance");

  const claimFail = await checkTokenGateForWallet(task, HOLDER, "reward_claim", {
    readBalance: async () => parseUnits("0", 18)
  });
  assert.equal(claimFail.ok, false);
  assert.equal(claimFail.reason, "insufficient_balance");

  const claimPass = await checkTokenGateForWallet(task, HOLDER, "reward_claim", {
    readBalance: async () => parseUnits("1000000", 18)
  });
  assert.equal(claimPass.ok, true);
});

test("token gate can require a dynamic USD value without hardcoding token amount", async () => {
  const task = gatedTask({
    minimumBalance: undefined,
    minimumUsdValue: "1",
    priceSource: "configured"
  });

  const fail = await checkTokenGateForWallet(task, HOLDER, "quest_action", {
    readPriceUsd: async () => 0.25,
    readBalance: async () => parseUnits("3.99", 18)
  });
  assert.equal(fail.ok, false);
  assert.equal(fail.minimumTokenBalance, "4");
  assert.match(tokenGateErrorMessage(fail, "quest_action"), /around 1 USDC worth of \$A2H/);

  const pass = await checkTokenGateForWallet(task, HOLDER, "reward_claim", {
    readPriceUsd: async () => 0.25,
    readBalance: async () => parseUnits("4", 18)
  });
  assert.equal(pass.ok, true);
  assert.equal(pass.minimumTokenBalance, "4");
});

test("token gate description is safe for task UI", () => {
  const description = describeTokenGate(gatedTask({ minimumBalance: "1", holderLabel: "$A2H holder" }));
  assert.equal(description.text, "Hold at least 1 $A2H on Base to participate.");
  assert.equal(description.contractAddress, TOKEN);
});

test("token gate description supports dynamic USD-value wording", () => {
  const description = describeTokenGate(gatedTask({
    minimumBalance: undefined,
    minimumUsdValue: "1",
    priceSource: "dexscreener"
  }));
  assert.equal(description.text, "Hold at least around 1 USDC worth of $A2H on Base to participate.");
  assert.equal(description.minimumUsdValue, "1");
  assert.equal(description.priceSource, "dexscreener");
});
