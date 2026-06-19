import test from "node:test";
import assert from "node:assert/strict";
import { getRewardTaskUnavailableReason, isRewardTaskOpen } from "./rewardTaskGuards.js";

test("reward task guard allows published open activities", () => {
  const task = {
    taskState: "open",
    campaign: {
      agentLifecycle: {
        status: "published"
      }
    }
  };

  assert.equal(getRewardTaskUnavailableReason(task), "");
  assert.equal(isRewardTaskOpen(task), true);
});

test("reward task guard blocks draft activities even if metadata exists", () => {
  const task = {
    taskState: "closed",
    campaign: {
      agentLifecycle: {
        status: "draft"
      }
    }
  };

  assert.equal(getRewardTaskUnavailableReason(task), "This activity is not published yet.");
  assert.equal(isRewardTaskOpen(task), false);
});

test("reward task guard blocks closed, full, and refunded states", () => {
  assert.equal(getRewardTaskUnavailableReason({ taskState: "closed" }), "This activity is not open.");
  assert.equal(getRewardTaskUnavailableReason({ taskState: "full" }), "All reward slots have been claimed.");
  assert.equal(getRewardTaskUnavailableReason({ taskState: "refunded" }), "This activity has been refunded.");
});
