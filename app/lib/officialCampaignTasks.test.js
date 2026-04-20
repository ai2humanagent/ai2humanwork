import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TARGET_URL,
  buildOfficialCampaignTask,
  buildRealWorldTask,
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
      { id: "4", by: "human", type: "note", content: "proof_phrase: human fallback for agents" },
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
  const task = {
    ...buildOfficialCampaignTask({
      templateId: "x_quote_launch",
      requesterName: "ai2human Official",
      requesterHandle: "@ai2humanwork"
    }),
    evidence: [
      {
        id: "6",
        by: "human",
        type: "note",
        content: "post_url: https://x.com/differentoperator/status/1903"
      },
      {
        id: "1",
        by: "human",
        type: "note",
        content: "executor_handle: @operator1"
      },
      {
        id: "2",
        by: "human",
        type: "note",
        content: "post_url: https://x.com/operator1/status/1902"
      },
      {
        id: "3",
        by: "human",
        type: "photo",
        content: "/brand/ai2human-social-1.png"
      },
      {
        id: "4",
        by: "human",
        type: "note",
        content: "proof_phrase: human fallback for agents"
      },
      {
        id: "5",
        by: "human",
        type: "note",
        content: "summary: Completed the quote-post task and kept the post live for review."
      }
    ]
  };
  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("Submitted X URL matches executor handle"));
});

test("campaign verification uses the latest structured evidence when proof is resubmitted", () => {
  const task = {
    ...buildOfficialCampaignTask({
      templateId: "x_reply_thread",
      requesterName: "ai2human Official",
      requesterHandle: "@ai2humanwork"
    }),
    evidence: [
      {
        id: "1",
        by: "human",
        type: "note",
        content: "summary: Resubmitted the reply with the correct account and kept it live for review."
      },
      {
        id: "2",
        by: "human",
        type: "note",
        content: "proof_phrase: proof -> verify -> settle"
      },
      {
        id: "3",
        by: "human",
        type: "note",
        content: "post_url: https://x.com/Richard_buildai/status/2036393335326380458"
      },
      {
        id: "4",
        by: "human",
        type: "note",
        content: "executor_handle: @Richard_buildai"
      },
      {
        id: "5",
        by: "human",
        type: "photo",
        content: "/brand/ai2human-social-1.png"
      },
      {
        id: "6",
        by: "human",
        type: "note",
        content: "summary: Earlier submission used the wrong account."
      },
      {
        id: "7",
        by: "human",
        type: "note",
        content: "proof_phrase: proof -> verify -> settle"
      },
      {
        id: "8",
        by: "human",
        type: "note",
        content: "post_url: https://x.com/Richard_buildai/status/2036393335326380458"
      },
      {
        id: "9",
        by: "human",
        type: "note",
        content: "executor_handle: @alice_miraixpm"
      },
      {
        id: "10",
        by: "human",
        type: "photo",
        content: "/brand/ai2human-social-2.png"
      }
    ]
  };

  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, true);
  assert.equal(result.missing.includes("Submitted X URL matches executor handle"), false);
});

test("campaign verification accepts the live X URL as proof for x tasks", () => {
  const task = {
    ...buildOfficialCampaignTask({
      templateId: "x_reply_thread",
      requesterName: "ai2human Official",
      requesterHandle: "@ai2humanwork"
    }),
    evidence: [
      {
        id: "1",
        by: "human",
        type: "note",
        content: "summary: Replied to the thread and kept the post live for review."
      },
      {
        id: "2",
        by: "human",
        type: "note",
        content: "proof_phrase: proof -> verify -> settle"
      },
      {
        id: "3",
        by: "human",
        type: "note",
        content: "post_url: https://x.com/operator1/status/1902"
      },
      {
        id: "4",
        by: "human",
        type: "note",
        content: "executor_handle: @operator1"
      },
      {
        id: "5",
        by: "human",
        type: "photo",
        content: "https://x.com/operator1/status/1902"
      }
    ]
  };

  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, true);
  assert.equal(result.missing.includes("Proof URL or screenshot is uploaded"), false);
});

test("real-world verification passes when location, timestamp, photo, and summary are present", () => {
  const task = {
    ...buildRealWorldTask({
      templateId: "storefront_hours_check",
      requesterName: "Retail Ops Desk"
    }),
    evidence: [
      { id: "1", by: "human", type: "photo", content: "/freelance-hero.jpg" },
      {
        id: "2",
        by: "human",
        type: "note",
        content: "location_note: Blue Bottle Coffee entrance on Market Street"
      },
      {
        id: "3",
        by: "human",
        type: "note",
        content: "timestamp_note: Checked at 2026-03-23 19:40 local time"
      },
      {
        id: "4",
        by: "human",
        type: "note",
        content: "summary: Confirmed the storefront was open and the entrance signage matched the requested location."
      }
    ]
  };

  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, true);
  assert.equal(result.missing.length, 0);
});

test("real-world verification fails when the timestamp note is missing", () => {
  const task = {
    ...buildRealWorldTask({
      templateId: "storefront_hours_check",
      requesterName: "Retail Ops Desk"
    }),
    evidence: [
      { id: "1", by: "human", type: "photo", content: "/freelance-hero.jpg" },
      {
        id: "2",
        by: "human",
        type: "note",
        content: "location_note: Blue Bottle Coffee entrance on Market Street"
      },
      {
        id: "3",
        by: "human",
        type: "note",
        content: "summary: Confirmed the storefront was open and the entrance signage matched the requested location."
      }
    ]
  };

  const result = getTaskVerificationStatus(task);

  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("Timestamp note is present."));
});
