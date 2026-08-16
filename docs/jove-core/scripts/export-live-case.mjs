import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../../..");
const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const [key, ...parts] = item.replace(/^--/, "").split("=");
  return [key, parts.join("=") || true];
}));
if (!args["task-id"] || !args["case-id"] || !args["task-class"]) {
  throw new Error("Required: --task-id=... --case-id=jove_core_0001 --task-class=... (--consent-at optional when the task carries campaign.researchConsent)");
}

const allowedClasses = new Set(["social_content", "account_configuration", "content_publication", "form_document_submission", "time_sensitive_digital_state", "cross_evidence_consistency"]);
if (!allowedClasses.has(args["task-class"])) throw new Error("Invalid JOVE-Core task class.");
if (!/^jove_core_[0-9]{4}$/.test(args["case-id"])) throw new Error("Invalid pilot case ID.");
if (!Number.isFinite(Date.parse(args["consent-at"]))) throw new Error("Invalid consent timestamp.");

const dbPath = path.resolve(String(args.db || process.env.TRUSTNET_DB_PATH || path.join(repo, "data", "db.json")));
if (!fs.existsSync(dbPath)) throw new Error(`Database snapshot not found: ${dbPath}. Pass --db=<privacy-controlled snapshot>.`);
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const task = db.tasks.find((item) => item.id === args["task-id"]);
if (!task) throw new Error(`Task not found: ${args["task-id"]}`);
const recordedConsent = task.campaign?.researchConsent && typeof task.campaign.researchConsent === "object"
  ? task.campaign.researchConsent
  : {};
const consentedAt = args["consent-at"] || recordedConsent.consentedAt;
if (!consentedAt) {
  throw new Error("Missing consent: pass --consent-at or the task must carry campaign.researchConsent.consentedAt.");
}
const consentVersion = String(recordedConsent.version || "jove-core-consent-v1");
if (!/^jove-core-consent/.test(consentVersion)) {
  throw new Error(`Unsupported consent version: ${consentVersion}`);
}
const spec = task.campaign?.customTaskSpec;
if (!spec) throw new Error("Task has no customTaskSpec and cannot enter JOVE-Core.");

const proofEntries = task.evidence.filter((item) => item.metadata?.proofBundle);
const verificationEntries = task.evidence.filter((item) => item.metadata?.customVerification);
const proofBundle = proofEntries.at(-1)?.metadata?.proofBundle;
const verification = verificationEntries.at(-1)?.metadata?.customVerification;
if (!proofBundle || !verification) throw new Error("Task lacks a complete proof bundle and custom verification record.");
const payment = db.payments.find((item) => item.taskId === task.id && item.status === "paid");

const sha = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const forensics = proofBundle.artifacts.flatMap((artifact) => {
  const integrity = artifact.integrity || {};
  return [
    ...(integrity.warnings || []).map((code) => ({ artifact_id: artifact.id, type: "warning", code })),
    ...(integrity.editingSignals || []).map((code) => ({ artifact_id: artifact.id, type: "editing_signal", code })),
    ...(integrity.c2pa?.present ? [{ artifact_id: artifact.id, type: "c2pa_presence", code: "present" }] : [])
  ];
});
const modelReviews = (verification.checks || []).filter((check) => check.method === "multimodal").map((check) => ({ id: check.id, passed: check.passed, confidence: check.confidence, reason: check.reason, severity: check.severity }));
const deterministicChecks = (verification.checks || []).filter((check) => check.method !== "multimodal").map((check) => ({ id: check.id, passed: check.passed, confidence: check.confidence, reason: check.reason, method: check.method, severity: check.severity }));
const receiptCore = { task_id: task.id, policy_hash: sha(spec), evidence_hash: proofBundle.integrityHash, decision: verification.verdict, verified_at: verification.verifiedAt, tx_hash: payment?.txHash || null };
const record = {
  case_id: args["case-id"],
  study_phase: "live_pilot",
  task_class: args["task-class"],
  request: { text: spec.brief || task.title, created_at: task.createdAt, source: "live_product", product_task_id: task.id },
  consent: {
    research_use: true,
    recorded_at: new Date(consentedAt).toISOString(),
    consent_version: consentVersion,
    retention_policy: String(recordedConsent.retention || args.retention || "Private source evidence retained for the approved study period; public release is metadata-only."),
    participant_reference: recordedConsent.participantReference || null
  },
  policy: { version: "custom-task-spec/v1", snapshot_sha256: sha(spec), compiled_at: spec.compiledAt, requirements: spec.evidenceRequirements, rules: spec.verificationRules },
  evidence: { version: "proof-bundle/v1", bundle_id: proofBundle.id, integrity_hash: proofBundle.integrityHash, artifact_count: proofBundle.artifacts.length, server_received_at: proofBundle.serverReceivedAt, private_source_retained: true, privacy_notes: ["Raw artifact URLs, filenames, wallet addresses, and user handles are excluded from this research record."] },
  verification: { system_decision: verification.verdict, confidence: verification.confidence ?? null, deterministic_checks: deterministicChecks, forensic_observations: forensics, model_reviews: modelReviews, degraded: Boolean(verification.ensembleDegraded), escalated: verification.verdict === "manual_review", latency_ms: Number(verification.latencyMs || 0), model_cost_usd: Number(verification.modelCostUsd || 0), human_review_seconds: null },
  receipt: { receipt_id: `receipt_${args["case-id"]}`, receipt_sha256: sha(receiptCore), reconstructable: true, settlement: { status: payment?.txHash ? "settled" : "not_applicable", tx_hash: payment?.txHash || null } },
  research_status: "captured",
  exclusion_reason: null
};

const outputDirectory = path.join(repo, "docs/jove-core/pilot/cases");
fs.mkdirSync(outputDirectory, { recursive: true });
const output = path.join(outputDirectory, `${args["case-id"]}.json`);
fs.writeFileSync(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(`Exported privacy-safe live case to ${output}`);
