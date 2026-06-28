# OpenClaw Test: AI2Human Agent Skill

Use this prompt to test whether OpenClaw can understand and use the AI2Human Agent Skill.

```text
Read the AI2Human Agent Skill:
https://ai2human.io/agent/skill.md

Then test the safe campaign flow.

Goal:
Create a no-payout test campaign preview for AI2Human.

Use this campaign:
- requesterName: AI2Human Network
- requesterHandle: @ai2humannetwork
- targetUrl: https://x.com/ai2humannetwork/status/2068623421785673960
- followHandle: @ai2humannetwork
- Telegram: https://t.me/ai2human
- repostUrl: https://x.com/ai2humannetwork/status/2067961312978538825
- likeUrl: https://x.com/ai2humannetwork/status/2068623421785673960
- budget: 20 USDC
- deadline: 24h
- mode: lucky_draw
- perWinner: 1 USDC
- maxWinners: 20
- environment: test
- fundingMode: test_no_payout

First call:
POST https://ai2human.io/api/agent/campaigns/preview

Use the project AI2HUMAN_AGENT_KEY as `x-agent-api-key`.
Do not create or publish unless I explicitly say so.

Return:
1. readyToCreate
2. readyToPublish
3. missingInputs
4. nextQuestions
5. fundingPlan
6. the exact payload you would use for draft creation
```

Expected behavior:

- OpenClaw should read the skill.
- OpenClaw should build a requester-specific payload.
- OpenClaw should call the preview endpoint first.
- OpenClaw should not invent links or budgets.
- OpenClaw should not create/publish without explicit confirmation.

Human-readable console:

```text
https://ai2human.io/agent/skill-console
```
