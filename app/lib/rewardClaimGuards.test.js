import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRewardClaimIdempotencyKey,
  countRewardClaims,
  findConflictingXRewardClaim,
  findExistingRewardClaim,
  findMissingVerifiedSubtask
} from "./rewardClaimGuards.js";

const TASK_ID = "lucky-draw-a2h-holder";
const WALLET = "0xFC76F857c9Aef2E29E0fc8cc04662C47d9Dfb470";
const OTHER_WALLET = "0x1111111111111111111111111111111111111111";
const TASK = {
  id: TASK_ID,
  poolAddress: "0x6837BF85b5483Aaa264f486c0eb009Fd16B23060"
};

test("reward claim idempotency blocks the same wallet from being paid twice", () => {
  const idempotencyKey = buildRewardClaimIdempotencyKey(TASK_ID, WALLET);
  const existing = findExistingRewardClaim(
    [
      {
        taskId: TASK_ID,
        source: "twitter_task",
        method: "prize_pool_claim",
        receiverAddress: WALLET.toLowerCase(),
        idempotencyKey,
        txHash: "0xabc",
        amount: "1"
      }
    ],
    TASK,
    TASK_ID,
    WALLET
  );

  assert.equal(existing?.idempotencyKey, idempotencyKey);
});

test("reward claim idempotency also blocks duplicated idempotency keys", () => {
  const existing = findExistingRewardClaim(
    [
      {
        taskId: TASK_ID,
        source: "twitter_task",
        method: "prize_pool_claim",
        receiverAddress: OTHER_WALLET,
        idempotencyKey: buildRewardClaimIdempotencyKey(TASK_ID, WALLET),
        txHash: "0xabc",
        amount: "1"
      }
    ],
    TASK,
    TASK_ID,
    WALLET
  );

  assert.equal(existing?.receiverAddress, OTHER_WALLET);
});

test("same X account cannot claim a lucky draw task with another wallet", () => {
  const conflict = findConflictingXRewardClaim(
    [
      {
        taskId: TASK_ID,
        walletAddress: OTHER_WALLET,
        xHandle: "@Richard_buildai"
      }
    ],
    TASK_ID,
    "richard_buildai",
    WALLET
  );

  assert.equal(conflict?.walletAddress, OTHER_WALLET);
});

test("claim counting only includes real prize pool claim payments for pool-backed tasks", () => {
  const count = countRewardClaims(
    [
      {
        taskId: TASK_ID,
        source: "twitter_task",
        method: "mock_x402",
        receiverAddress: WALLET,
        amount: "1"
      },
      {
        taskId: TASK_ID,
        source: "twitter_task",
        method: "prize_pool_claim",
        receiverAddress: OTHER_WALLET,
        txHash: "0xabc",
        amount: "1"
      },
      {
        taskId: "another-task",
        source: "twitter_task",
        method: "prize_pool_claim",
        receiverAddress: WALLET,
        txHash: "0xdef",
        amount: "1"
      }
    ],
    TASK,
    TASK_ID
  );

  assert.equal(count, 1);
});

test("all required subtasks must be verified before reward claim", () => {
  const progress = ["0", "1", "3"].map((subtaskKey) => ({
    taskId: TASK_ID,
    walletAddress: WALLET.toLowerCase(),
    subtaskKey,
    status: "verified"
  }));

  assert.equal(findMissingVerifiedSubtask(progress, TASK_ID, WALLET, ["0", "1", "2", "3"]), "2");
  assert.equal(
    findMissingVerifiedSubtask(
      [...progress, { taskId: TASK_ID, walletAddress: WALLET.toLowerCase(), subtaskKey: "2", status: "verified" }],
      TASK_ID,
      WALLET,
      ["0", "1", "2", "3"]
    ),
    ""
  );
});
