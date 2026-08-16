import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const scripts = path.join(root, "scripts");
const failures = [];

// ---------------------------------------------------------------------------
// Stage 1: required confirmatory artifacts must exist.
// ---------------------------------------------------------------------------
const requireFile = (relative) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) failures.push(`missing ${relative}`);
  return file;
};
const manifestFile = requireFile("confirmatory/manifest.jsonl");
requireFile("confirmatory/labels.jsonl");
requireFile("experiments/outputs.jsonl");
const metricsFile = requireFile("results/metrics.json");
const bootstrapFile = requireFile("results/bootstrap-primary.json");
const provenanceFile = requireFile("paper/generated/provenance.json");
requireFile("paper/submission.tex");

// ---------------------------------------------------------------------------
// Stage 2: chain the six blocking gates. Each gate is an independent script;
// the submission is blocked if ANY of them exits non-zero. This is the single
// entry point that the paper's reproducibility section refers to, so the gates
// enumerated there must all run here.
// ---------------------------------------------------------------------------
const manifestPresent = fs.existsSync(manifestFile);
const gates = [
  { name: "split-leakage", script: "check-split-leakage.mjs", args: [manifestFile], needs: manifestPresent },
  { name: "mutation-leakage", script: "audit-mutation-leakage.mjs", args: [manifestFile], needs: manifestPresent },
  { name: "privacy", script: "privacy-audit.mjs", args: [], needs: true },
  { name: "anonymity", script: "audit-anonymity.mjs", args: [], needs: true },
  { name: "receipt", script: "validate-contract-receipt.mjs", args: [], needs: true },
  { name: "synthetic-isolation", script: "audit-synthetic-isolation.mjs", args: [], needs: true },
];

for (const gate of gates) {
  // Manifest-dependent gates are skipped here when the manifest is absent; the
  // missing manifest is already reported as a Stage-1 failure, so the run stays
  // blocked without emitting a redundant stack trace.
  if (!gate.needs) {
    failures.push(`gate ${gate.name} skipped: confirmatory manifest not yet present`);
    continue;
  }
  const scriptPath = path.join(scripts, gate.script);
  if (!fs.existsSync(scriptPath)) {
    failures.push(`gate ${gate.name}: missing script ${gate.script}`);
    continue;
  }
  const result = spawnSync(process.execPath, [scriptPath, ...gate.args], { encoding: "utf8" });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().split(/\r?\n/).filter(Boolean).join(" | ");
    failures.push(`gate ${gate.name} failed: ${detail || `exit ${result.status}`}`);
  }
}

// ---------------------------------------------------------------------------
// Stage 3: confirmatory metrics and provenance invariants.
// ---------------------------------------------------------------------------
if (fs.existsSync(metricsFile)) {
  const result = JSON.parse(fs.readFileSync(metricsFile, "utf8"));
  if (!result.primary?.estimable) failures.push("primary matched-coverage contrast is not estimable");
  if (result.primary?.baseline !== "J1_information_matched") failures.push("primary baseline is not J1-IM");
}
if (fs.existsSync(bootstrapFile)) {
  const bootstrap = JSON.parse(fs.readFileSync(bootstrapFile, "utf8"));
  if (!bootstrap.superiority_supported) failures.push("primary paired confidence interval does not exclude zero below zero");
  if (bootstrap.comparison !== "K_Full_verification_contract-J1_information_matched") failures.push("bootstrap comparison is not the preregistered primary contrast");
}
if (fs.existsSync(provenanceFile)) {
  const provenance = JSON.parse(fs.readFileSync(provenanceFile, "utf8"));
  if (provenance.template_input) failures.push("submission uses template results");
  if (provenance.synthetic_input) failures.push("submission uses synthetic results");
}

if (failures.length) {
  console.error("SUBMISSION BLOCKED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Submission gate passed: six blocking gates and the preregistered primary confidence interval cleared.");
