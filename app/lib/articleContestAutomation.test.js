import test from "node:test";
import assert from "node:assert/strict";
import {
  isDueForAutomaticArticleReview,
  shouldAutoPayArticleContest
} from "./articleContestAutomation.js";

const task = {
  id: "banner-image-contest-20260612-dexscreener",
  title: "AI2Human X Image Post Contest",
  deadline: "2026-06-19T15:59:00.000Z",
  budget: "20 USDC",
  taskState: "open",
  rewardDistribution: {
    mode: "ranked_article_contest",
    totalPool: "20 USDC",
    maxWinners: 1
  },
  evidence: []
};

test("automatic article review only runs after the contest deadline", () => {
  const submissions = [{ id: "sub-1", taskId: task.id }];
  assert.equal(isDueForAutomaticArticleReview(task, submissions, Date.parse("2026-06-19T15:58:00.000Z")), false);
  assert.equal(isDueForAutomaticArticleReview(task, submissions, Date.parse("2026-06-19T16:00:00.000Z")), true);
});

test("automatic article review skips contests without submissions or already locked final review", () => {
  assert.equal(isDueForAutomaticArticleReview(task, [], Date.parse("2026-06-19T16:00:00.000Z")), false);
  assert.equal(
    isDueForAutomaticArticleReview(
      { ...task, evidence: [{ content: "article_review:{\"requestId\":\"done\"}" }] },
      [{ id: "sub-1", taskId: task.id }],
      Date.parse("2026-06-19T16:00:00.000Z")
    ),
    false
  );
});

test("automatic article payout is disabled unless explicitly configured and under limit", () => {
  assert.equal(shouldAutoPayArticleContest(task, { enabled: false, maxPoolUsdc: 25 }), false);
  assert.equal(shouldAutoPayArticleContest(task, { enabled: true, maxPoolUsdc: 10 }), false);
  assert.equal(shouldAutoPayArticleContest(task, { enabled: true, maxPoolUsdc: 25 }), true);
});
