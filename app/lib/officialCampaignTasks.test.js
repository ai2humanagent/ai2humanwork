import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TARGET_URL,
  buildOfficialCampaignTask,
  getTaskVerificationStatus
} from "./officialCampaignTasks.js";

function makeTaskWithEvidence(templateId, extraEvidence = []) {
  const base = buildOfficialCampaignTask({
    templateId,
    requesterName: "ai2human Official",
    requesterHandle: "@ai2humanwork",
    targetUrl: DEFAULT_TARGET_URL
  });

  return {
    ...base,
    evidence: [
      { id: "1", by: "human", type: "note", content: "executor_handle: @operator1" },
      { id: "2", by: "human", type: "note", content: "post_url: https://x.com/operator1/status/1902" },
      { id: "3", by: "human", type: "photo", content: "/brand/ai2human-social-1.png" },
      { id: "4", by: "human", type: "note", content: "proof_phrase: human fallback on x layer" },
      {
        id: "5",
        by: "human",
        type: "note",
        content: "summary: Completed the quote-post task and kept the post live for review."
      },
      ...extraEvidence
    ]
  };
}

test("campaign verification passes when required structured evidence is present", () => {
  const task = makeTaskWithEvidence("x_quote_launch");
  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, true);
  assert.equal(result.missing.length, 0);
});

test("campaign verification fails when live URL evidence is missing", () => {
  const task = makeTaskWithEvidence("x_quote_launch").evidence.filter(
    (item) => !item.content.startsWith("post_url:")
  );
  const result = getTaskVerificationStatus({
    ...buildOfficialCampaignTask({
      templateId: "x_quote_launch",
      requesterName: "ai2human Official",
      requesterHandle: "@ai2humanwork"
    }),
    evidence: task
  });

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("Live post URL is present"));
});

test("campaign verification fails when the submitted URL does not match the executor handle", () => {
  const task = makeTaskWithEvidence("x_quote_launch", [
    {
      id: "6",
      by: "human",
      type: "note",
      content: "post_url: https://x.com/differentoperator/status/1903"
    }
  ]);
  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("Submitted X URL matches executor handle"));
});
