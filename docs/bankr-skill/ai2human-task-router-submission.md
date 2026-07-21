# AI2Human Task Router — Bankr Skill Submission Notes

## Skill Name

AI2Human Task Router

## Folder

`integrations/bankr-ai2human-task-router`

## One-Line Description

Create and track AI2Human human-execution tasks from an agent prompt, returning a task URL, proof schema, and verification status path.

## Why This Fits Bankr

Bankr gives agents a financial and LLM interface. AI2Human gives agents a way
to route work that requires human execution, evidence, verification, or manual
judgment.

The integration is intentionally narrow:

```text
agent prompt -> AI2Human task -> human proof -> verification -> settlement-ready result
```

## Public Install Prompt

```text
install the skill at https://github.com/ai2humannetwork/<repo>/tree/main/integrations/bankr-ai2human-task-router
```

## Recommended Bankr PR Description

```text
Adds AI2Human Task Router, a skill for creating human-execution tasks from agent prompts.

The skill is designed for cases where an agent needs a human to review, verify,
inspect, photograph, or submit structured proof before the workflow can continue.

The immediate output is an AI2Human task URL, status URL, and proof schema.
The final deliverable arrives after human execution and verification.

This v1 intentionally avoids full reward-campaign payout automation; it focuses
on the core task-routing loop first.
```

## Acceptance Checklist

- [x] Skill has a single clear purpose.
- [x] `SKILL.md` includes Bankr-style frontmatter.
- [x] x402 endpoint is documented.
- [x] API-key endpoint is documented.
- [x] Async human-execution boundary is explicit.
- [x] Unsafe/spam/invasive work is explicitly blocked.
- [x] Example payloads are included.
- [x] Smoke script checks x402 challenge and optional API-key task creation.

