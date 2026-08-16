// Design-stage power analysis for the JOVE-core primary contrast.
//
// Unlike a Wald / normal approximation, this simulation exercises the *exact*
// confirmatory estimator: for every simulated study it synthesizes clustered
// baseline/treatment outputs, runs the shared risk-at-matched-coverage +
// paired-cluster bootstrap (scripts/lib/estimator.mjs), and declares a "win"
// only under the preregistered decision rule (bootstrap CI upper bound < 0).
// Estimated power is therefore the empirical rejection rate of the frozen test
// itself, not a surrogate. It is planning evidence and never a study result.
//
// Usage:
//   node scripts/power-paired-cluster.mjs --baseline=0.30 --treatment=0.20 \
//     --rho=0.20 --variants=3 --power=0.80 --sims=200 --resamples=300 \
//     --min_clusters=30 --max_clusters=220 --step=10 --coverage=0.7 --seed=20260809

import { pairedClusterBootstrap } from "./lib/estimator.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((item) => {
    const [key, value] = item.replace(/^--/, "").split("=");
    return [key, Number(value)];
  })
);
const baseline = args.baseline ?? 0.3; // baseline unsafe-accept rate on unsupported cases
const treatment = args.treatment ?? 0.2; // treatment unsafe-accept rate on unsupported cases
const variants = args.variants ?? 3; // adversarial variants per base case (cluster size)
const rho = args.rho ?? 0.2; // intra-base correlation of accept propensity
const acceptSupported = args.accept_supported ?? 0.9; // accept rate on supported cases
const supportedShare = args.supported_share ?? 0.5; // fraction of variant cases that are supported
const coverage = args.coverage ?? 0.7; // preregistered matched coverage
const alpha = args.alpha ?? 0.05;
const target = args.power ?? 0.8;
const sims = args.sims ?? 200; // outer simulated studies per candidate size
const resamples = args.resamples ?? 300; // inner paired-cluster bootstrap resamples
const minClusters = args.min_clusters ?? 30;
const maxClusters = args.max_clusters ?? 220;
const step = args.step ?? 10;
const seed0 = (args.seed ?? 20260809) >>> 0;

if (!(baseline > treatment && treatment >= 0 && rho >= 0 && rho < 1 && variants >= 1)) {
  throw new Error("Invalid assumptions: require baseline > treatment >= 0, 0 <= rho < 1, variants >= 1.");
}

let state = seed0;
const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
const normal = () => {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const logit = (p) => Math.log(p / (1 - p));
const clamp01 = (x) => Math.min(1 - 1e-6, Math.max(1e-6, x));

// Confidence assignment that yields a smooth, monotone risk-coverage curve:
// accepted rows earn higher confidence than rejects, with within-group noise so
// the matched-coverage operating point is interior and interpolable.
const acceptedConfidence = () => clamp01(0.6 + 0.4 * random());
const rejectedConfidence = () => clamp01(0.4 * random());

// Synthesize one study of `nBase` base cases as schema-faithful output rows plus
// a case_id -> outcome label map. A shared per-base latent shifts accept
// propensity for both systems (paired) to induce the intra-cluster correlation.
function synthesizeStudy(nBase) {
  const outputs = [];
  const labels = new Map();
  const scale = Math.sqrt(rho / (1 - rho));
  for (let b = 1; b <= nBase; b += 1) {
    const base = `pwr_base_${String(b).padStart(4, "0")}`;
    const latent = normal() * scale;
    for (let v = 0; v < variants; v += 1) {
      const caseId = `${base}_v${v}`;
      const supported = random() < supportedShare;
      labels.set(caseId, supported ? "supported" : "unsupported");
      for (const [systemId, far] of [
        ["BASELINE", baseline],
        ["TREATMENT", treatment],
      ]) {
        const baseProb = supported ? acceptSupported : far;
        const noise = normal() * Math.sqrt(1 - rho);
        const pAccept = sigmoid(logit(clamp01(baseProb)) + latent + noise);
        const accept = random() < pAccept;
        outputs.push({
          case_id: caseId,
          base_case_id: base,
          system_id: systemId,
          model_family: "power_simulator",
          decision: accept ? "accept" : "reject",
          confidence: accept ? acceptedConfidence() : rejectedConfidence(),
          runtime_status: "ok",
          synthetic: true,
        });
      }
    }
  }
  return { outputs, labels };
}

// Fraction of simulated studies in which the frozen confirmatory estimator
// declares superiority (bootstrap CI upper bound < 0) at the given size.
function estimatePower(nBase) {
  let wins = 0;
  let estimable = 0;
  for (let s = 0; s < sims; s += 1) {
    const { outputs, labels } = synthesizeStudy(nBase);
    const config = {
      primary: {
        baseline: "BASELINE",
        treatment: "TREATMENT",
        metric: "unsafe_positive_transition_rate_at_matched_coverage",
        matched_coverage: coverage,
      },
      bootstrap: {
        resamples,
        confidence: 1 - alpha,
        // Vary the inner bootstrap seed per simulation while staying deterministic.
        seed: (seed0 + s * 2654435761) >>> 0,
      },
    };
    try {
      const result = pairedClusterBootstrap({ outputs, labels, config });
      estimable += 1;
      if (result.superiority_supported) wins += 1;
    } catch {
      // Contrast not estimable at matched coverage for this draw; counts against power.
    }
  }
  return { power: wins / sims, estimable_fraction: estimable / sims };
}

const assumptions = {
  baseline_unsafe_rate: baseline,
  treatment_unsafe_rate: treatment,
  variants_per_base: variants,
  intra_base_correlation: rho,
  accept_rate_supported: acceptSupported,
  supported_share: supportedShare,
  matched_coverage: coverage,
  alpha,
  target_power: target,
  simulations: sims,
  inner_bootstrap_resamples: resamples,
  minimum_cluster_floor: minClusters,
  seed: seed0,
};
const warning =
  "Planning evidence only. Estimated power is the rejection rate of the frozen " +
  "risk-at-matched-coverage + paired-cluster bootstrap estimator under simulated " +
  "assumptions. Replace assumptions with pilot estimates and run the sensitivity " +
  "sweep before freezing confirmatory size; this is not a study result.";

const candidates = [];
for (let n = minClusters; n <= maxClusters; n += step) {
  const { power, estimable_fraction } = estimatePower(n);
  candidates.push({
    base_cases: n,
    estimated_power: Number(power.toFixed(3)),
    estimable_fraction: Number(estimable_fraction.toFixed(3)),
  });
  if (power >= target) {
    console.log(
      JSON.stringify(
        {
          method: "paired_cluster_bootstrap_same_as_confirmatory",
          decision_rule: "bootstrap_ci_upper_bound_below_zero",
          assumptions,
          recommended_base_cases: n,
          estimated_power: power,
          nearby: candidates.slice(-4),
          warning,
        },
        null,
        2
      )
    );
    process.exit(0);
  }
}
console.log(
  JSON.stringify(
    {
      method: "paired_cluster_bootstrap_same_as_confirmatory",
      decision_rule: "bootstrap_ci_upper_bound_below_zero",
      assumptions,
      recommended_base_cases: null,
      searched_up_to: maxClusters,
      curve: candidates,
      warning: `${warning} Target power not reached by ${maxClusters} base cases.`,
    },
    null,
    2
  )
);
process.exit(1);
