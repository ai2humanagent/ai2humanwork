# JOVE-Core Confirmatory Preregistration v2

**Status:** frozen before confirmatory data collection
**Study:** Proof-Carrying Agent Actions (Verification Contracts)
**Scope:** six digital-evidence task classes only
**Alignment:** this preregistration is the machine-checkable counterpart of `paper/main-v5.tex`; the two are kept term-for-term consistent (sample sizes, primary endpoint, system naming, falsification conditions). Any divergence is a defect.

## Primary question

Along the full risk–coverage curve, does a complete Verification Contract (`K-Full`) reduce unsafe positive state transitions relative to an information-matched judge (`J1-IM`) that receives the identical evidence and observation payload but lacks structural enforcement? The endpoint is the per-defect-class unsafe positive-transition rate at matched coverage, not a single-threshold false-accept rate.

## Primary comparison

- Primary contrast: `K-Full` (complete Verification Contract) versus `J1-IM` (information-matched judge — same evidence bundle and observation text, without immutable commitment, binding enforcement, selective transition semantics, or reconstructable receipt enforcement).
- Secondary references: `J1+abstain` (a strong policy-aware judge with an abstention interface) and `J1-DT` (an information-matched judge augmented with the same deterministic comparison tools but without contract enforcement). `J1-DT` is a **steelmanned discretionary baseline**: it is explicitly prompted with a chain-of-thought scaffold that requires it to check binding and version with its tools *before* every accept/reject decision, and its final decision is taken by self-consistency majority vote over multiple samples. `J1-DT` is allocated a per-decision compute budget (samples and tokens) **greater than or equal to** `K-Full`, so that any residual `K-Full` advantage cannot be attributed to compute. This scaffold and budget are frozen here and are not a post-hoc arm.
- Primary endpoint: unsafe positive-transition rate at the preregistered matched automation coverage of 0.70. Full risk–coverage curves, AURC, and per-defect-class conditional rates are secondary analyses.
- Unit of resampling: base case, not individual mutation.
- Direction: `K-Full` must have a lower unsafe positive-transition rate than `J1-IM` at matched coverage, with the paired 95% interval excluding zero.

## Confirmatory sample

- Target: **200 independently sourced base cases** and **at least 600 matched bundles**, with **3 raters per bundle**.
- Six task classes, at least four base cases per class.
- All variants (mutations) of one base case remain in one split.
- At least two task classes and at least one mutation-construction source/template family are held out from threshold selection.
- If recruitment yields fewer consented cases, the study reports the achieved power and **downgrades the confirmatory claim to exploratory** rather than relaxing the threshold.

## Power analysis

Power is defined **within a defect class**, not on the pooled 600 bundles. The three inputs are split into two kinds: variance-structure parameters (estimated from the pilot) and the decision-anchored MDE (fixed, never estimated from data).

- Assumed baseline unsafe rate: 0.30 under `J1-IM` within a defect class (planning prior; to be replaced by the pilot estimate at its power-unfavorable 95% bootstrap bound).
- Preregistered minimum detectable effect (MDE): absolute 0.10 reduction (i.e. down to 0.20). **This is fixed by the decision "how much safety improvement is worth claiming" and is never re-estimated from pilot or confirmatory data.**
- Base-case clustering intraclass correlation: 0.2 (planning prior; to be replaced by the pilot estimate at its upper 95% bootstrap bound).
- Under the frozen paired clustered bootstrap (`scripts/power-paired-cluster.mjs`, seed 20260809, 3000 reps, 3 variants per base, two-sided α = 0.05), the planning inputs above require **110 base cases (330 bundles) per defect class** for 0.808 planning power.
- The frozen sensitivity sweep (`scripts/power-sensitivity.mjs`) over baseline ∈ {0.25, 0.30, 0.35}, effect ≥ 0.10, and ICC ∈ {0.1, 0.2, 0.35} yields a required per-class base count between 70 and 140; the preregistered target of **200 base cases / 600 bundles** therefore retains margin over the worst case in this domain, after (a) reserving the most critical defect class at ≥ 110 base cases, (b) ~15% attrition inflation, and (c) Benjamini–Hochberg FDR control across the external endpoint family — which explicitly includes the per-model-family judge contrasts (the `K-Full` vs `J1-DT`/`J1-IM` comparison on each frontier and open-weight family) and the adversarial-source crossover contrast — with the primary `K-Full` vs `J1-IM` contrast run first as a protected test.
- **Prior-replacement protocol (frozen order):** replace the two variance-structure priors with their power-unfavorable pilot bounds → re-run both scripts → take the larger of "most critical class requirement" and "sensitivity worst case", inflate by 15% attrition → timestamp via `freeze-analysis.mjs`. Pilot estimates may only **hold or raise** the frozen size; a pilot pointing to a smaller size does not lower the preregistered 200 / 600 floor. See `pilot/EXECUTION_RUNBOOK.zh.md` for the operational protocol.
- The registry entry, the frozen analysis scripts, and their commit hash are timestamped **before any confirmatory datum is collected**.

