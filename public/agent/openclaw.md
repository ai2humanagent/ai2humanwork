# Launch an Official AI2Human Campaign from OpenClaw

Use this guide when a project wants OpenClaw to publish a real AI2Human reward campaign.

OpenClaw must never use placeholder project names, handles, links, budgets, or deadlines. It must collect them from the project owner first.

## Paste This into OpenClaw

```text
Read https://ai2human.io/agent/skill.md.

Use my AI2Human API key from AI2HUMAN_AGENT_KEY.

I want to publish an official production reward campaign. Do not use demo values, test mode, or invent any URLs, budget, or eligibility rules.

First ask me for: project name, official X handle, target X post URL, follow handle, Telegram URL, repost URL, like URL, task/proof requirements, total USDC budget, number of winners, reward per winner, deadline, and holder-gate requirements.

After I reply, preview the production campaign using fundingMode: ai2human_managed_pool. Show the complete campaign summary. Wait for my confirmation before creating a draft.

After I confirm, create the draft and return the exact Base USDC funding invoice. Wait until I confirm the transfer. Verify funding, then ask once more before publishing. Never publish before funding and my final confirmation.
```

## What OpenClaw Must Collect

| Required input | Example |
| --- | --- |
| Project name and official X handle | `AI2Human Network`, `@ai2humannetwork` |
| Target post URL | Exact X post users will act on |
| Required social links | Follow handle, Telegram, repost URL, and like URL |
| Task and proof rules | What users must do and which proof is required |
| Reward design | Total USDC, reward per winner, number of winners, distribution method |
| Deadline | Exact time window or timestamp |
| Eligibility | Open campaign or an exact token-holder gate |

## Official Launch Sequence

1. `Preview`: OpenClaw validates every input and shows the campaign summary. Nothing is created.
2. `Create draft`: only after the owner confirms. AI2Human creates the managed Base PrizePool.
3. `Fund`: OpenClaw calls the funding endpoint and returns the exact `fundingInvoice.recipientAddress`, `amount`, `USDC` token, and Base network details. The owner transfers the exact amount.
4. `Verify funding`: OpenClaw checks the PrizePool preflight again. It must report that funding is ready.
5. `Publish`: only after the owner gives final confirmation. Users can then complete the task and submit proof.

Production campaigns use:

```text
environment: production
fundingMode: ai2human_managed_pool
```

The managed PrizePool is created only after the draft is confirmed. This is why no Base USDC transfer address exists during the first preview.

## Important Rules for the Agent

- Never create a test campaign unless the owner explicitly asks for a technical test.
- Never infer a project handle, X URL, Telegram URL, deadline, budget, winner count, or eligibility rule.
- Never publish before the owner has confirmed the final campaign summary and confirmed the PrizePool funding transaction.
- Never expose `AI2HUMAN_AGENT_KEY` in a chat, task description, X post, or API response.
