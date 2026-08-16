# NeurIPS Paper Checklist (JOVE-Core)

Answered honestly to the **current pre-registered, pre-data** state. Each item: **[Yes] / [No] / [NA]** + justification. Where results do not yet exist, the answer reflects the *committed protocol*, marked *(planned)*. This is deliberately conservative: overclaiming here is exactly the failure mode the paper studies.

---

## 1. Claims

**Do the abstract and introduction accurately reflect the paper's contributions and scope?** **[Yes]**
The abstract states this is a pre-registered manuscript, that §8 reports *no results yet*, and that no empirical superiority is claimed before independent labeling. Contributions are the separation theorem, the Verification Contract with three-valued truth-biased guard (soundness / abstention-monotonicity / non-redundancy), the JOVE-Core design, and the pre-registration itself. "Open-world" is explicitly scoped to an observation regime, not unconstrained adversarial settings.

## 2. Limitations

**Does the paper discuss limitations?** **[Yes]**
Dedicated Limitations section: no empirical results yet; theorems hold relative to the modeled defect family and threat model; no coverage of physical sensor compromise, identity collusion, or adaptive media attacks; matched defect ≠ adaptive adversary; rater noise; relative (not absolute) completeness.

## 3. Theory: assumptions and proofs

**For each theoretical result, are assumptions and complete proofs provided?** **[Yes]**
Separation (Thm 1), authorization soundness (Thm 2), abstention monotonicity (Prop 1), non-redundancy (Thm 3, constructive), relative completeness (Prop 2). Each states its assumptions (notably the modeled defect family) and gives a proof; cross-referenced to specific ablations in the benchmark.

## 4. Experimental result reproducibility

**Does the paper fully disclose information needed to reproduce the main results?** **[Yes (protocol); NA (results)]** *(planned)*
No confirmatory results exist yet. The *protocol* is fully disclosed and frozen: field-level case construction, group-preserving splits, held-out reservation, paired clustered bootstrap, target sample size + power analysis, seeds/model IDs/prompts/temperatures/provider dates to be pinned at freeze. Scripts are shipped and tested.

## 5. Open access to data and code

**Are data and code available with sufficient instructions?** **[Yes (code + protocol); planned (confirmatory data)]**
Code, schemas, and analysis scripts ship in `scripts/` with runbooks. The dataset is released as a versioned DOI artifact after the freeze (`author-statement.md` §3). Confirmatory labels remain sealed until systems/thresholds are frozen, then released. Reproduction bundle has a stable sha256 MANIFEST.

## 6. Experimental setting / details

**Are training/test details (splits, hyperparameters, selection) specified?** **[Yes]**
Six task classes, ≥4 base cases each; ≥2 classes and ≥1 mutation source held out from threshold selection; risk–coverage evaluation along the full curve; co-primary baselines defined (information-matched judge; policy-aware judge with abstention). Threshold selection is confined to non-held-out data.

## 7. Error bars / statistical significance

**Does the paper report appropriate statistical significance / error bars?** **[Yes (planned method)]** *(planned)*
Pre-committed: 10k-iteration **paired, cluster-preserving bootstrap** confidence intervals for paired risk–coverage comparisons, with the clustering unit being the group (base + its mutations). α and effect sizes are frozen pre-data; underpowered outcomes are downgraded to exploratory, not p-hacked.

## 8. Compute

**Is the compute for each result reported?** **[NA now; will report]** *(planned)*
No compute-bearing results yet. Final release will record model identifiers, provider dates, and inference cost per condition.

## 9. Code of Ethics

**Does the research conform to the NeurIPS Code of Ethics?** **[Yes]**
Consented capture, blinded adjudication, privacy scoping, and a pre-commitment to publish null/negative findings. See `ethics-and-governance.md`.

## 10. Broader impacts

**Are potential positive and negative societal impacts discussed?** **[Yes]**
See `broader-impact.md`: positive (safer authorization defaults, over-blocking counted as harm, auditability); negative/risks (misuse as identity/trust scoring, false sense of safety outside the modeled defect family, capture-time privacy). Mitigations stated.

## 11. Safeguards for high-risk assets

**Are safeguards described for models/datasets with misuse risk?** **[Yes]**
Binding out-of-scope use restrictions (no identity/authorship attribution; no high-stakes legal/medical/credit decisions; harm labels not to be repurposed as person-level scores). Raw sensitive evidence excluded from public release; controlled tier requires separate consent + redaction.

## 12. Licenses for existing assets

**Are existing assets properly credited and licensed?** **[Yes]**
Related work (LLM-as-judge, selective prediction, media forensics, agent benchmarks, documentation/provenance) is cited. Third-party assets used in capture are governed by their source-platform terms; only policy-scoped consented records are published.

## 13. New assets documentation

**Are new assets well documented?** **[Yes]**
`datasheet-for-datasets.md` (Gebru schema), `dataset-card.md`, `author-statement.md`, schema files (`/v1`), and runbooks. Documentation submitted alongside the artifact.

## 14. Crowdsourcing / human subjects

**For human-subjects/crowdsourcing, are instructions, compensation, and consent described?** **[Yes]**
`human-study-plan.md` + `ethics-and-governance.md`: rater instructions and calibration, blinded packets, compensation, participant consent, retention/revocation policy.

## 15. IRB / ethics approvals

**Were IRB or equivalent approvals obtained where required?** **[Yes / recorded]**
IRB/ethics-board status and consent framework are recorded in `ethics-and-governance.md`. Confirmatory collection does not begin until this and G1 (analysis freeze) are complete.

## 16. LLM usage (if methodologically relevant)

**Is LLM usage as a core component declared?** **[Yes]**
The evaluated judges are LLM/multimodal systems and are declared as objects of study, with model IDs, prompts, and provider dates to be pinned at freeze. LLMs are the *subject* of evaluation, not an undisclosed part of the method.

---

*Status: items reflecting confirmatory results are marked `(planned)` and will flip to fully-answered once G4 produces frozen outputs. No item is answered [Yes] on the basis of data that does not yet exist.*
