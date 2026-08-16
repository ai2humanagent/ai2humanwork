# Datasheet for JOVE-Core

Following Gebru et al., *Datasheets for Datasets* (CACM 2021). This datasheet is the NeurIPS Datasets & Benchmarks / Ethics-track required deliverable. It is authoritative for dataset governance; `dataset-card.md` is the short-form summary and `preregistration.md` + `paper/main-v5.tex` are authoritative for naming and endpoints.

> **Release stage note.** At the current stage the artifact defines the benchmark protocol, schemas, pilot infrastructure, and frozen analysis. No completed confirmatory case data or performance result is claimed. Fields describing the confirmatory corpus therefore describe the **committed design**, explicitly marked *(planned)* where data does not yet exist.

---

## 1. Motivation

**For what purpose was the dataset created?**
To study a question distinct from judge accuracy: *under what conditions may a probabilistic observation authorize a deterministic, consequential state transition* (payment, authorization, completion, or rejection of a legitimate submitter)? Existing agent benchmarks treat completion judgments as given rather than as objects under audit. JOVE-Core supplies grouped base cases and property-aligned matched defects whose ground truth is an **independently adjudicated downstream harm**, so the metric cannot collapse into "did the system follow its own rules."

**Who created the dataset and on behalf of whom?**
The paper authors (anonymized for review). Institutional / brand attribution and funding are recorded in `author-statement.md`.

**Who funded the creation?**
See `author-statement.md`. No funder had control over the confirmatory analysis, which is pre-registered and frozen prior to data collection.

---

## 2. Composition

**What do the instances represent?**
Each instance is a **case**: a task-conditioned verification episode comprising an outcome claim `q`, a frozen predicate set `Φ` with commitment timestamps, a policy version `τ`, a bound evidence bundle `e`, per-predicate verification outcomes (`⊤/⊥/?`), a downstream action, a receipt `R`, and an independent harm label.

Cases are organized into **groups**: one consented digital **base case** plus a set of property-aligned **matched defects**, each perturbing exactly one factor (policy timing, evidence provenance, service availability, or receipt completeness) relative to its base.

**How many instances are there?**
- Pilot (developmental): 20–30 base cases.
- Confirmatory *(planned)*: target **200 independently sourced base cases**, **≥600 matched bundles**, across **six digital task classes** (≥4 base cases per class). Final size and bundle count are frozen only after pilot-derived paired power analysis.

**Does the dataset contain all possible instances or a sample?**
A sample. Base cases are drawn from real product/research-interface executions with consent; matched defects are single-factor derivations of consented bases. The dataset is not a census of any population and does not claim representativeness beyond the modeled digital task classes.

**What data does each instance consist of?**
Structured records (schemas: `custom-task-spec/v1`, `proof-bundle/v1`, verifier observations, receipt schema). Records store **hashes, versions, counts, observations, and access-controlled references** — not raw sensitive evidence by default.

**Is there a label or target associated with each instance?**
Yes: a binary **downstream-harm** label (wrong payment, wrong authorization, wrong completion, or wrong rejection of a legitimate submitter), assigned by independent raters blind to the contract mechanism. Raw disagreement is retained; adjudication is documented.

**Is any information missing from individual instances?**
By design, product-side raw evidence is not part of the public artifact unless separately consented and redacted. `?` (unknown) predicate values are first-class data, not missing values.

**Are relationships between instances made explicit?**
Yes. Group membership (base ↔ its matched defects) is explicit and **group-preserving splits are enforced** (`leakage` check) so a base and its mutations never straddle train/held-out boundaries.

**Are there recommended data splits?**
Yes. ≥2 task classes and ≥1 mutation construction source are **held out** from threshold selection. All mutations of a base stay in the same split.

**Are there errors, sources of noise, or redundancies?**
Rater noise is expected and measured (Krippendorff α; pilot gate α ≥ 0.67). Platform/model drift is a known source of non-stationarity. Matched variants may not reproduce natural adversarial behavior (a stated limitation).

**Is the dataset self-contained or does it rely on external resources?**
Records reference external product artifacts via access-controlled hashes/pointers; the public artifact is self-contained at the level of structured records, schemas, scripts, and labels.

**Does the dataset contain confidential / sensitive data?**
Potentially at capture time (real user submissions). Governance requires hashing, redaction, and exclusion of raw sensitive evidence from public release. See §6 and `ethics-and-governance.md`.

---

## 3. Collection Process

**How was the data acquired?**
Base cases are captured from **real product or research-interface execution with explicit participant consent**. Each capture snapshots the task spec, proof bundle, verifier observation, and receipt at the moment of execution.

