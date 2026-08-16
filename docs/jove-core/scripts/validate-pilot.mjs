import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(root, "pilot", "manifest.csv");
const casesDirectory = path.join(root, "pilot", "cases");
const allowedClasses = new Set([
  "social_content", "account_configuration", "content_publication",
  "form_document_submission", "time_sensitive_digital_state", "cross_evidence_consistency"
]);
const allowedStatuses = new Set(["planned", "consented", "captured", "rated", "adjudicated", "excluded"]);
const sha256Pattern = /^[a-f0-9]{64}$/;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.filter(Boolean).map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const errors = [];
const manifest = parseCsv(fs.readFileSync(manifestPath, "utf8"));
assert(manifest.length === 20, `manifest must contain 20 cases; found ${manifest.length}`, errors);
assert(new Set(manifest.map((row) => row.case_id)).size === manifest.length, "manifest case IDs must be unique", errors);

for (const row of manifest) {
  assert(/^jove_core_[0-9]{4}$/.test(row.case_id), `${row.case_id}: invalid case ID`, errors);
  assert(allowedClasses.has(row.task_class), `${row.case_id}: invalid task class`, errors);
  assert(allowedStatuses.has(row.research_status), `${row.case_id}: invalid research status`, errors);
  if (["captured", "rated", "adjudicated"].includes(row.research_status)) {
    assert(Boolean(row.receipt_id), `${row.case_id}: ${row.research_status} requires receipt_id`, errors);
    assert(fs.existsSync(path.join(casesDirectory, `${row.case_id}.json`)), `${row.case_id}: ${row.research_status} requires captured case file`, errors);
  }
}

const expectedCounts = { social_content: 4, account_configuration: 3, content_publication: 4, form_document_submission: 3, time_sensitive_digital_state: 3, cross_evidence_consistency: 3 };
for (const [taskClass, expected] of Object.entries(expectedCounts)) {
  const actual = manifest.filter((row) => row.task_class === taskClass).length;
  assert(actual === expected, `${taskClass}: expected ${expected} slots; found ${actual}`, errors);
}

if (fs.existsSync(casesDirectory)) {
  for (const filename of fs.readdirSync(casesDirectory).filter((item) => item.endsWith(".json"))) {
    const record = JSON.parse(fs.readFileSync(path.join(casesDirectory, filename), "utf8"));
    const prefix = record.case_id || filename;
    assert(manifest.some((row) => row.case_id === record.case_id), `${prefix}: not present in manifest`, errors);
    assert(record.study_phase === "live_pilot", `${prefix}: study_phase must be live_pilot`, errors);
    assert(allowedClasses.has(record.task_class), `${prefix}: invalid task_class`, errors);
    assert(record.consent?.research_use === true, `${prefix}: research consent missing`, errors);
    assert(record.policy?.version === "custom-task-spec/v1", `${prefix}: wrong policy version`, errors);
    assert(sha256Pattern.test(record.policy?.snapshot_sha256 || ""), `${prefix}: invalid policy hash`, errors);
    assert(record.evidence?.version === "proof-bundle/v1", `${prefix}: wrong evidence version`, errors);
    assert(sha256Pattern.test(record.evidence?.integrity_hash || ""), `${prefix}: invalid evidence hash`, errors);
    assert(sha256Pattern.test(record.receipt?.receipt_sha256 || ""), `${prefix}: invalid receipt hash`, errors);
    if (record.receipt?.settlement?.status === "settled") {
      assert(/^0x[a-fA-F0-9]{64}$/.test(record.receipt.settlement.tx_hash || ""), `${prefix}: settled receipt requires a transaction hash`, errors);
    }
  }
}

if (errors.length) {
  console.error(`JOVE-Core pilot validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`JOVE-Core pilot validation passed: ${manifest.length} planned slots.`);