## Ground truth

- Ground truth is an **independently rated downstream harm** — an erroneous payment, access grant, completion, or wrongful rejection of a legitimate submitter.
- Three independent raters on the frozen test set, **blind to the contract mechanism** (system identity, predicted decision, and mutation category).
- Raters do not see `K-Full` receipts during ground-truth labeling; labels answer evidence sufficiency under the frozen policy.
- Majority outcome after preserving raw labels; ties or unresolved cases are adjudicated and reported separately.
- Authors are not the sole test-label providers. The metric does not reduce to the protocol's own rule.

## Systems

- `J0` — post-hoc generic judge.
- `J1` — post-hoc policy-aware judge.
- `J1-IM` — information-matched judge (primary baseline; diagnostic and information-matched).
- `J1+abstain` — policy-aware judge with abstention interface (secondary reference).
- `J1-DT` — steelmanned discretionary baseline: information-matched judge with the same deterministic comparison tools, a chain-of-thought scaffold that mandates a binding/version check before every decision, and self-consistency majority voting, at a per-decision compute budget ≥ `K-Full`, but with no contract-enforced transition semantics (secondary reference).
- `K-P` — policy-only.
- `K-B` — bound/binary.
- `K-S` — selective minimal receipt.
- `K-Full` — complete Verification Contract.

At least three model families are required, spanning **at least one frontier closed-weight family and at least one strong open-weight family**, and all of `J1` / `J1-IM` / `J1-DT` are run on every family. Model identifiers, prompts, temperatures, and provider dates are frozen before test execution. This multiplicity is preregistered here so that the judge-layer power and FDR accounting cover the per-family contrasts; it cannot be added after data collection. It operationalizes a positive, falsifiable claim: **under-verification is judge-independent** — it arises from the discretion degree of freedom itself, not from any single model's weakness — and `K-Full`'s enforcement advantage holds across all model families. Every model family is reported separately before any pooled summary.

## Decisions

Research labels: `accept`, `reject`, `abstain`. Product `pass` maps to `accept`; `resubmit` maps to `reject`; `manual_review` maps to `abstain`. Runtime errors remain failures in coverage and cost accounting and are never silently removed.

## Loss and metrics

- Primary: unsafe positive-transition rate at matched automation coverage 0.70 for `K-Full` versus `J1-IM`.
- Report acceptance coverage separately from total automation coverage so that a system cannot meet coverage mainly through rejection.
- Also report unsafe acceptance per all evaluated cases and per all adjudicated-negative cases.
- False-acceptance cost weight: 5. False-rejection cost weight: 1.
- Report utility sensitivity for false-accept:false-reject ratios of 1:1, 2:1, 5:1, and 10:1; only 5:1 is confirmatory.
- Secondary: full risk–coverage curves, AURC, per-defect-class matched-coverage rates, `J1+abstain` and `J1-DT` contrasts, FRR, macro F1, calibration error, latency, cost, escalation, privacy excess, and receipt auditability.

## Statistical analysis

