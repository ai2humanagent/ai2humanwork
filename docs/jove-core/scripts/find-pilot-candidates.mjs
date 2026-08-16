import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../../..");
const dbArg = process.argv.find((item) => item.startsWith("--db="))?.slice(5);
const dbPath = path.resolve(dbArg || process.env.TRUSTNET_DB_PATH || path.join(repo, "data", "db.json"));
if (!fs.existsSync(dbPath)) throw new Error(`Database snapshot not found: ${dbPath}. Pass --db=<privacy-controlled snapshot>.`);
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

function inferClass(task) {
  const text = `${task.title || ""} ${task.campaign?.action || ""} ${task.campaign?.customTaskSpec?.brief || ""}`.toLowerCase();
  if (/publish|post|article|tweet|thread/.test(text)) return "content_publication";
  if (/follow|like|repost|retweet|comment|social/.test(text)) return "social_content";
  if (/account|profile|setting|configure|bind/.test(text)) return "account_configuration";
  if (/form|document|submit|upload/.test(text)) return "form_document_submission";
  if (/deadline|current|latest|time|before|after/.test(text)) return "time_sensitive_digital_state";
  return "cross_evidence_consistency";
}

const candidates = db.tasks.flatMap((task) => {
  const spec = task.campaign?.customTaskSpec;
  const proof = task.evidence.findLast?.((item) => item.metadata?.proofBundle) || [...task.evidence].reverse().find((item) => item.metadata?.proofBundle);
  const verification = task.evidence.findLast?.((item) => item.metadata?.customVerification) || [...task.evidence].reverse().find((item) => item.metadata?.customVerification);
  if (!spec || !proof || !verification) return [];
  return [{
    task_id: task.id,
    suggested_class: inferClass(task),
    status: task.status,
    created_at: task.createdAt,
    policy_version: spec.version,
    proof_bundle_present: true,
    verification_present: true,
    settlement_tx_present: db.payments.some((payment) => payment.taskId === task.id && payment.txHash),
    consent_required_before_export: true
  }];
});
console.log(JSON.stringify({ candidate_count: candidates.length, candidates }, null, 2));
