import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const prompts = JSON.parse(fs.readFileSync(path.join(root, "pilot", "task-prompts.json"), "utf8"));
const launchLines = fs.readFileSync(path.join(root, "pilot", "launch-plan.csv"), "utf8").trim().split(/\r?\n/);
const headers = launchLines.shift().split(",");
const launch = launchLines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
const prospective = new Set(launch.filter((row) => row.source_strategy === "prospective_live").map((row) => row.case_id));
const drafts = prompts.filter((item) => prospective.has(item.case_id)).map((item) => ({
  research_case_id: item.case_id,
  title: `JOVE-Core consented pilot: ${item.task_class.replaceAll("_", " ")}`,
  brief: item.prompt,
  budget: "0",
  deadline_hours: 72,
  campaign: {
    platform: "research",
    action: "judgment_based_digital_evidence",
    environment: "test",
    payoutDisabled: true,
    reviewPolicy: "publisher_approval",
    fundingMode: "test_no_payout",
    isTest: true,
    originalRequest: { study: "JOVE-Core live pilot", case_id: item.case_id, consent_required: true }
  },
  safety: { participant_owned_or_test_account_only: true, no_sensitive_data: true, reversible_where_possible: true },
  publish_state: "draft_only"
}));
const output = path.join(root, "pilot", "prospective-task-drafts.json");
fs.writeFileSync(output, JSON.stringify(drafts, null, 2) + "\n");
console.log(`Built ${drafts.length} draft-only prospective tasks at ${output}`);
