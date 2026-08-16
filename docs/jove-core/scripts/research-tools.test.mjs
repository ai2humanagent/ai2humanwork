import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  makeRandom,
  quantile,
  riskAtCoverage,
  pairedClusterBootstrap,
} from "./lib/estimator.mjs";

const repo = path.resolve(import.meta.dirname, "../../..");
const node = process.execPath;
const run = (script, args = [], options = {}) => spawnSync(node, [path.join(repo, script), ...args], { cwd: repo, encoding: "utf8", ...options });

test("split checker rejects base-case leakage", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-leak-"));
  const manifest = path.join(temporary, "manifest.jsonl");
  fs.writeFileSync(manifest, [
    { case_id: "a", base_case_id: "base", split: "train" },
    { case_id: "b", base_case_id: "base", split: "test" }
  ].map(JSON.stringify).join("\n"));
  const result = run("docs/jove-core/scripts/check-split-leakage.mjs", [manifest]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Split leakage detected/);
});

test("template paper assets are blocked by default", () => {
  const result = run("docs/jove-core/scripts/generate-paper-assets.mjs", ["docs/jove-core/results/template-metrics.json"], { env: { ...process.env, ALLOW_TEMPLATE_PAPER_ASSETS: "0" } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to generate paper assets from template metrics/);
});

test("submission gate blocks absent confirmatory results", () => {
  const result = run("docs/jove-core/scripts/submission-gate.mjs");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SUBMISSION BLOCKED/);
});

test("generated LaTeX table contains a real line break before midrule", () => {
  const generated = path.join(repo, "docs/jove-core/synthetic/main-results.tex");
  assert.ok(fs.existsSync(generated), "synthetic dry run must generate a test table");
  const latex = fs.readFileSync(generated, "utf8");
  assert.match(latex, /\\\\\n\\midrule/);
  assert.doesNotMatch(latex, /^\+\\midrule/m);
});

test("pilot manifest and claim boundary pass artifact audit", () => {
  const result = run("docs/jove-core/scripts/audit-research-artifact.mjs");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Research artifact audit passed/);
});

test("canonical verification contract schema is structurally frozen", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(repo, "docs/jove-core/schema/verification-contract.schema.json"), "utf8"));
  assert.equal(schema.title, "Verification Contract");
  assert.deepEqual(schema.properties.verifier.properties.decision_space.const, ["accept", "reject", "abstain"]);
  assert.equal(schema.properties.binding.properties.hash_algorithm.const, "sha256");
  assert.ok(schema.required.includes("receipt_schema_version"));
});

test("study freezes fair baseline and sensitivity diagnostics", () => {
  const study = JSON.parse(fs.readFileSync(path.join(repo, "docs/jove-core/config/study.json"), "utf8"));
  assert.ok(study.systems.includes("J1_information_matched"));
  assert.deepEqual(study.secondary_diagnostics.coverage_sensitivity, [0.5, 0.6, 0.8, 0.9]);
  assert.equal(study.secondary_diagnostics.mutation_source_holdout, true);
  assert.equal(study.secondary_diagnostics.report_per_model_family, true);
});

test("mutation leakage audit rejects exposed gold metadata", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-mutation-leak-"));
  const manifest = path.join(temporary, "manifest.jsonl");
  fs.writeFileSync(manifest, JSON.stringify({ public_input: { file_name: "case_replay_invalid.png", target_property: "binding" } }) + "\n");
  const result = run("docs/jove-core/scripts/audit-mutation-leakage.mjs", [manifest]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Mutation leakage audit failed/);
});

