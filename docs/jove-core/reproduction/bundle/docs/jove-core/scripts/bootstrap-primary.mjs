import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputsPath = process.argv[2] || path.join(root, "experiments", "outputs.jsonl");
const labelsPath = process.argv[3] || path.join(root, "confirmatory", "labels.jsonl");
const outputPath = process.argv[4] || path.join(root, "results", "bootstrap-primary.json");
const study = JSON.parse(fs.readFileSync(path.join(root, "config", "study.json"), "utf8"));
const readJsonl = (file) => fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const outputs = readJsonl(outputsPath);
const labels = new Map(readJsonl(labelsPath).map((row) => [row.case_id, row.outcome ?? row.majority_outcome]));
const baseIds = [...new Set(outputs.map((row) => row.base_case_id))];
let state = study.bootstrap.seed >>> 0;
const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
const quantile = (values, probability) => {
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * probability;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

function riskAtCoverage(rows, coverage) {
  const thresholds = [...new Set([0, ...rows.map((row) => Number(row.confidence)).filter(Number.isFinite), 1 + Number.EPSILON])].sort((a, b) => b - a);
  const points = thresholds.map((threshold) => {
    const active = rows.filter((row) => row.runtime_status === "ok" && row.decision !== "abstain" && Number(row.confidence) >= threshold);
    const unsafe = active.filter((row) => row.decision === "accept" && labels.get(row.case_id) !== "supported").length;
    return { coverage: active.length / rows.length, risk: unsafe / rows.length };
  }).sort((a, b) => a.coverage - b.coverage);
  if (coverage < points[0].coverage || coverage > points.at(-1).coverage) return null;
  const upperIndex = points.findIndex((point) => point.coverage >= coverage);
  const upper = points[upperIndex], lower = points[Math.max(0, upperIndex - 1)];
  if (upper.coverage === lower.coverage) return upper.risk;
  const weight = (coverage - lower.coverage) / (upper.coverage - lower.coverage);
  return lower.risk + weight * (upper.risk - lower.risk);
}

const differences = [];
for (let iteration = 0; iteration < study.bootstrap.resamples; iteration += 1) {
  const sampledIds = Array.from({ length: baseIds.length }, () => baseIds[Math.floor(random() * baseIds.length)]);
  const sampled = sampledIds.flatMap((baseId, draw) => outputs.filter((row) => row.base_case_id === baseId).map((row) => ({ ...row, base_case_id: `${baseId}#${draw}` })));
  const baseline = riskAtCoverage(sampled.filter((row) => row.system_id === study.primary.baseline), study.primary.matched_coverage);
  const treatment = riskAtCoverage(sampled.filter((row) => row.system_id === study.primary.treatment), study.primary.matched_coverage);
  if (baseline != null && treatment != null) differences.push(treatment - baseline);
}
if (!differences.length) throw new Error("Primary contrast is not estimable at the preregistered matched coverage.");
const alpha = 1 - study.bootstrap.confidence;
const result = {
  estimand: study.primary.metric,
  comparison: `${study.primary.treatment}-${study.primary.baseline}`,
  matched_coverage: study.primary.matched_coverage,
  resamples_requested: study.bootstrap.resamples,
  resamples_analyzed: differences.length,
  risk_difference_median: quantile(differences, 0.5),
  ci: [quantile(differences, alpha / 2), quantile(differences, 1 - alpha / 2)]
};
result.superiority_supported = result.ci[1] < 0;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
