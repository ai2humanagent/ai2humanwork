# JOVE-Core Dual-Venue Submission Strategy

**Status:** active plan
**Primary track:** TMLR (Transactions on Machine Learning Research)
**Secondary track:** NeurIPS 2027 Evaluations & Datasets (E&D) Track
**Authoritative manuscript:** `paper/main-v5.tex` (kept term-for-term consistent with `preregistration.md`)

---

## 0. Why two tracks, and why this order

This is a **preregistered Registered-Report-style study** whose headline value is *falsifiable evaluation and honest reporting* (negative results stay in the paper). That profile maps cleanly onto two complementary venues:

| | TMLR (primary) | NeurIPS 2027 E&D (secondary) |
|---|---|---|
| Cadence | **Rolling, no deadline** — submit the moment data + analysis are frozen | Fixed annual cycle (~Apr/May 2027 submission) |
| Acceptance criterion | **Are the claims supported by the evidence?** (no novelty/impact bar) | Novelty + benchmark quality + reproducibility + impact |
| Fit with negative results | **Excellent** — supported claims accepted even if the effect is null | Weaker — a null primary result is a harder sell |
| Brand / narrative | JMLR sister journal, "top-journal accepted" | Strongest benchmark-track brand + conference exposure |
| Format | Journal (flexible length, OpenReview) | Conference (page limit, checklist, camera-ready) |