test("valid contract and receipt satisfy transition semantics", () => {
  const result = run("docs/jove-core/scripts/validate-contract-receipt.mjs", ["docs/jove-core/fixtures/contract.valid.json", "docs/jove-core/fixtures/receipt.valid.json"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /validation passed/);
});

test("receipt validator rejects acceptance under unknown evidence", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-receipt-"));
  const receipt = JSON.parse(fs.readFileSync(path.join(repo, "docs/jove-core/fixtures/receipt.valid.json"), "utf8"));
  receipt.obligation_results[0].state = "unknown";
  const receiptPath = path.join(temporary, "receipt.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  const result = run("docs/jove-core/scripts/validate-contract-receipt.mjs", ["docs/jove-core/fixtures/contract.valid.json", receiptPath]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /three-valued semantics/);
});

test("scorer reports anti-gaming acceptance metrics and loss sensitivity", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-score-"));
  const labels = path.join(temporary, "labels.jsonl");
  const outputs = path.join(temporary, "outputs.jsonl");
  const metrics = path.join(temporary, "metrics.json");
  fs.writeFileSync(labels, [
    { case_id: "a", outcome: "unsupported" },
    { case_id: "b", outcome: "supported" }
  ].map(JSON.stringify).join("\n"));
  fs.writeFileSync(outputs, [
    { case_id: "a", system_id: "J1_posthoc_policy_aware", decision: "accept", runtime_status: "ok", latency_ms: 1, cost_usd: 0, synthetic: false },
    { case_id: "b", system_id: "J1_posthoc_policy_aware", decision: "reject", runtime_status: "ok", latency_ms: 1, cost_usd: 0, synthetic: false }
  ].map(JSON.stringify).join("\n"));
  const result = run("docs/jove-core/scripts/score-experiments.mjs", [outputs, labels, metrics]);
  assert.equal(result.status, 0, result.stderr);
  const scored = JSON.parse(fs.readFileSync(metrics, "utf8")).metrics.J1_posthoc_policy_aware;
  assert.equal(scored.acceptance_coverage, 0.5);
  assert.equal(scored.unsafe_acceptance_all_cases, 0.5);
  assert.equal(scored.unsafe_acceptance_negative_cases, 1);
  assert.equal(scored.loss_sensitivity["5:1"], 3);
});

test("manifest updater rejects status jumps", () => {
  const source = fs.readFileSync(path.join(repo, "docs/jove-core/pilot/manifest.csv"), "utf8");
  const manifestPath = path.join(repo, "docs/jove-core/pilot/manifest.csv");
  try {
    const result = run("docs/jove-core/scripts/update-manifest.mjs", ["jove_core_0001", "adjudicated", "", "rct-test"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid transition/);
  } finally {
    fs.writeFileSync(manifestPath, source);
  }
});

test("blinded packet audit rejects decision leakage", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-blind-"));
  const packet = path.join(temporary, "packet.jsonl");
  fs.writeFileSync(packet, JSON.stringify({ case_id: "x", request: "r", proof_policy: {}, evidence: {}, final_decision: "accept" }) + "\n");
  const result = run("docs/jove-core/scripts/audit-blinded-packet.mjs", [packet]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden key/);
});

test("rating validator rejects duplicate rater and semantic conflict", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "jove-rating-"));
  const file = path.join(temporary, "ratings.jsonl");
  const row = { case_id: "jove_core_0001", rater_id: "rater_a", outcome: "supported", sufficiency: "uncertain", defect_class: "none", privacy_excess: false, confidence: 0.8, decisive_evidence: ["artifact"], reason: "visible evidence supports claim", rated_at: "2026-08-09T00:00:00Z" };
  fs.writeFileSync(file, [row, row].map(JSON.stringify).join("\n"));
  const result = run("docs/jove-core/scripts/validate-ratings.mjs", [file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate case\/rater/);
  assert.match(result.stderr, /supported requires sufficient/);
});

test("synthetic rehearsal remains isolated from formal paths", () => {
  const generate = run("docs/jove-core/scripts/generate-pilot-rehearsal.mjs");
  assert.equal(generate.status, 0, generate.stderr);
  const audit = run("docs/jove-core/scripts/audit-synthetic-isolation.mjs");
  assert.equal(audit.status, 0, audit.stderr);
  assert.match(audit.stdout, /Synthetic isolation audit passed/);
});

// --- Confirmatory estimator invariants (scripts/lib/estimator.mjs) ---------
//
// These lock the single-source-of-truth estimator so a future refactor cannot
// silently change the frozen decision rule or let the power simulation drift
// back to a Wald / normal approximation that disagrees with the confirmatory
// test. They exercise the shared module directly (no data collection involved).

