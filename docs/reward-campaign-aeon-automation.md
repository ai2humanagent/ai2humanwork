# AI2Human Reward Campaign Aeon Automation

This note records the production automation path for AI2Human lucky draw and reward campaign lifecycle checks.

## Why this exists

Reward campaign state should not depend on a human manually opening the admin page after the final claim or deadline. A finished campaign needs to move into a clear terminal state automatically:

- `paid/full/completed` when all winner slots are paid.
- `closed` when the deadline has passed and no more claims should be accepted.
- `refunded` only through the explicit refund/recovery flow.

The production app now exposes a protected reconciler endpoint. Aeon should call it on a short interval and notify the operator when it changes campaign state.

## Production endpoint

```text
GET https://ai2human.work/api/cron/reward-campaigns
```

Required auth in production:

```text
x-cron-secret: <CRON_SECRET>
```

or:

```text
Authorization: Bearer <CRON_SECRET>
```

The endpoint returns JSON:

```json
{
  "success": true,
  "checkedAt": "2026-06-21T08:00:00.000Z",
  "updated": 1,
  "updates": [
    {
      "taskId": "lucky-draw-event-003-a2h-holder-3usdc-test",
      "action": "marked_full",
      "paidCount": 3,
      "maxWinners": 3
    }
  ]
}
```

## What the app reconciler checks

The app-side reconciler is authoritative because it has direct access to the production task database.

For each reward task with `rewardDistribution.mode` in `lucky_draw`, `fcfs`, or `equal`, it checks:

- Campaign deadline.
- Current `taskState`.
- Paid claim count from `payments`.
- `maxWinners` from `rewardDistribution`.
- PrizePool claim payments for pool-backed lucky draws.

State changes:

- If `paidCount >= maxWinners`, mark the task as `status: paid`, `taskState: full`, and lifecycle `completed`.
- If the deadline has passed and not all slots are paid, mark the task as `taskState: closed` and lifecycle `closed`.

## Aeon role

Aeon should not duplicate the database logic. Aeon is the watchdog:

1. Call `/api/cron/reward-campaigns` every 5-15 minutes.
2. Retry once on transient network failure.
3. Notify Telegram/admin only when:
   - campaign state changed,
   - the endpoint failed,
   - auth is missing,
   - the endpoint response is malformed.
4. Stay quiet on clean no-op runs.
5. Log each run to Aeon memory for auditability.

## Required Aeon secrets

In the Aeon GitHub repo, add:

```text
AI2HUMAN_CRON_SECRET=<same value as OmniClaw CRON_SECRET>
TELEGRAM_BOT_TOKEN=<optional, existing Aeon notification secret>
TELEGRAM_CHAT_ID=<optional, existing Aeon notification secret>
```

Optional repo variable:

```text
AI2HUMAN_CRON_ENDPOINT=https://ai2human.work/api/cron/reward-campaigns
```

If the variable is missing, the Aeon skill defaults to the production endpoint above.

## Aeon fork implementation

The Aeon fork should add:

```text
skills/ai2human-reward-campaign-reconciler/SKILL.md
aeon.yml entry: ai2human-reward-campaign-reconciler enabled on */5 * * * *
```

Aeon ticks every five minutes. Its scheduler has a dedup window for step schedules, so `*/5` effectively runs this watchdog about every 15 minutes, which is the right cadence for reward campaign closure.

## Manual test

Run this from a trusted shell with production env loaded:

```bash
curl -sS \
  -H "x-cron-secret: $CRON_SECRET" \
  https://ai2human.work/api/cron/reward-campaigns
```

Expected no-op response:

```json
{
  "success": true,
  "updated": 0,
  "updates": []
}
```

Expected update response:

```json
{
  "success": true,
  "updated": 1,
  "updates": [
    {
      "taskId": "...",
      "action": "marked_full"
    }
  ]
}
```

## Current production reference

`lucky-draw-event-003-a2h-holder-3usdc-test` reached the terminal state after the final successful claim:

- `status: paid`
- `taskState: full`
- `paid winners: 3/3`

This is the baseline behavior the Aeon watchdog should preserve for future campaigns.
