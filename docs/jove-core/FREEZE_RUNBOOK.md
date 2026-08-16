# G1 Analysis-Freeze Runbook

**Gate:** G1 (Freeze) in `venue-strategy.md`.
**Hard rule:** the freeze must happen **before a single confirmatory datum is collected**. This is a preregistered commitment; violating it invalidates the confirmatory claim.

## What "freeze" means here

The freeze pins, with sha256 + git commit + UTC timestamp, the exact analysis that will be run on the confirmatory data:

- `preregistration.md` (endpoint, sample, falsification conditions)
- scoring + inference scripts (`score-experiments`, `bootstrap-primary`, `power-paired-cluster`, `summarize-ratings-jsonl`)
- leakage guards (`check-split-leakage`, `audit-mutation-leakage`)
- the submission gate itself
- `dataset-card.md`, `human-study-plan.md`

The record is written to `analysis-freeze.json`.

## Preconditions (all must hold)

1. `preregistration.md` ⇄ `main-v5.tex` consistency confirmed (G0 — done).
2. All analysis scripts final; no planned edits to scoring/inference logic.
3. Git working tree **clean** (the freeze script refuses to run on a dirty tree, so the pinned commit is meaningful).

## Procedure

```bash
# 1. Commit all analysis code + docs (clean tree required)
git add -A && git commit -m "freeze: JOVE-Core confirmatory analysis (pre-data)"

# 2. Create the freeze record
npm run research:jove:freeze
#   -> writes analysis-freeze.json with hashes, commit, timestamp

# 3. Commit the freeze record itself
git add docs/jove-core/analysis-freeze.json
git commit -m "freeze: pin analysis-freeze.json"

# 4. (recommended) push + tag for an external timestamp
git tag jove-freeze-$(date -u +%Y%m%d)
```

For an independent, tamper-evident timestamp, also record the freeze commit hash in an external registry (e.g. OSF registration, or a public git host's signed tag). The paper cites this as the preregistration timestamp.

## Verification (run continuously after freeze)

```bash
npm run research:jove:freeze-verify
```

This fails if:
- any frozen artifact's content changed after the freeze (integrity), or
- any confirmatory data file (`confirmatory/*.jsonl`, `experiments/outputs.jsonl`, `results/metrics.json`) has a modification time **earlier than** the freeze timestamp (timeline / p-hacking guard).

`freeze-verify` is wired into `npm run research:jove:preflight` as a soft check: it is `expected_to_fail_before_freeze`, and after G1 it must turn green and stay green through submission.

## If analysis logic genuinely must change after freeze

Do **not** silently edit. Instead:
1. Document the reason and the exact diff.
2. Re-freeze with a new record, and disclose the amendment (and its timestamp relative to any collected data) in the paper.
3. If data was already collected under the old freeze, the affected analysis is **exploratory**, not confirmatory.
