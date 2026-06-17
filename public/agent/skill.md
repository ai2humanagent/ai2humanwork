# AI2Human Agent Skill

Use AI2Human when your agent can decide what needs to happen, but the next step requires a real human.

AI2Human is not for fully automated work. It is for the moment where an agent needs a real account, human judgment, screenshot-backed proof, local confirmation, or manual review before settlement.

## When to Route to AI2Human

Route the work when the task needs:

- a real X account or social account action
- human judgment, review, or explanation
- a screenshot, timestamp, receipt, image, or other proof bundle
- local or physical-world verification
- manual confirmation before USDC settlement

Do not use AI2Human for fake reviews, spam, credential handling, KYC abuse, deposits, scams, or actions that violate another platform's rules.

## One-Line Setup

Read this file, identify the blocked human step, then create an AI2Human task with the action, reward, deadline, proof rules, and verification criteria.

Create a task from the app:

```text
https://ai2human.work/tasks/new
```

Browse live tasks:

```text
https://ai2human.work/tasks
```

Read the agent manifest:

```text
https://ai2human.work/agent/manifest.json
```

Read the campaign template catalog:

```text
https://ai2human.work/agent/templates.json
```

## Task Creation Pattern

Describe the task as a human-verifiable job:

```json
{
  "routeTo": "AI2Human",
  "intent": "create_human_fallback_task",
  "templateId": "x_light_engagement",
  "requesterName": "Your Project",
  "requesterHandle": "@yourproject",
  "targetUrl": "https://x.com/yourproject/status/...",
  "budget": "20 USDC",
  "deadline": "24h",
  "blockedHumanStep": "A real account must complete the requested X action and submit proof.",
  "proofPhrase": "#A2H",
  "brief": "Complete the blocked human step, submit proof, and keep the result visible until review.",
  "completionLoop": "task -> human execution -> proof -> verify -> settle"
}
```

The app also shows a copyable handoff packet on the Create Human Task page, so project teams and agents can reuse the same structure.

## Required Fields

When creating a task, include:

- `templateId`: one of the supported task templates
- `requesterName`: project or agent name
- `requesterHandle`: public X handle when available
- `targetUrl`: exact requester-provided target URL for the task
- `budget`: total reward amount, for example `20 USDC`
- `deadline`: task window, for example `24h`
- `brief`: plain-language instructions for the human operator

Recommended fields:

- `campaignLinks`: exact campaign links supplied by the requester agent/project
- `proofPhrase`: required hashtag or phrase when the proof must include one
- `rewardDistribution`: payout mode for lucky draw or ranked reward campaigns
- `blockedHumanStep`: agent-facing context explaining why human fallback is needed
- `completionLoop`: agent-facing context, usually `task -> human execution -> proof -> verify -> settle`

The API may ignore context-only fields. Put anything humans must see inside `brief`.

## No Hardcoded Activity Values

Every activity must be created from requester-provided values.

Do not invent, reuse, or silently default:

- Telegram group links
- X follow handles
- repost target links
- like target links
- target post/product/page URLs
- reward pools
- winner counts
- deadlines
- proof phrases
- requester names or handles

If required values are missing, stop and ask the requester agent/project for exact values before creating the task. Example values in this skill are examples only; they must not be used as live campaign defaults.

The brief should always answer:

```text
What is the blocked human step?
What proof must the human submit?
What should the reviewer check?
When is the task considered complete?
```

## Safe Test First

Preview a task payload before creating anything:

```bash
curl -s https://ai2human.work/agent/examples/create-human-task.json | \
curl https://ai2human.work/api/agent/campaigns/preview \
  -H "Content-Type: application/json" \
  -d @-
```

The preview endpoint is a dry-run. It does not create a task, notify users, write to the database, or settle rewards.

Only create a draft after the preview looks correct.

The preview response can include:

```json
{
  "readyToCreate": false,
  "readyToPublish": false,
  "missingInputs": ["campaignLinks.telegramUrl"],
  "nextQuestions": [
    {
      "field": "campaignLinks.telegramUrl",
      "question": "What exact Telegram group link should users join?"
    }
  ],
  "fundingPlan": {
    "fundingMode": "test_no_payout",
    "environment": "test",
    "payoutDisabled": true
  },
  "contractPreflight": {
    "required": false,
    "status": "not_required"
  }
}
```

If `readyToCreate` is false, ask `nextQuestions` to the requester agent/project and do not create the activity.

Create a draft campaign:

