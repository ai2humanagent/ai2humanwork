# Broader Impact & Ethics Statement (JOVE-Core)

NeurIPS-required broader-impact statement. It complements `ethics-and-governance.md` (consent, IRB, privacy operations) and is data-independent. The framing is deliberately even-handed: this line of work has a specific safety upside and specific, nameable risks.

---

## 1. Problem context

Agents increasingly trigger consequential transitions — releasing payment, granting authorization, marking completion — from **probabilistic observations** of external evidence rather than authoritative program state. The core asymmetry is that observations are probabilistic while consequences are discrete. Getting the *authorization boundary* wrong causes real harm in two directions: wrongly permitting (fraud, wrong payment, wrong authorization) and wrongly rejecting (denying legitimate submitters). JOVE-Core makes **both** directions first-class harms.

---

## 2. Positive impacts

- **Safer default under uncertainty.** The three-valued truth-biased guard makes *abstain* — not a coerced `⊤` — the default when evidence is unresolved, giving automated pipelines a safe stop instead of a silent permit. Abstention-monotonicity guarantees resolving an unknown never manufactures an unsafe permit.
- **Over-blocking counted as harm.** Because "wrong rejection of a legitimate submitter" is in the ground-truth label set, the benchmark discourages systems that achieve low fraud merely by refusing everyone. This directly protects the least-powerful party (the submitter) from silent denial.
- **Auditability.** Reconstructable receipts let an independent party reconstruct *which predicates, at which policy version, over which bound evidence* authorized a transition — a prerequisite for contestability and redress.
- **Separation of structure from information.** The information-matched baseline isolates whether *structure* (not just more data) reduces harm, discouraging the "we have more signals" arms race in favor of accountable design.
- **Scientific hygiene as a public good.** Pre-registration + a public commitment to report null/negative results counters publication bias in an area (agent safety) prone to hype.

---

## 3. Risks and failure modes

- **Misuse as identity / trust scoring.** Harm labels or predicate outcomes could be repurposed to score *people* rather than *transitions*. **Mitigation:** binding use restriction (`datasheet` §5, `author-statement` §2) forbidding person-level scoring, authorship attribution, and identity verification beyond an explicit policy.
- **False sense of safety.** The soundness/completeness results are **relative to a modeled defect family** (policy drift, cross-task replay, unresolved service state, non-reconstructable decisions). Deploying against physical sensor compromise, identity collusion, or adaptive media attacks — outside that family — could give unwarranted confidence. **Mitigation:** explicit scope statements in the abstract, Limitations, datasheet, and checklist; "open-world" defined as an observation regime, not an adversarial guarantee.
- **Capture-time privacy.** Base cases originate from real executions that may contain sensitive content. **Mitigation:** public artifact stores hashes/versions/counts/references only; raw evidence is access-controlled, redacted, and released only under separate consent (`ethics-and-governance.md`, `datasheet` §6).
- **Automation over-reliance / deskilling.** A trusted authorization layer may reduce human scrutiny of edge cases. **Mitigation:** abstain routes unresolved cases to humans by design; receipts keep humans able to contest.
- **Dual-use of the attack constructions.** Matched defects encode ways authorization can be subverted (post-hoc policy relaxation, replay, coerced-unknown). **Mitigation:** these are single-factor, non-adaptive controlled cases, not operational exploits; the point is to demonstrate each property's necessity, not to weaponize.

---

## 4. Fairness & who bears the harm

The design intentionally protects the party with the least control — the legitimate submitter who could be silently rejected — by treating wrong rejection as harm on par with wrong payment. Raters are blind to the contract mechanism to avoid a metric that flatters the authors' own system. Conflicts of interest are declared in `author-statement.md` §5.

---

## 5. Environmental & compute

The confirmatory study evaluates existing model judges rather than training large models; compute cost is dominated by inference and will be reported per condition at release. Expected footprint is modest relative to model-training benchmarks.

---

## 6. Net assessment

On balance we judge the expected impact **net positive**: a safer, auditable authorization default with over-blocking counted as harm, released under pre-registration and enforceable use restrictions. The principal residual risk is *misapplication outside the modeled defect family or as person-level scoring*, which the scope statements and binding use restrictions are designed to contain. We commit to updating this statement if confirmatory results reveal impacts not anticipated here.

---

*Cross-references: `ethics-and-governance.md` (consent/IRB/privacy operations), `datasheet-for-datasets.md` §5–6 (uses/distribution), `author-statement.md` §2,§5 (responsibility/conflicts), `neurips-checklist.md` items 9–11.*
