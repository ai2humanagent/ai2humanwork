import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = path.resolve(import.meta.dirname, "../../..");
const required = [
  "docs/jove-core/preregistration.md",
  "docs/jove-core/config/study.json",
  "docs/jove-core/config/systems.json",
  "docs/jove-core/schema/case.schema.json",
  "docs/jove-core/schema/rating.schema.json",
  "docs/jove-core/schema/verification-contract.schema.json",
  "docs/jove-core/pilot/manifest.csv",
  "docs/jove-core/rating-rubric.md",
  "docs/jove-core/dataset-card.md",
  "docs/jove-core/paper/main-v5.tex",
  "docs/jove-core/paper/main-v5-zh.tex"
];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(repo, file))) errors.push(`missing ${file}`);

const study = JSON.parse(fs.readFileSync(path.join(repo, "docs/jove-core/config/study.json"), "utf8"));
if (!study.frozen) errors.push("study config is not frozen");
if (study.primary.matched_coverage !== 0.7) errors.push("matched coverage differs from preregistration");
if (study.primary.baseline !== "J1_information_matched" || study.primary.treatment !== "K_Full_verification_contract") errors.push("primary contract comparison differs from the v5 thesis");
if (study.loss.false_accept !== 5 || study.loss.false_reject !== 1) errors.push("loss weights differ from preregistration");
if (!study.systems.includes("J1_information_matched")) errors.push("information-matched baseline missing");
if (JSON.stringify(study.secondary_diagnostics?.coverage_sensitivity) !== JSON.stringify([0.5, 0.6, 0.8, 0.9])) errors.push("coverage sensitivity points differ from preregistration");
if (!study.secondary_diagnostics?.mutation_source_holdout) errors.push("mutation-source holdout is not frozen");

const paper = fs.readFileSync(path.join(repo, "docs/jove-core/paper/main-v5.tex"), "utf8");
for (const forbidden of ["JOVE-600", "12 or more task classes"]) {
  if (paper.includes(forbidden)) errors.push(`active paper contains obsolete scope: ${forbidden}`);
}
if (!paper.includes("conditional on a $\\bot$ being correctly produced")) errors.push("interface-invariant claim boundary missing");
if (!paper.includes("J1-IM")) errors.push("information-matched baseline missing from canonical paper");
if (!paper.includes("held-out mutation source")) errors.push("mutation-source generalization check missing from canonical paper");

const validation = spawnSync(process.execPath, [path.join(repo, "docs/jove-core/scripts/validate-pilot.mjs")], { encoding: "utf8" });
if (validation.status !== 0) errors.push(validation.stderr || validation.stdout || "pilot validation failed");
const privacy = spawnSync(process.execPath, [path.join(repo, "docs/jove-core/scripts/privacy-audit.mjs")], { encoding: "utf8" });
if (privacy.status !== 0) errors.push(privacy.stderr || privacy.stdout || "privacy audit failed");
const prompts = spawnSync(process.execPath, [path.join(repo, "docs/jove-core/scripts/validate-task-prompts.mjs")], { encoding: "utf8" });
if (prompts.status !== 0) errors.push(prompts.stderr || prompts.stdout || "task prompt validation failed");
const launchPlan = spawnSync(process.execPath, [path.join(repo, "docs/jove-core/scripts/validate-launch-plan.mjs")], { encoding: "utf8" });
if (launchPlan.status !== 0) errors.push(launchPlan.stderr || launchPlan.stdout || "launch plan validation failed");
const drafts = spawnSync(process.execPath, [path.join(repo, "docs/jove-core/scripts/validate-prospective-drafts.mjs")], { encoding: "utf8" });
if (drafts.status !== 0) errors.push(drafts.stderr || drafts.stdout || "prospective draft validation failed");

if (errors.length) {
  console.error(`Research artifact audit failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Research artifact audit passed.");
console.log(validation.stdout.trim());
console.log(privacy.stdout.trim());
console.log(prompts.stdout.trim());
console.log(launchPlan.stdout.trim());
console.log(drafts.stdout.trim());
