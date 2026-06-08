# Article Contest Readiness Notes

These items are intentionally deferred while the current article contest remains a test campaign.
Before a production article contest, complete them before opening submissions or funding payouts.

## Production blockers

1. Disable test-only X binding bypass
   - Current test tasks matching `x-article-contest-test-*` can bypass bound X checks.
   - Production campaigns must require the submitted X URL author to match the wallet's bound X account.

2. Add payout-time winner validation
   - `Pay Winners` should recompute the current minimum score and valid prize slots before sending funds.
   - Payout must reject stale winners from old review runs.

3. Add result lock/confirm flow
   - Review results should move through `Draft review -> Confirm winners -> Lock report -> Pay winners`.
   - Once locked, re-review should require an explicit admin unlock action.

## Fixed in current iteration

- Admin and public report now derive an article contest lifecycle instead of showing raw `ai_failed / open`.
- Review now closes the task state when admin runs article review.
- Public copy now explains that live X embed/API text is preferred and submitted snapshots are fallback only.
- User-facing report/admin/task dates are formatted as Hong Kong time (UTC+08:00).
