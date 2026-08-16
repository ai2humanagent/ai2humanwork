import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

// Analysis-freeze registry for the JOVE-Core confirmatory study.
//
// The preregistration promises that the registry entry, the frozen analysis
// scripts, and their commit hash are timestamped BEFORE any confirmatory datum
// is collected. This script makes that promise machine-checkable.
//
//   node scripts/freeze-analysis.mjs           -> create/refresh the freeze record
//   node scripts/freeze-analysis.mjs --verify  -> verify integrity + timeline compliance
//
// Timeline compliance: no confirmatory data/label/output file may have a
// modification time earlier than the freeze timestamp. If it does, the freeze
// is invalid (data predates the frozen analysis) and the check fails.

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "../..");
const freezePath = path.join(root, "analysis-freeze.json");

// Artifacts whose content defines the frozen analysis. Their sha256 is pinned.
const FROZEN_ARTIFACTS = [
  "preregistration.md",
  "config/study.json",
  "scripts/score-experiments.mjs",
  "scripts/bootstrap-primary.mjs",
  "scripts/summarize-ratings-jsonl.mjs",
  "scripts/check-split-leakage.mjs",
  "scripts/audit-mutation-leakage.mjs",
  "scripts/power-paired-cluster.mjs",
  "scripts/submission-gate.mjs",
  "dataset-card.md",
  "human-study-plan.md",
];

// Confirmatory data surfaces that must NOT predate the freeze.
const CONFIRMATORY_DATA = [
  "confirmatory/manifest.jsonl",
  "confirmatory/labels.jsonl",
  "experiments/outputs.jsonl",
  "results/metrics.json",
];

const sha256 = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const gitInfo = () => {
  const run = (args) => {
    const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  return {
    commit: run(["rev-parse", "HEAD"]),
    short: run(["rev-parse", "--short", "HEAD"]),
    branch: run(["rev-parse", "--abbrev-ref", "HEAD"]),
    dirty: run(["status", "--porcelain"]) ? true : false,
  };
};

const hashArtifacts = () => {
  const missing = [];
  const artifacts = {};
  for (const rel of FROZEN_ARTIFACTS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    artifacts[rel] = sha256(abs);
  }
  return { artifacts, missing };
};

const create = () => {
  const { artifacts, missing } = hashArtifacts();
  if (missing.length) {
    console.error("FREEZE BLOCKED: missing frozen artifacts:");
    for (const m of missing) console.error(`- ${m}`);
    process.exit(1);
  }
  const git = gitInfo();
  if (!git.commit) {
    console.error("FREEZE BLOCKED: not a git repository or git unavailable.");
    process.exit(1);
  }
  if (git.dirty) {
    console.error(
      "FREEZE BLOCKED: working tree is dirty. Commit all analysis changes before freezing so the commit hash is meaningful."
    );
    process.exit(1);
  }
  const record = {
    schema: "jove-core/analysis-freeze@1",
    frozen_at: new Date().toISOString(),
    git,
    artifacts,
    confirmatory_data_surfaces: CONFIRMATORY_DATA,
    note:
      "Frozen before confirmatory data collection. Any confirmatory datum with mtime earlier than frozen_at invalidates this freeze.",
  };
  fs.writeFileSync(freezePath, JSON.stringify(record, null, 2) + "\n");
  console.log(
    JSON.stringify(
      { frozen: true, frozen_at: record.frozen_at, commit: git.short, artifacts: Object.keys(artifacts).length },
      null,
      2
    )
  );
};

const verify = () => {
  const failures = [];
  if (!fs.existsSync(freezePath)) {
    console.error("VERIFY FAILED: analysis-freeze.json does not exist. Run freeze-analysis first (before collecting data).");
    process.exit(1);
  }
  const record = JSON.parse(fs.readFileSync(freezePath, "utf8"));
  // 1. Integrity: frozen artifacts must match pinned hashes.
  for (const [rel, expected] of Object.entries(record.artifacts)) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      failures.push(`frozen artifact removed: ${rel}`);
      continue;
    }
    const actual = sha256(abs);
    if (actual !== expected) failures.push(`frozen artifact modified after freeze: ${rel}`);
  }
  // 2. Timeline compliance: no confirmatory datum may predate the freeze.
  const frozenMs = Date.parse(record.frozen_at);
  for (const rel of record.confirmatory_data_surfaces ?? CONFIRMATORY_DATA) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue; // not collected yet — fine
    const mtime = fs.statSync(abs).mtimeMs;
    if (mtime < frozenMs) {
      failures.push(`confirmatory data predates freeze (p-hacking risk): ${rel}`);
    }
  }
  if (failures.length) {
    console.error("FREEZE VERIFY FAILED:");
    for (const f of failures) console.error(`- ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({ verified: true, frozen_at: record.frozen_at, commit: record.git?.short, artifacts: Object.keys(record.artifacts).length }, null, 2)
  );
};

const mode = process.argv.includes("--verify") ? "verify" : "create";
if (mode === "verify") verify();
else create();
