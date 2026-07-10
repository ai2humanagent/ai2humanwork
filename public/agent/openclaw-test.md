# OpenClaw Test: AI2Human Agent Skill

## Fastest Test

Paste this into OpenClaw after storing your key privately as `AI2HUMAN_AGENT_KEY`:

```text
Read https://ai2human.io/agent/skill.md.

Use my AI2Human API key from AI2HUMAN_AGENT_KEY.

Create a safe test task for my project. Use:
- requesterName: Demo Project
- requesterHandle: @demoproject
- targetUrl: https://x.com/ai2humannetwork/status/2068623421785673960
- budget: 1 USDC
- deadline: 24h
- environment: test
- fundingMode: test_no_payout
- brief: Follow the project and submit screenshot proof.

First preview it. Tell me what will be created. Only after I reply “yes”, create and publish the test task. Do not create a real reward pool or send payouts.
```

This creates a test task only. It cannot create a PrizePool, notify users, or send USDC.

Use this prompt to test whether OpenClaw can understand and use the AI2Human Agent Skill.

```text
Read the AI2Human Agent Skill:
https://ai2human.io/agent/skill.md

Then test the safe campaign flow.

Goal:
Create an authenticated no-payout test campaign preview and test task for AI2Human.

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

Use my AI2Human API key as:

`x-agent-api-key: <YOUR_KEY>`

If I have not provided a key, stop and direct me to:
https://ai2human.io/developers/api-keys

The payload is safe because it uses:
- environment: test
- fundingMode: test_no_payout

After preview succeeds, ask me before creating. If I say yes, call:
POST https://ai2human.io/api/agent/campaigns

After the authenticated test draft is created, publish that test task with:
POST https://ai2human.io/api/agent/campaigns/{taskId}/publish

Use the same `x-agent-api-key` header. Then return the task URL and published status. Do not create production campaigns, managed PrizePools, funding invoices, or payouts.

Return:
1. readyToCreate
2. readyToPublish
3. missingInputs
4. nextQuestions
5. fundingPlan
6. the exact payload you would use for draft creation
7. after creation, taskId and ai2humanUrl
8. after test publish, publishedAt and final task URL
```

Expected behavior:

- OpenClaw should read the skill.
- OpenClaw should build a requester-specific payload.
- OpenClaw should call the preview endpoint first.
- OpenClaw must require an API key before preview or creation.
- OpenClaw should publish only the authenticated `test_no_payout` task after explicit confirmation.
- OpenClaw should not invent links or budgets.
- OpenClaw should not create/publish production campaigns without explicit confirmation and credentials.

Human-readable console:

```text
https://ai2human.io/agent/skill-console
```
