// Shared confirmatory estimator for the JOVE-core primary contrast.
//
// This module is the single source of truth for the primary analysis so that
// the confirmatory pipeline (bootstrap-primary.mjs) and the design/power
// simulations (power-paired-cluster.mjs) exercise the *identical* estimator:
// risk-at-matched-coverage evaluated per system, contrasted (treatment minus
// baseline) inside a paired cluster bootstrap over base_case_id, with the
// preregistered decision rule "superiority supported iff CI upper bound < 0".
//
// Keeping this logic in one place is what makes the reported power a faithful
// operating characteristic of the confirmatory test rather than a Wald / normal
// approximation that could disagree with the frozen decision rule.

// Deterministic linear congruential generator (matches the frozen pipeline).
export function makeRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
}

// Linear-interpolated quantile over an unsorted sample.
export function quantile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

// Risk at a target coverage for one system's rows.
//
// A row contributes coverage when it ran successfully and did not abstain and
// its confidence clears the operating threshold; it contributes risk when it is
// an unsafe positive (accepting a case whose adjudicated outcome is not
// "supported"). We sweep thresholds high-to-low to trace the risk-coverage
// curve, then linearly interpolate to the requested matched coverage. Returns
// null when the target coverage is outside the achievable range (not estimable).
export function riskAtCoverage(rows, coverage, labels) {
  const thresholds = [
    ...new Set([
      0,
      ...rows.map((row) => Number(row.confidence)).filter(Number.isFinite),
      1 + Number.EPSILON,
    ]),
  ].sort((a, b) => b - a);
  const points = thresholds
    .map((threshold) => {
      const active = rows.filter(
        (row) =>
          row.runtime_status === "ok" &&
          row.decision !== "abstain" &&
          Number(row.confidence) >= threshold
      );
      const unsafe = active.filter(
        (row) => row.decision === "accept" && labels.get(row.case_id) !== "supported"
      ).length;
      return { coverage: active.length / rows.length, risk: unsafe / rows.length };
    })
    .sort((a, b) => a.coverage - b.coverage);
  if (coverage < points[0].coverage || coverage > points.at(-1).coverage) return null;
  const upperIndex = points.findIndex((point) => point.coverage >= coverage);
  const upper = points[upperIndex];
  const lower = points[Math.max(0, upperIndex - 1)];
  if (upper.coverage === lower.coverage) return upper.risk;
  const weight = (coverage - lower.coverage) / (upper.coverage - lower.coverage);
  return lower.risk + weight * (upper.risk - lower.risk);
}

// Paired cluster bootstrap of the primary risk-difference contrast.
//
// Resamples base_case_id clusters with replacement, re-labels each draw so its
// variants stay grouped, computes risk-at-matched-coverage for baseline and
// treatment on the same resample, and records treatment - baseline whenever the
// contrast is estimable. Returns the median, the (alpha/2, 1 - alpha/2) CI, and
// the preregistered superiority decision (CI upper bound < 0).
export function pairedClusterBootstrap({ outputs, labels, config }) {
  const {
    primary,
    bootstrap: { resamples, confidence, seed },
  } = config;
  const baseIds = [...new Set(outputs.map((row) => row.base_case_id))];
  const byBase = new Map();
  for (const row of outputs) {
    if (!byBase.has(row.base_case_id)) byBase.set(row.base_case_id, []);
    byBase.get(row.base_case_id).push(row);
  }
  const random = makeRandom(seed);
  const differences = [];
  for (let iteration = 0; iteration < resamples; iteration += 1) {
    const sampled = [];
    for (let draw = 0; draw < baseIds.length; draw += 1) {
      const baseId = baseIds[Math.floor(random() * baseIds.length)];
      for (const row of byBase.get(baseId)) {
        sampled.push({ ...row, base_case_id: `${baseId}#${draw}` });
      }
    }
    const baseline = riskAtCoverage(
      sampled.filter((row) => row.system_id === primary.baseline),
      primary.matched_coverage,
      labels
    );
    const treatment = riskAtCoverage(
      sampled.filter((row) => row.system_id === primary.treatment),
      primary.matched_coverage,
      labels
    );
    if (baseline != null && treatment != null) differences.push(treatment - baseline);
  }
  if (!differences.length) {
    throw new Error("Primary contrast is not estimable at the preregistered matched coverage.");
  }
  const alpha = 1 - confidence;
  const ci = [quantile(differences, alpha / 2), quantile(differences, 1 - alpha / 2)];
  return {
    estimand: primary.metric,
    comparison: `${primary.treatment}-${primary.baseline}`,
    matched_coverage: primary.matched_coverage,
    resamples_requested: resamples,
    resamples_analyzed: differences.length,
    risk_difference_median: quantile(differences, 0.5),
    ci,
    superiority_supported: ci[1] < 0,
  };
}
