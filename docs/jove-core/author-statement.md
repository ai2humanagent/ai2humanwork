# Author Statement, License, Hosting & Maintenance

NeurIPS Datasets & Benchmarks requires an explicit author statement of responsibility, a license, a hosting/DOI plan, and a maintenance plan. This document is that deliverable. It is data-independent and complete now; only the DOI minting and public upload steps wait on the confirmatory freeze.

> **Anonymization note.** For double-blind review, bracketed placeholders `[...]` are filled only in the camera-ready. Nothing here de-anonymizes the submission.

---

## 1. Author statement of responsibility

We, the authors, **bear all responsibility** for the collection, licensing, distribution, and maintenance of JOVE-Core, and for any violation of rights arising from its use. To the best of our knowledge:

- All **base cases are captured with explicit participant consent** under the recorded per-case policy (`ethics-and-governance.md`).
- The public artifact stores **hashes, versions, counts, observations, and access-controlled references** — not raw sensitive evidence — unless separately consented and redacted.
- Ground-truth labels are produced by **independent raters blind to the contract mechanism**; raw disagreement is retained and adjudication is documented.
- The confirmatory analysis is **pre-registered and frozen before data collection**; we commit to reporting **null and negative results** as-is under all seven falsification conditions.

We confirm the dataset does **not** knowingly contain personally identifying raw content in its public form, and that any residual privacy risk is mitigated by the redaction and access-control procedures in `datasheet-for-datasets.md` §6 and `ethics-and-governance.md`.

---

## 2. License

| Component | License | Rationale |
|---|---|---|
| Code (`scripts/`, analysis, gates) | **MIT** | Maximize reuse and reproduction of the analysis pipeline. |
| Dataset records, schemas, labels | **CC BY 4.0** | Attribution-preserving reuse of the structured research records. |
| Paper text / figures | **CC BY 4.0** (camera-ready) | Standard open dissemination. |

**Use restrictions (binding regardless of license):** the out-of-scope uses in `datasheet-for-datasets.md` §5 (no universal media-authenticity detection, no authorship/identity attribution, no high-stakes legal/medical/employment/credit/regulatory decisions, no physical-task claims, no adaptive-adversary robustness claims). Harm labels **must not** be repurposed as identity or trust scores for individuals.

DOI-minted releases will carry a `LICENSE` file and a machine-readable `licenses` block in the release manifest.

---

## 3. Hosting, access & DOI

- **Hosting:** a versioned public repository (code + schemas + scripts) mirrored to an archival host that mints a **citable, version-pinned DOI** (e.g., Zenodo/OSF) for each release. *(DOI minted by authors after the confirmatory freeze; the review submission cites the frozen commit hash + timestamp tag in the interim.)*
- **Access tiers:**
  - *Public tier:* structured records, schemas, scripts, aggregate labels, reproduction bundle.
  - *Controlled tier:* any raw product-side evidence, released only under separate consent + redaction + access agreement.
- **Reproducibility:** `build-reproduction-bundle.mjs` produces a bundle whose `MANIFEST` sha256 is stable; `provenance.json` guarantees confirmatory rows carry no template/synthetic source.
- **Persistence:** deprecated releases remain retrievable by DOI so prior results stay reproducible.

---

## 4. Maintenance plan

- **Maintainers:** the authors (`[contact email / org]`), responsible for issues, errata, and version bumps.
- **Cadence:** releases are event-driven (new task classes, corrected labels, schema changes), not calendar-driven. Every release records: schema version, collection dates, model identifiers, prompt versions, exclusions, task-composition changes.
- **Versioning:** explicit schema versions (`/v1`); breaking changes bump the version; the paper pins the exact release used.
- **Errata policy:** raw ratings are **immutable**; corrections are **additive and adjudication-documented**, never silent overwrites — mirroring the auditability the benchmark itself studies.
- **Contributions:** external contributions accepted via the same consent + single-factor-mutation + blinded-adjudication protocol, and must pass `privacy-audit`, `leakage`, and `audit-research-artifact` gates before merge.
- **Sunset:** if maintenance ceases, the last DOI release remains archived and citable; a `STATUS` note will mark it unmaintained.

---

## 5. Funding & conflicts

- **Funding:** `[funder(s) / none]`. No funder had control over the pre-registered confirmatory analysis or the decision to publish null/negative results.
- **Conflicts of interest:** `[declare any relationship between the authors' organization and the systems evaluated]`. The information-matched primary baseline is designed to isolate *structure* from *information*, precisely so that a favorable result cannot be an artifact of the authors' own product having more data.

---

*Cross-references: `datasheet-for-datasets.md` (composition/distribution), `ethics-and-governance.md` (consent/IRB/privacy), `neurips-checklist.md` (checklist), `broader-impact.md` (impact), `REMAINING_ACTIONS.md` §5 (submission gates).*
