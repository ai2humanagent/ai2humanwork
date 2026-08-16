# JOVE-Core Research Artifact

JOVE-Core is the active digital-evidence benchmark for the AI2Human paper. It replaces the earlier cross-domain 600-case proposal with a staged, executable study.

## Scope

Six digital task classes only:

- social-content completion;
- account configuration;
- content publication;
- form/document submission;
- time-sensitive digital state;
- cross-evidence consistency.

Physical execution is excluded from the primary paper.

## Pilot workflow

1. Select the next row in `pilot/manifest.csv`.
2. Obtain research consent and run a real task through the product.
3. Snapshot `custom-task-spec/v1`, `proof-bundle/v1`, verifier observations, and receipt.
4. Store one research record in `pilot/cases/<case_id>.json` using `pilot/case.template.json`.
5. Set the manifest status to `captured`.
6. Run `node docs/jove-core/scripts/validate-pilot.mjs`.
7. Build the blinded packet with `node docs/jove-core/scripts/build-blinded-packet.mjs`.
8. Give the packet independently to two pilot raters.
9. Append ratings to `ratings/pilot-rating-sheet.csv`.
10. Run `node docs/jove-core/scripts/summarize-ratings.mjs`.
11. Adjudicate disagreements without deleting original ratings.

## Confirmatory commands

- `npm run research:jove:leakage -- <manifest.jsonl>` checks group-preserving splits.
- `npm run research:jove:score -- <outputs.jsonl> <labels.jsonl> <result.json>` generates frozen metrics and a Markdown table.
- `npm run research:jove:bootstrap -- <outputs.jsonl> <labels.jsonl>` computes the clustered primary comparison.
- `npm run research:jove:audit` checks the complete research artifact and claim boundary.

## Privacy boundary

Case JSON files contain research metadata and commitments, not publicly shareable raw evidence. Raw evidence remains in access-controlled product storage. Public receipts must expose only decision-relevant, privacy-scoped information.

## Status discipline

The 20-case pilot is developmental. It may establish feasibility and expose instrumentation failures, but it cannot support the confirmatory performance claim. Confirmatory data is collected only after rubric, thresholds, models, prompts, and analysis are frozen.