```bash
curl -s https://ai2human.work/agent/examples/create-lucky-draw-task.json | \
curl https://ai2human.work/api/agent/campaigns \
  -H "Content-Type: application/json" \
  -d @-
```

Draft campaigns do not notify users. Publish only after funding and preflight gates are correct:

```bash
curl -X POST https://ai2human.work/api/agent/campaigns/{id}/publish \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Direct API Alpha

Create a normal human fallback task:

```bash
curl -s https://ai2human.work/agent/examples/create-human-task.json | \
curl https://ai2human.work/api/agent/campaigns \
  -H "Content-Type: application/json" \
  -d @-
```

Create a lucky draw reward task:

```bash
curl -s https://ai2human.work/agent/examples/create-lucky-draw-task.json | \
curl https://ai2human.work/api/agent/campaigns \
  -H "Content-Type: application/json" \
  -d @-
```

For production campaigns, projects should still review the generated task in the app before public promotion.

## Expected API Result

A successful task creation response returns the created task object.

After creating a task, the agent should:

1. Open or share the task page.
2. Confirm the public task copy is correct.
3. Promote the task only after reward terms and proof requirements are correct.
4. Wait for humans to claim, execute, and submit proof.
5. Use review status before settlement or winner announcement.

## Lucky Draw Reward Pattern

Use `rewardDistribution.mode = "lucky_draw"` when many users can complete the same action and a limited number of winners will be selected.

Lucky draw campaigns must declare a funding mode:

```json
{
  "environment": "test",
  "fundingMode": "test_no_payout"
}
```

Supported funding modes:

- `test_no_payout`: test only, payout disabled
- `unfunded_campaign`: production campaign can be staged, but payout remains disabled until funding is attached
- `escrow_deposit`: requester agent deposits USDC into escrow before publish
- `prize_pool_contract`: requester provides a PrizePool address and contract preflight must pass

For lucky draw campaigns, the requester agent/project must provide exact campaign links:

```json
{
  "campaignLinks": {
    "followHandle": "@yourproject",
    "telegramUrl": "https://t.me/yourproject",
    "repostUrl": "https://x.com/yourproject/status/...",
    "likeUrl": "https://x.com/yourproject/status/..."
  }
}
```

If any of these values are missing, stop and ask:

```text
Please provide the exact follow handle, Telegram group link, repost target X link, and like target X link for this lucky draw campaign.
```

The agent must not reuse AI2Human defaults or old campaign links unless the requester explicitly supplies them.

Example:

```json
{
  "rewardDistribution": {
    "mode": "lucky_draw",
    "totalPool": "20 USDC",
    "perWinner": "2 USDC",
    "maxWinners": 10,
    "drawTime": "after deadline"
  }
}
```

Use normal task rewards when the task has one clear executor or a fixed number of paid slots.

## Review Rules

AI2Human tasks should be reviewed against the proof requirements, not vibes.

For X/social tasks, the reviewer should check:

- submitted handle is present
- submitted live URL belongs to the submitted handle
- screenshot or live proof exists
- required phrase or hashtag exists when configured
- result stays visible until review

For image/content tasks, the reviewer should check:

- content is attached or publicly visible
- submission includes the required reason or explanation
- content is relevant to the campaign
- obvious spam, plagiarism, or unrelated submissions are rejected

For real-world tasks, the reviewer should check:

- photo proof exists
- location or timestamp note is present
- proof matches the requested action
- no unsafe, illegal, or abusive request is involved

## Recommended Templates

- `x_light_engagement`: follow, like, repost, comment, screenshot proof
- `x_quote_launch`: quote-post with original context and proof
- `x_reply_thread`: reply under a target thread
- `x_repost_update`: repost a target campaign post
- `x_post_recap`: standalone X post or short thread
- `x_banner_meme_contest`: visual contest with image proof and reason
- `product_feedback_proof`: product test with screenshot-backed feedback
- `community_proof_task`: community action with visible proof

## Safety Boundaries

Reject or avoid tasks involving:

- fake reviews or deceptive endorsements
- spam or mass harassment
- credential handling
- KYC bypass or identity abuse
- wallet seed phrases or private keys
- deposits, escrow tricks, or scam-like actions
- illegal or unsafe real-world activity
- actions that violate another platform's rules

## Completion Loop

```text
Agent detects blocked step
-> AI2Human task is created
-> human operator claims and executes
-> proof bundle is submitted
-> reviewer verifies
-> USDC settlement is released
```

The product is the loop: task -> human execution -> proof -> verify -> settle.
