# JOVE-Core Dataset Card

## Summary

JOVE-Core is a research dataset for evaluating selective verification of digital outcomes requested by AI agents. It contains task-conditioned proof policies, privacy-scoped evidence references, verification observations, independent human ratings, and auditable receipts.

## Current release stage

The current artifact defines a 20-case live developmental pilot. No completed case data or performance result is claimed yet.

## Intended use

- evaluate generic and policy-aware model judges;
- evaluate deterministic, forensic, multimodal, and selective verification layers;
- study human adjudication and receipt auditability;
- reproduce the experiments described in the active paper draft.

## Out-of-scope uses

- universal media-authenticity detection;
- authorship attribution;
- identity verification beyond an explicit policy;
- high-stakes legal, medical, employment, credit, or regulatory decisions;
- physical-task claims in the primary paper.

## Composition

The live pilot reserves 20 slots across six digital task classes. Thirty independently sourced base cases is a planning floor, not a powered final sample. Confirmatory size and bundle count are frozen only after pilot-derived paired power analysis.

## Collection

Base cases must originate from real product or research-interface execution with participant consent. Offline variants are derived only after base capture and remain grouped with their base case. Product-side raw evidence is not automatically part of a public dataset.

## Annotation

The developmental pilot uses two independent raters. The confirmatory test requires at least three independent raters. Raw disagreement is retained, followed by documented adjudication.

## Privacy

Research records store hashes, versions, counts, observations, and access-controlled references. Public artifacts should exclude raw sensitive evidence unless separately consented and redacted. Data retention follows the recorded case policy.

## Known limitations

- narrow digital task classes;
- platform and model drift;
- matched variants may not reproduce natural adversarial behavior;
- forensic signals are neither complete nor deterministic authenticity evidence;
- reviewers may be influenced by policy wording;
- the pilot is too small for confirmatory performance claims.

## Maintenance

Every release must record schema version, collection dates, model identifiers, prompt versions, exclusions, and changes to task composition. Confirmatory test labels remain sealed until systems and thresholds are frozen.