**Decision:** TMLR is the *first target for acceptance* (earliest possible publication, most tolerant of a preregistered null, review philosophy matches the paper's thesis). NeurIPS E&D is the *exposure target* — pursued in parallel on the artifact/checklist side so that a conference-formatted version is ready without rework.

> **Dual-submission caution.** Confirm the exact policies at submission time. TMLR permits later conference submission of TMLR-published work under stated conditions, and NeurIPS has its own dual-submission rules. Do **not** have both under active peer review simultaneously in a way that violates either policy. Sequence: submit TMLR → upon acceptance, prepare the E&D conference version citing the TMLR paper, subject to the then-current CFP.

---

## 1. Milestone-driven timeline (no deadline backsolve)

Because TMLR has no deadline, we drive by **readiness gates**, not calendar pressure. Current date: 2026-08. Estimated window to a submittable artifact: ~8–9 months of unhurried work.

| Gate | Definition of done | Blocks |
|---|---|---|
| **G0 Consistency** ✅ | `preregistration.md` ⇄ `main-v5.tex` term-for-term; stale drafts marked deprecated | done |
| **G1 Freeze** | Analysis scripts + field map + defect taxonomy committed and timestamped; `preflight-submission` timeline check passes | must precede *any* datum |
| **G2 Pilot** | 20–30 base cases; rater training validated; Krippendorff α ≥ 0.67 on pilot; instrumentation passes synthetic rehearsal | needs G1 |
| **G3 Full collection** | 200 consented base / 600 bundles; 3 blind raters; privacy + blinding gates pass | needs G2 |
| **G4 Results** | Frozen scripts produce §8: risk–coverage, AURC, per-defect-class rates, 10k bootstrap CIs; all 7 falsification conditions reported honestly | needs G3 |
| **G5a TMLR package** | `submission.tex` + reproduction bundle; `submission-gate` green; claims–evidence table complete | needs G4 |
| **G5b E&D package** | Conference-formatted version + full E&D checklist (datasheet, author statement, limitations, broader impact) | needs G4 |

**Rule:** never move a gate forward by weakening a threshold. If recruitment underdelivers, downgrade the confirmatory claim to exploratory (per preregistration) — do not relax α, coverage, or sample.

---

## 2. TMLR track — claims ⇄ evidence alignment

TMLR reviewers ask one core question: *is every claim supported by the evidence presented?* We therefore maintain an explicit claim→evidence map. Fill the "Evidence artifact" column as G4 produces outputs; every row must resolve to a concrete figure/table/number or the claim is softened.

| # | Claim in paper | Supporting evidence artifact | Falsifier (from prereg) |
|---|---|---|---|
| C1 | No artifact-only judge is authorization-sound at positive coverage | Theorem 3.1 + proof (theory; no data needed) | Formal counterexample to proof |
| C2 | K-Full lowers per-defect-class unsafe rate vs J1-IM at matched coverage | §8 risk–coverage fig + paired 10k-bootstrap CI table | F1: interval crosses zero |
| C3 | The advantage is *structural*, not merely informational | K-Full vs J1-IM gap under information+compute match | F2: gap vanishes under match |
| C4 | K-Full dominates J1+abstain in AURC | AURC table with CIs | F3: no AURC dominance |
| C5 | Gains transfer to held-out classes + held-out mutation source | Held-out split results | F4: no transfer |
| C6 | Unsafe reduction is not bought by collapsing coverage | Unsafe-per-negative vs coverage curve | F5: no improvement at any matched coverage |
| C7 | Canonical receipts improve independent reconstruction | Audit sub-study reconstruction scores | F6: no improvement over logs |
| C8 | Each property is empirically necessary (ablation) | Per-property ablation restoring matched harm | F7: removing property i does not restore its harm |
| C9 | Human structured review adds complementary safety | Human study arm (iii) vs (ii) | arm (iii) ≤ arm (ii) |

**TMLR reproducibility checklist (must all be green before submit):**
- [ ] Anonymized OpenReview-ready `submission.tex` compiles from the frozen source
- [ ] Reproduction bundle (`build-reproduction-bundle.mjs`) attached; MANIFEST sha256 stable
- [ ] `provenance.json` present, no `template`/`synthetic` provenance in confirmatory rows
- [ ] Seeds, model IDs, prompts, temperatures, provider dates frozen and listed
- [ ] `submission-gate` passes: manifest + labels + outputs + metrics + provenance + submission.tex
- [ ] Every claim in §1/abstract appears in the claims⇄evidence table with a resolved artifact
- [ ] Negative/null results retained verbatim; no post-hoc threshold changes

---

## 3. NeurIPS 2027 E&D track — parallel readiness

The E&D track scores benchmark quality, documentation, and reproducibility. Prepare these in parallel so the conference version is a reformat, not a rewrite.

**E&D deliverables:**
- [x] **Datasheet for Datasets** — full Gebru et al. schema → `datasheet-for-datasets.md` *(data-independent, complete; confirmatory-corpus fields marked `(planned)`)*
- [x] **Author statement / responsibility & license** — responsibility, MIT+CC BY licensing, consent basis, hosting/DOI plan, maintenance commitment → `author-statement.md`
- [x] **NeurIPS paper checklist** — 16 items answered to current pre-registered state; result-bearing items marked `(planned)` → `neurips-checklist.md`
- [x] **Broader impact + ethics** — positive/negative impacts, misuse mitigations, cross-linked to `ethics-and-governance.md` → `broader-impact.md`
- [ ] **Public artifact** — hosted benchmark with versioned DOI, croissant metadata if required by the then-current CFP *(needs G4 data + author upload)*
- [ ] **Limitations** — matched-defect (not adaptive-adversary) construction stated plainly; consistent with paper §Limitations *(final pass at camera-ready)*

> **Status (2026-08):** all four *data-independent* E&D documents are complete and pass the artifact audit (`audit-research-artifact` green, tests 15/15). The remaining two items require confirmatory data (G4) and author-side upload; see `REMAINING_ACTIONS.md` §5.

**Format delta from TMLR version:** enforce page limit, move overflow to appendix/supplement, adapt to NeurIPS style file, add the checklist. Content and numbers are identical to the TMLR version (single source of truth = frozen §8).

---

## 4. Single source of truth

To keep both tracks consistent:
- Numbers/figures come only from frozen G4 outputs; neither venue version recomputes independently.
- `preregistration.md` and `main-v5.tex` remain the naming/endpoint authority; any new doc must match them.
- The claims⇄evidence table (§2) is shared by both submissions; the E&D checklist references the same rows.