**What mechanisms or procedures were used?**
Documented runbooks (`pilot/EXECUTION_RUNBOOK.zh.md`, README), per-case JSON templates, and validation scripts (`validate-pilot.mjs`, `privacy-audit.mjs`). Blinded rating packets are built by `build-blinded-packet.mjs`.

**If a sample, what was the sampling strategy?**
Purposive across six digital task classes with per-class floors, plus deliberate held-out reservation of task classes and mutation sources. Not probabilistic sampling from a defined population.

**Who was involved and how were they compensated?**
Participants (consented), and independent raters (2 in pilot, ≥3 in confirmatory). Compensation terms are recorded in `ethics-and-governance.md` / `human-study-plan.md`.

**Over what timeframe was the data collected?**
Each release records collection dates and platform/model identifiers. Confirmatory collection has not yet begun.

**Were ethical review processes conducted?**
Consent, privacy scoping, and blinded adjudication are pre-specified. IRB/ethics-board status is recorded in `ethics-and-governance.md`.

**Was consent obtained; can it be revoked?**
Yes, consent is required for every base case, and retention/revocation follows the recorded per-case policy. Derived matched defects inherit their base's consent scope.

---

## 4. Preprocessing / Cleaning / Labeling

**Was any preprocessing done?**
Raw evidence is reduced to hashes, versions, counts, and access-controlled references before storage. Matched defects are generated by single-factor perturbation carrying the same record schema for paired comparability.

**Was raw data saved?**
Product-side raw evidence is retained under access control per case policy, not in the public artifact.

**Is preprocessing software available?**
Yes — all capture, validation, blinding, scoring, bootstrap, leakage, and audit scripts ship in `scripts/` and are covered by a test suite.

**How were labels produced?**
By independent raters **blind to the contract mechanism**, judging downstream harm rather than rule-compliance. Confirmatory labels remain **sealed** until systems and thresholds are frozen.

---

## 5. Uses

**What tasks can the dataset be used for?**
- Evaluate generic and **policy-aware** model judges (the co-primary baselines);
- Evaluate deterministic, forensic, multimodal, and selective verification layers;
- Study human adjudication and receipt auditability;
- Reproduce the paper's risk–coverage, ablation, and reconstruction experiments.

**Is there a repository linking papers/systems using it?**
The reproduction bundle (`build-reproduction-bundle.mjs`) and provenance manifest link results to the frozen source.

**What should users NOT use it for? (out-of-scope)**
- Universal media-authenticity detection;
- Authorship attribution or identity verification beyond an explicit policy;
- High-stakes legal, medical, employment, credit, or regulatory decisions;
- Physical-task outcome claims;
- Adaptive-adversary robustness claims (matched defect ≠ adaptive adversary).

**Is there anything that might cause unfair treatment or harm?**
The independent-harm label includes **wrong rejection of a legitimate submitter**, so the benchmark measures over-blocking as harm, not only over-permitting. Users must not repurpose harm labels as identity or trust scores for individuals.

---

## 6. Distribution

**How will it be distributed?**
As a versioned public artifact with a citable DOI *(planned; created by authors after confirmatory freeze)*, excluding raw sensitive evidence.

**When and under what license?**
License terms are stated in `author-statement.md`. Confirmatory test labels are released only after the systems-and-thresholds freeze.

**Any IP or ToS restrictions?**
Captures must comply with the source platforms' terms; only policy-scoped, consented, redacted records are published.

**Export controls or regulatory restrictions?**
None known for the structured research records; high-stakes and physical-task uses are explicitly out of scope.

---

## 7. Maintenance

**Who maintains it and how to contact?**
The authors (contact in `author-statement.md`).

**Will it be updated?**
Yes. Every release records schema version, collection dates, model identifiers, prompt versions, exclusions, and task-composition changes.

**Are there versioning and deprecation policies?**
Yes. Schema versions are explicit (`/v1`); breaking changes bump versions; deprecated releases remain retrievable by DOI for reproducibility.

**Can others extend/contribute?**
Yes, via the same consent + single-factor-mutation + blinded-adjudication protocol. Contributions must pass `privacy-audit`, `leakage`, and `audit-research-artifact` gates.

**How are errata / label corrections handled?**
Raw ratings are immutable; corrections are additive and adjudication-documented, never silent overwrites, preserving the auditability the benchmark itself studies.

---

*Cross-references: `dataset-card.md` (summary), `ethics-and-governance.md` (consent/privacy/IRB), `human-study-plan.md` (rater protocol & power), `preregistration.md` + `paper/main-v5.tex` (naming/endpoints/falsification).*
