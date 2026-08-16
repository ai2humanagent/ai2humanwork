import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "pilot", "prospective-task-drafts.json");
if (!fs.existsSync(file)) throw new Error("Build prospective drafts first.");
const drafts = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
if (drafts.length !== 26) errors.push(`expected 26 prospective drafts; found ${drafts.length}`);
for (const draft of drafts) {
  if (draft.publish_state !== "draft_only") errors.push(`${draft.research_case_id}: not draft-only`);
  if (!draft.campaign?.payoutDisabled || draft.campaign?.environment !== "test") errors.push(`${draft.research_case_id}: unsafe campaign mode`);
  if (!draft.campaign?.originalRequest?.consent_required) errors.push(`${draft.research_case_id}: consent requirement missing`);
  if (!draft.safety?.no_sensitive_data) errors.push(`${draft.research_case_id}: sensitive-data prohibition missing`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("Prospective task drafts valid: 26 draft-only, consent-gated, payout-disabled tasks.");
