# JOVE-Core Pilot Rating Rubric

## Rater task

Judge whether the submitted evidence supports the requested digital outcome under the supplied Proof Policy. Do not infer facts that are not visible in the review packet. Do not use the automated verifier decision; it is intentionally hidden.

## Outcome

- `supported`: all required rules are supported by the available evidence.
- `unsupported`: evidence contradicts the outcome or shows a terminal policy failure.
- `insufficient_to_decide`: the outcome may be true, but the evidence is missing, ambiguous, stale, or otherwise inadequate.

## Sufficiency

- `sufficient`: enough policy-relevant evidence exists to make the outcome decision.
- `correctable_gap`: a new or clearer submission could resolve the problem.
- `terminal_failure`: the current outcome does not satisfy a non-correctable requirement.
- `uncertain`: the reviewer cannot reliably distinguish the previous categories.

## Defect class

- `none`: no material defect.
- `missing`: required evidence absent.
- `stale`: evidence falls outside the required time window.
- `replay`: evidence is bound to another task or prior event.
- `metadata_conflict`: file or temporal observations conflict with the claim.
- `benign_edit`: editing is present but does not invalidate the policy claim.
- `semantic_mismatch`: content does not support the requested outcome.
- `contradiction`: multiple evidence items conflict.
- `other`: explain in the reason field.

## Privacy excess

Mark `true` only when submitted evidence exposes information unnecessary to decide the policy, such as unrelated identifiers, private messages, account balances, contact details, or bystander information.

## Confidence

Use a continuous score from 0 to 1:

- `0.50`: effectively uncertain between plausible outcomes.
- `0.70`: leaning with a meaningful unresolved issue.
- `0.85`: strong evidence with a limited residual concern.
- `0.95+`: direct and policy-complete evidence.

Confidence does not replace the outcome or reason.

## Independence

- Do not discuss cases with another rater before submitting ratings.
- Do not inspect product status, settlement state, model output, or other rater labels.
- Record the decisive evidence and a specific reason for every rating.
- If the packet is technically inaccessible, report it as an instrumentation problem rather than guessing.
