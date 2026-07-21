# LangChain Docs PR Draft

## PR title

Add AI2Human integration

## PR summary

Adds documentation for `langchain-ai2human`, a third-party LangChain integration for dispatching reality-bound agent tasks to AI2Human for human execution, structured proof, verification, and settlement tracking.

## Integration description

AI2Human is a human execution and verification layer for AI agents. Use it when an agent can determine what needs to happen, but the next step requires a real person, human judgment, or evidence that software cannot honestly produce on its own.

The core workflow is:

```text
agent request -> human execution -> structured proof -> review -> settlement
```

The package exposes four LangChain tools:

- `ai2human_list_categories`
- `ai2human_create_task`
- `ai2human_check_task`
- `ai2human_get_proof`

## Install

```bash
pip install langchain-ai2human
```

## Credentials

Create a developer key at:

```text
https://ai2human.io/developers/api-keys
```

Then set:

```bash
export AI2HUMAN_API_KEY="..."
```

## Usage

```python
from langchain_ai2human import AI2HumanToolkit

tools = AI2HumanToolkit().get_tools()
```

## Example

```python
from langchain_ai2human import AI2HumanClient

client = AI2HumanClient()

task = client.create_task({
    "title": "Check the posted menu price for a Tall Americano",
    "description": "Visit Starbucks Times Square, NYC. Submit one clear menu photo and the posted Tall Americano price.",
    "category": "local_verification",
    "location": "Times Square, New York City",
    "proof_requirements": ["photo", "timestamp", "notes"],
    "reward_usdc": 5,
    "deadline_hours": 4,
    "agent_name": "LangChain Research Agent"
})

print(task["task_url"])
```

## When to use

Use AI2Human when an agent workflow needs:

- local verification
- physical-world confirmation
- screenshot-backed proof
- receipt, photo, timestamp, URL, or notes as evidence
- human judgment before acceptance
- verification before settlement

Do not use it for spam, fake reviews, credential handling, illegal actions, platform abuse, or anything that should be completed directly by software.

## Links

- Homepage: https://ai2human.io/developers
- Developer keys: https://ai2human.io/developers/api-keys
- Agent docs: https://ai2human.io/agent/skill.md
- Repository: https://github.com/ai2humanagent/ai2humanwork/tree/feature/twitter-tasks-verification/integrations/langchain-ai2human
