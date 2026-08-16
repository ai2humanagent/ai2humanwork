// Sensitivity sweep over effect size and intra-base correlation for the
// confirmatory power analysis. Each scenario invokes power-paired-cluster.mjs,
// which runs the SAME estimator as the confirmatory pipeline (risk-at-matched-
// coverage + paired-cluster bootstrap, decision rule CI upper bound < 0), so
// every recommended size is a faithful operating characteristic of the frozen
// test. Planning evidence only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const effects = [
  [0.3, 0.2],
  [0.3, 0.18],
  [0.25, 0.15],
  [0.35, 0.25],
];
const rhos = [0.1, 0.2, 0.35];
const sims = Number(process.env.POWER_SIMS ?? 120);
const resamples = Number(process.env.POWER_RESAMPLES ?? 200);
const rows = [];
for (const [baseline, treatment] of effects) {
  for (const rho of rhos) {
    const run = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/power-paired-cluster.mjs"),
        `--baseline=${baseline}`,
        `--treatment=${treatment}`,
        `--rho=${rho}`,
        `--sims=${sims}`,
        `--resamples=${resamples}`,
        "--power=0.8",
        "--min_clusters=30",
      ],
      { encoding: "utf8" }
    );
    let parsed = null;
    try {
      parsed = JSON.parse(run.stdout);
    } catch {
      parsed = null;
    }
    rows.push({
      baseline,
      treatment,
      rho,
      recommended_base_cases: parsed?.recommended_base_cases ?? null,
      estimated_power: parsed?.estimated_power ?? null,
      status: run.status,
    });
  }
}
const out = {
  generated_at: new Date().toISOString(),
  planning_only: true,
  method: "paired_cluster_bootstrap_same_as_confirmatory",
  simulations_per_scenario: sims,
  inner_bootstrap_resamples: resamples,
  scenarios: rows,
  warning: "Replace with pilot-derived assumptions before freezing confirmatory size.",
};
const file = path.join(root, "reproduction/power-sensitivity.json");
fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
