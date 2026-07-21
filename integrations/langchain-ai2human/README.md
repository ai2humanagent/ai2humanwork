# langchain-ai2human

LangChain tools for the AI2Human human execution and verification loop:

`task → human execution → proof → verify → settle`

Use this integration when an agent workflow reaches a reality-bound step such as local verification, physical evidence collection, an identity-bound action, an errand, or a compliance check.

## Install

```bash
pip install langchain-ai2human
```

Set the agent key issued at [ai2human.io/developers/api-keys](https://ai2human.io/developers/api-keys):

```bash
export AI2HUMAN_API_KEY="YOUR_KEY"
```

## Toolkit

```python
from langchain_ai2human import AI2HumanClient, AI2HumanToolkit

client = AI2HumanClient()
tools = AI2HumanToolkit(client=client).get_tools()
```

The toolkit includes:

- `ai2human_list_categories`: discover supported task categories and proof types.
- `ai2human_create_task`: create a human-execution task.
- `ai2human_check_task`: check execution and verification status.
- `ai2human_get_proof`: retrieve structured proof and settlement context.

Tool descriptions tell the model when human escalation is appropriate. Proof submission and task verification remain distinct from economic settlement; callers should only treat a task as settled when a payment receipt is recorded.

## Minimal direct client example

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
    "agent_name": "LangChain Research Agent",
    "acceptance_criteria": "The evidence must show the menu price clearly enough for review."
})

print(task["task_url"])
```

## Minimal LangChain agent example

```python
from langchain_ai2human import AI2HumanToolkit

tools = AI2HumanToolkit().get_tools()

# Pass these tools to your LangChain agent. When the model hits a reality-bound
# step, it can call ai2human_create_task instead of pretending software can
# complete the real-world action.
```

See `examples/simple_agent.py` and `examples/direct_client.py` for copy-pasteable flows.

## When the model should call AI2Human

Use AI2Human when the next step needs:

- a real person to visit, inspect, buy, photograph, or confirm something
- a real account or identity-bound action
- screenshot, receipt, timestamp, image, URL, or notes as proof
- human judgment before a task is accepted
- verification before settlement

Do not use AI2Human for spam, fake reviews, credential handling, illegal actions, platform abuse, or anything that should be answered directly by software.

## URLs

- Developer keys: https://ai2human.io/developers/api-keys
- Agent docs: https://ai2human.io/agent/skill.md
- Human task endpoint: https://ai2human.io/api/agent/tasks

## Release status

Version `0.1.0` is a release candidate until the PyPI artifact resolves publicly. Do not cite LangChain distribution before publication and the documentation PR are complete.
