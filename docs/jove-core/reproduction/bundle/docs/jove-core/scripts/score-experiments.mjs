import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputsPath = process.argv[2] || path.join(root, "experiments", "outputs.jsonl");
const labelsPath = process.argv[3] || path.join(root, "confirmatory", "labels.jsonl");
const resultPath = process.argv[4] || path.join(root, "results", "metrics.json");
const study = JSON.parse(fs.readFileSync(path.join(root, "config", "study.json"), "utf8"));
const readJsonl = (file) => fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const divide = (a, b) => b ? a / b : null;
const labels = new Map(readJsonl(labelsPath).map((row) => [row.case_id, row]));
const outputs = readJsonl(outputsPath);

function isSupported(label) {
  return label?.outcome === "supported" || label?.majority_outcome === "supported";
}

function decisionAt(row, threshold) {
  if (row.runtime_status !== "ok" || row.decision === "abstain") return "abstain";
  const confidence = Number.isFinite(row.confidence) ? row.confidence : 1;
  if (confidence < threshold) return "abstain";
  return row.decision;
}

function operatingPoint(rows, threshold) {
  let auto = 0, accepted = 0, rejected = 0, unsafe = 0, falseRejects = 0, negatives = 0;
  for (const row of rows) {
    const label = labels.get(row.case_id);
    if (!label) throw new Error(`Missing gold label for ${row.case_id}`);
    const supported = isSupported(label);
    if (!supported) negatives += 1;
    const decision = decisionAt(row, threshold);
    if (decision === "abstain") continue;
    auto += 1;
    if (decision === "accept") {
      accepted += 1;
      if (!supported) unsafe += 1;
    } else {
      rejected += 1;
      if (supported) falseRejects += 1;
    }
  }
  return {
    threshold,
    automation_coverage: divide(auto, rows.length),
    acceptance_coverage: divide(accepted, rows.length),
    unsafe_positive_transition_rate: divide(unsafe, rows.length),
    unsafe_acceptance_negative_cases: divide(unsafe, negatives),
    false_accept_rate: divide(unsafe, accepted),
    false_reject_rate: divide(falseRejects, rejected),
    loss_sensitivity: Object.fromEntries([1, 2, 5, 10].map((weight) => [`${weight}:1`, divide(weight * unsafe + falseRejects, auto)])),
    counts: { cases: rows.length, auto, accepted, rejected, unsafe, false_rejects: falseRejects, negatives }
  };
}

function curve(rows) {
  const thresholds = [...new Set([0, ...rows.map((row) => Number(row.confidence)).filter(Number.isFinite), 1 + Number.EPSILON])].sort((a, b) => a - b);
  return thresholds.map((threshold) => operatingPoint(rows, threshold)).sort((a, b) => a.automation_coverage - b.automation_coverage);
}

function interpolate(points, coverage, field) {
  const valid = points.filter((point) => point[field] != null);
  if (!valid.length || coverage < valid[0].automation_coverage || coverage > valid.at(-1).automation_coverage) return null;
  const upperIndex = valid.findIndex((point) => point.automation_coverage >= coverage);
  const upper = valid[upperIndex];
  const lower = valid[Math.max(0, upperIndex - 1)];
  if (upper.automation_coverage === lower.automation_coverage) return upper[field];
  const weight = (coverage - lower.automation_coverage) / (upper.automation_coverage - lower.automation_coverage);
  return lower[field] + weight * (upper[field] - lower[field]);
}

function aurc(points) {
  let area = 0;
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1], right = points[index];
    if (left.unsafe_positive_transition_rate == null || right.unsafe_positive_transition_rate == null) continue;
    area += (right.automation_coverage - left.automation_coverage) * (left.unsafe_positive_transition_rate + right.unsafe_positive_transition_rate) / 2;
  }
  return area;
}

const grouped = Map.groupBy(outputs, (row) => row.system_id);
const metrics = {};
for (const [systemId, rows] of grouped) {
  const riskCoverage = curve(rows);
  metrics[systemId] = {
    cases: rows.length,
    operating_point: operatingPoint(rows, 0),
    risk_coverage_curve: riskCoverage,
    aurc: aurc(riskCoverage),
    acceptance_coverage: riskCoverage.at(-1)?.acceptance_coverage ?? null,
    unsafe_acceptance_all_cases: riskCoverage.at(-1)?.unsafe_positive_transition_rate ?? null,
    unsafe_acceptance_negative_cases: riskCoverage.at(-1)?.unsafe_acceptance_negative_cases ?? null,
    loss_sensitivity: riskCoverage.at(-1)?.loss_sensitivity ?? null
  };
}

const targetCoverage = study.primary.matched_coverage;
const baseline = metrics[study.primary.baseline];
const treatment = metrics[study.primary.treatment];
const baselineRisk = baseline && interpolate(baseline.risk_coverage_curve, targetCoverage, "unsafe_positive_transition_rate");
const treatmentRisk = treatment && interpolate(treatment.risk_coverage_curve, targetCoverage, "unsafe_positive_transition_rate");
const primary = {
  baseline: study.primary.baseline,
  treatment: study.primary.treatment,
  matched_coverage: targetCoverage,
  baseline_risk: baselineRisk,
  treatment_risk: treatmentRisk,
  risk_difference: baselineRisk == null || treatmentRisk == null ? null : treatmentRisk - baselineRisk,
  estimable: baselineRisk != null && treatmentRisk != null
};

fs.mkdirSync(path.dirname(resultPath), { recursive: true });
fs.writeFileSync(resultPath, JSON.stringify({ study_version: study.version, generated_at: new Date().toISOString(), synthetic: outputs.every((row) => row.synthetic === true), metrics, primary }, null, 2) + "\n");
console.log(`Scored ${outputs.length} outputs across ${grouped.size} systems at matched coverage ${targetCoverage}.`);
