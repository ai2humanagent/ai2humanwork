# AI2Human LangChain Integration Submission Brief

## Package

`langchain-ai2human`

## One-line description

LangChain tools that let agents dispatch reality-bound work to AI2Human for human execution, structured proof, verification, and settlement tracking.

## What it does

AI2Human is used when an agent knows what needs to happen but cannot honestly complete the next step in software. The integration exposes a small toolset:

- `ai2human_list_categories`
- `ai2human_create_task`
- `ai2human_check_task`
- `ai2human_get_proof`

The core loop is:

```text
agent request -> human execution -> structured proof -> review -> settlement
```

## Why it belongs in LangChain

LangChain agents already call software tools, APIs, search, browsers, and databases. AI2Human covers the missing class of tasks where an agent needs a real person or human judgment:

- local verification
- mobile or web UX review
- screenshot-backed proof
- receipt or photo collection
- compliance-style manual review
- identity-bound or real-world actions

The integration keeps these tasks inside a structured, auditable workflow instead of forcing the agent to hand off work through DMs, spreadsheets, or vague human instructions.

## Example prompt

```text
Check the posted price of a Tall Americano at Starbucks Times Square, NYC.
If this requires real-world confirmation, create an AI2Human task with photo, timestamp, and notes proof.
```

## Example output

```json
{
  "task_id": "task_...",
  "task_url": "https://ai2human.io/tasks/task_...",
  "status": "live",
  "proof_schema": ["photo", "timestamp", "notes"]
}
```

## Safety boundary

The integration should not be used for spam, fake reviews, credential handling, illegal actions, platform abuse, or anything that should be completed directly by software.

## Repo path

`integrations/langchain-ai2human`

## Developer links

- Developer keys: https://ai2human.io/developers/api-keys
- Agent docs: https://ai2human.io/agent/skill.md
- Task endpoint: https://ai2human.io/api/agent/tasks
