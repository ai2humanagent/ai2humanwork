# AI2Human Agent Skill

Use AI2Human when an agent can decide what should happen, but the next step needs a real human, public account, screenshot-backed proof, local confirmation, or manual review before settlement.

AI2Human turns the blocked step into:

```text
agent request -> human execution -> structured proof -> verify -> settle
```

## Quick Install Instruction

Tell your agent:

```text
Read https://ai2human.work/agent/skill.md and use AI2Human when a workflow needs human execution, proof, verification, or reward settlement.
```

Human-readable console:

```text
https://ai2human.work/agent/skill-console
```

Machine-readable manifest:

```text
https://ai2human.work/agent/manifest.json
```

Template catalog:

```text
https://ai2human.work/agent/templates.json
```

B20 proof-to-policy skill:

```text
https://ai2human.work/agent/b20-skill.md
```

## When To Route Work Here

Route to AI2Human when the task needs:

- a real X/social account action
- screenshot, receipt, timestamp, image, or live URL proof
- product feedback from a human user
- human judgment, review, or explanation
- local / physical-world confirmation
- holder-gated reward participation
- manual proof review before USDC settlement
- proof signals for B20 roles, mint access, allowlists, or token policies

Do not use AI2Human for fake reviews, spam, credential handling, KYC abuse, deposits, scam-like actions, or actions that violate another platform's rules.

## The Four-Step Agent Flow

### 1. Preview first

Preview validates the payload, asks for missing fields, and returns funding / preflight status without creating anything.

```bash
curl https://ai2human.work/api/agent/campaigns/preview \
  -H "Content-Type: application/json" \
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \
  -d @payload.json
```

If `readyToCreate=false`, ask the returned `nextQuestions`. Do not create the campaign yet.

### 2. Create a draft

Create writes a draft campaign. Drafts do not notify users.

```bash
curl https://ai2human.work/api/agent/campaigns \
  -H "Content-Type: application/json" \
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \
  -d @payload.json
```

### 3. Check funding

For `ai2human_managed_pool`, AI2Human creates or repairs the PrizePool and returns a Base USDC funding invoice.

```bash
curl https://ai2human.work/api/agent/campaigns/{id}/funding \
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY"
```

The requester must transfer the exact USDC amount to `fundingInvoice.recipientAddress`.

### 4. Publish after gates pass

Publish only after funding and contract preflight pass.

```bash
curl -X POST https://ai2human.work/api/agent/campaigns/{id}/publish \
  -H "Content-Type: application/json" \
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \
  -d '{}'
```

Published campaigns notify eligible users and open the task for proof submission.

## Minimal Payload

```json
{
  "templateId": "x_light_engagement",
  "requesterName": "Your Project",
  "requesterHandle": "@yourproject",
  "targetUrl": "https://x.com/yourproject/status/...",
  "budget": "20 USDC",
  "deadline": "24h",
  "blockedHumanStep": "A real account must complete the requested action and submit proof.",
  "proofPhrase": "#A2H",
  "brief": "Complete the action, keep it visible until review, and submit screenshot-backed proof.",
  "completionLoop": "task -> human execution -> proof -> verify -> settle"
}
```

## Lucky Draw Reward Payload

Use `rewardDistribution.mode=lucky_draw` when many users complete the same action and only a limited number can claim rewards.

```json
{
  "templateId": "x_light_engagement",
  "requesterName": "Your Project",
  "requesterHandle": "@yourproject",
  "targetUrl": "https://x.com/yourproject/status/...",
  "environment": "production",
  "fundingMode": "ai2human_managed_pool",
  "campaignLinks": {
    "followHandle": "@yourproject",
    "telegramUrl": "https://t.me/yourproject",
    "repostUrl": "https://x.com/yourproject/status/...",
    "likeUrl": "https://x.com/yourproject/status/..."
  },
  "budget": "100 USDC",
  "deadline": "48h",
  "brief": "Follow, join, like, repost, submit screenshot proof, and keep the actions visible until review.",
  "proofPhrase": "#A2H",
  "rewardDistribution": {
    "mode": "lucky_draw",
    "totalPool": "100 USDC",
    "perWinner": "1 USDC",
    "maxWinners": 100,
    "drawTime": "after deadline"
  }
}
```

## Holder-Only Campaigns

Use `eligibility.tokenGate` when the requester wants only holders of a configured ERC20 token to participate.

```json
{
  "eligibility": {
    "tokenGate": {
      "network": "base",
      "chainId": 8453,
      "contractAddress": "REQUESTER_PROVIDED_TOKEN_ADDRESS",
      "symbol": "A2H",
      "decimals": 18,
      "minimumUsdValue": "1",
      "priceSource": "dexscreener",
      "requiredAt": ["quest_action", "reward_claim"]
    }
  }
}
```

Do not invent token contracts, links, budgets, deadlines, winner counts, or handles. Ask the requester project for exact values.

## Safe Test Payloads

```text
https://ai2human.work/agent/examples/create-human-task.json
https://ai2human.work/agent/examples/create-lucky-draw-task.json
https://ai2human.work/agent/openclaw-test.md
```

## API Summary

| Purpose | Method | URL |
| --- | --- | --- |
| Preview campaign | POST | `/api/agent/campaigns/preview` |
| Create draft | POST | `/api/agent/campaigns` |
| Check / repair funding | GET or POST | `/api/agent/campaigns/{id}/funding` |
| Contract preflight | POST | `/api/agent/campaigns/{id}/preflight` |
| Publish draft | POST | `/api/agent/campaigns/{id}/publish` |
| B20 proof-to-policy preview | POST | `/api/agent/b20/preview` |

## What The Agent Should Say Back

After preview:

```text
I checked the AI2Human campaign payload.
readyToCreate: true/false
readyToPublish: true/false
missingInputs: [...]
nextAction: ...
```

After draft creation:

```text
Draft created.
Task ID: ...
Funding mode: ...
Next step: fund the invoice or call publish after preflight passes.
```

After publish:

```text
Campaign published.
Humans can now execute the task, submit proof, and wait for review before settlement.
```