test("estimator RNG and quantile helpers are deterministic and interpolate", () => {
  const a = makeRandom(20260809);
  const b = makeRandom(20260809);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB, "same seed must reproduce the same stream");
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
  assert.equal(quantile([0, 10], 0.5), 5, "quantile linearly interpolates");
  assert.equal(quantile([4, 1, 3, 2], 0), 1);
  assert.equal(quantile([4, 1, 3, 2], 1), 4);
});

test("risk-at-coverage interpolates interior points and is null off-range", () => {
  // Two accepted rows (one unsafe) + two rejected rows -> reachable coverage
  // spans (0, 1]; risk at the max coverage is 1 unsafe / 4 rows = 0.25.
  const labels = new Map([
    ["c1", "unsupported"],
    ["c2", "supported"],
    ["c3", "unsupported"],
    ["c4", "supported"],
  ]);
  const rows = [
    { case_id: "c1", system_id: "S", decision: "accept", confidence: 0.9, runtime_status: "ok" },
    { case_id: "c2", system_id: "S", decision: "accept", confidence: 0.8, runtime_status: "ok" },
    { case_id: "c3", system_id: "S", decision: "reject", confidence: 0.2, runtime_status: "ok" },
    { case_id: "c4", system_id: "S", decision: "reject", confidence: 0.1, runtime_status: "ok" },
  ];
  assert.equal(riskAtCoverage(rows, 0.5, labels), 0.25);
  assert.equal(riskAtCoverage(rows, 2.0, labels), null, "coverage above range is not estimable");
});

test("paired-cluster bootstrap is deterministic and applies CI-upper<0 rule", () => {
  // Treatment strictly dominates baseline at every base case, so the frozen
  // rule (superiority iff CI upper bound < 0) must fire and be reproducible.
  const labels = new Map();
  const outputs = [];
  for (let b = 1; b <= 8; b += 1) {
    const base = `base_${b}`;
    for (let v = 0; v < 3; v += 1) {
      const id = `${base}_v${v}`;
      labels.set(id, "unsupported");
      outputs.push(
        { case_id: id, base_case_id: base, system_id: "BASE", decision: "accept", confidence: 0.8, runtime_status: "ok" },
        { case_id: id, base_case_id: base, system_id: "TRT", decision: "reject", confidence: 0.1, runtime_status: "ok" }
      );
    }
  }
  const config = {
    primary: { baseline: "BASE", treatment: "TRT", metric: "unsafe_rate", matched_coverage: 0.5 },
    bootstrap: { resamples: 500, confidence: 0.95, seed: 20260809 },
  };
  const first = pairedClusterBootstrap({ outputs, labels, config });
  const second = pairedClusterBootstrap({ outputs, labels, config });
  assert.deepEqual(first, second, "same seed + data must reproduce identical output");
  assert.equal(first.superiority_supported, first.ci[1] < 0, "decision rule is CI upper bound < 0");
  assert.ok(first.ci[0] <= first.risk_difference_median && first.risk_difference_median <= first.ci[1]);
  assert.equal(first.superiority_supported, true, "strict treatment dominance must be detected");
});

test("bootstrap-primary and power simulation share the one estimator source", () => {
  const dir = path.join(repo, "docs/jove-core/scripts");
  const confirmatory = fs.readFileSync(path.join(dir, "bootstrap-primary.mjs"), "utf8");
  const power = fs.readFileSync(path.join(dir, "power-paired-cluster.mjs"), "utf8");
  const importsShared = /import\s*\{[^}]*pairedClusterBootstrap[^}]*\}\s*from\s*["']\.\/lib\/estimator\.mjs["']/;
  assert.match(confirmatory, importsShared, "confirmatory driver must import the shared estimator");
  assert.match(power, importsShared, "power simulation must import the shared estimator");
  // Guard against the reviewer's original objection: no home-grown normal /
  // Wald CI reconstruction living beside the shared paired-cluster bootstrap.
  assert.doesNotMatch(power, /\b1\.96\b/, "power sim must not hard-code a normal-approximation CI");
});