- Clustered bootstrap by base case with 10,000 resamples.
- Two-sided 95% confidence intervals.
- Primary superiority is supported only if the paired interval for the `K-Full` − `J1-IM` unsafe-rate difference excludes zero below zero at matched coverage.
- Secondary p-values use Holm correction.
- Effect sizes and raw counts are always reported.
- If the number of independent base-case clusters is too small for stable percentile bootstrap inference, report a paired randomization/permutation analysis as a robustness check.
- Report rater agreement (Krippendorff's α, target ≥ 0.67) and results stratified by adjudicated policy ambiguity.

## Threshold selection

- Thresholds are selected on development data only.
- Test labels remain sealed until all system outputs are immutable.
- No prompt, model, feature, or threshold changes after unsealing.
- Report sensitivity across the full coverage range (including 50%, 60%, 70%, 80%, 90%) without changing the primary endpoint at matched coverage 0.70.

## Fairness of comparison

- The information-matched `J1-IM` condition receives the same evidence bundle and observation text but lacks immutable commitment, binding enforcement, selective transition semantics, and reconstructable receipt enforcement.
- Report token use, model calls, wall-clock latency, and monetary cost for every system.
- Do not attribute gains to the contract abstraction if they disappear under information- and compute-matched comparison. Compute matching is operationalized against the steelmanned `J1-DT`, whose per-decision sample/token budget is fixed at ≥ `K-Full`; any surviving `K-Full` advantage is therefore an enforcement effect, not a compute effect.
- Report every model family separately before any pooled summary.

## Mutation and rater blinding

- Raters are blind to system identity, predicted decision, and mutation category.
- Hold out at least one mutation-construction source or template family from development in addition to held-out task classes.
- One held-out mutation source is an **adversarially optimized** family: its mutations are selected to maximize the confidence of the discretionary judges (`J1-IM` / `J1-DT`) on unsafe cases — i.e. the replay/drift/binding defects on which those judges are most confidently wrong. This adversarial source is constructed and frozen **before any confirmatory datum is collected** and is never used for threshold selection. It operationalizes the preregistered crossover hypothesis: under adversarial pressure the structural guard's advantage should be preserved (deterministic enforcement is adversary-invariant) while the discretionary judges' advantage should collapse. The crossover is confirmatory in direction only; a null or reversed crossover is reported as a negative result and is not re-optimized.
- Labels answer evidence sufficiency under the frozen policy; raters do not see `K-Full` receipts during ground-truth labeling.

## Missingness and failures

- API timeout, malformed output, unsupported evidence, and provider failure stay in the denominator.
- Exclusions require a pre-existing exclusion category and are reported.
- Cases cannot be excluded because a system performed poorly.

## Falsification conditions

The central claim fails under any of the following preregistered conditions. Null and negative results remain in the paper.

1. `K-Full` does not reduce the per-defect-class unsafe rate relative to `J1-IM` at matched coverage, with the paired 95% interval crossing zero.
2. The `K-Full` advantage over `J1-IM` vanishes — i.e. the effect is explained by information rather than structure.
3. `K-Full` does not improve over `J1+abstain` or `J1-DT` in the corresponding secondary contrasts.
3a. Under-verification is **not** judge-independent: the discretionary under-verification effect (and `K-Full`'s advantage over it) appears on some model families but not others, so it is a per-model quirk rather than a property of discretion. If `K-Full`'s advantage over the steelmanned `J1-DT` holds on one family but reverses or vanishes on another frontier or open-weight family, the judge-independence claim is not supported and is reported as such.
4. The gain does not transfer to the held-out task classes or the held-out mutation source.
4a. The adversarial-source crossover does not appear: under the adversarially optimized held-out mutation source, `K-Full`'s advantage over `J1-IM` / `J1-DT` does not grow (or shrinks) relative to the non-adversarial sources. Absence of the crossover is reported as a negative result; the adversarial source is not re-optimized after unsealing.
5. The reduction in unsafe transitions is accompanied by a drop in acceptance coverage large enough that unsafe acceptance per negative case does not improve — operationalized as no improvement at any matched coverage level.
6. Canonical receipts do not improve independent reconstruction over ordinary logs.
7. Each property ablation is a direct empirical test of the model-internal necessity result: if removing property *i* does **not** selectively restore its matched harm on real data (the harm predicted by the theorem's witness fails to appear), then that property's necessity does not transfer beyond the defect model, and we report it as such rather than claiming empirical minimality. If `K-P` alone accounts for the effect, the later properties are not claimed as necessary.

Additional human-study falsification: if arm (iii) of the human study does not beat arm (ii), the human benefit is attributed to organization rather than to the contract. If structured human review increases automation bias, that negative result remains in the paper.
