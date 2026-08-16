import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const casesDirectory = path.join(root, "pilot", "cases");
const outputPath = path.join(root, "ratings", "pilot-blinded-packet.jsonl");
if (!fs.existsSync(casesDirectory)) {
  console.error("No pilot/cases directory exists. Capture live cases before building the packet.");
  process.exit(1);
}

const records = fs.readdirSync(casesDirectory).filter((name) => name.endsWith(".json")).sort().map((name) => {
  const item = JSON.parse(fs.readFileSync(path.join(casesDirectory, name), "utf8"));
  return {
    case_id: item.case_id,
    task_class: item.task_class,
    request: item.request.text,
    proof_policy: { requirements: item.policy.requirements, rules: item.policy.rules },
    evidence: {
      bundle_id: item.evidence.bundle_id,
      artifact_count: item.evidence.artifact_count,
      server_received_at: item.evidence.server_received_at,
      privacy_notes: item.evidence.privacy_notes || []
    }
  };
});
fs.writeFileSync(outputPath, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
console.log(`Wrote ${records.length} blinded cases to ${outputPath}`);
