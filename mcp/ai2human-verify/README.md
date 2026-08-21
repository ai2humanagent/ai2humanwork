# @ai2human/verify-mcp

AI2Human verification engine as an MCP server. One tool (`verify_claim`) turns any claim + evidence into a verdict and a verifiable receipt, driven by a policy registry — not one skill per scenario.

Design docs:
- [verification-engine-primitives.md](../../docs/strategy/verification-engine-primitives.md)
- [verification-policies.md](../../docs/strategy/verification-policies.md)
- [verify-claim-interface.md](../../docs/strategy/verify-claim-interface.md)

## Tools

| Tool | Description |
| --- | --- |
| `verify_claim` | Run the verification chain for a claim type against an evidence bundle → verdict + receipt |
| `get_verification` | Look up a verification by id (polling after `manual_review`) |
| `list_policies` | List available claim types, levels, and required evidence |

## Policies (claimType)

| claimType | Level | What it verifies |
| --- | --- | --- |
| `x_post_claim` | L2 | Live X post exists, author matches, hashtags/mentions/keywords present |
| `wallet_claim` | L2 | On-chain wallet balance / holder / transaction success (Base or Ethereum) |
| `delivery_confirmed` | L3 | Generic delivery claim: capture time, image hashes, GPS plausibility, delivery reference (mock service) |
| `eligibility_check` | L3 | Community program eligibility: active membership (mock registry) + public post with required signals + one-claim-per-account dedupe |

## Example

```jsonc
{
  "claimType": "delivery_confirmed",
  "evidence": {
    "identity": { "accountId": "rider_1024" },
    "time": { "capturedAt": "2026-08-20T12:30:00Z" },
    "location": { "gps": { "lat": 31.23, "lng": 121.47 } },
    "content": { "referenceId": "ORD-1001", "imageHashes": ["sha256:..."] },
    "process": { "source": "in_app_capture" }
  }
}
```

Result: `verdict: "pass"` with a `receipt` (claimHash + evidenceHash + checksHash + signer + timestamp). Failures return `fail`; missing evidence returns `resubmit` with the missing dimensions; uncertain checks return `manual_review`.

## Run

```bash
npm install
npm test        # engine smoke tests (real X post + real on-chain check + mock delivery)
npm run dev     # start MCP server over stdio
```

## Hosted API (developer usage)

The same engine is exposed as an HTTP API in the web app:

```bash
# 1. List available policies
curl https://ai2human.work/api/v1/verify/policies \
  -H "Authorization: Bearer $VERIFY_API_KEY"

# 2. Verify a claim
curl -X POST https://ai2human.work/api/v1/verify_claim \
  -H "Authorization: Bearer $VERIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "claimType": "eligibility_check",
    "evidence": {
      "identity": { "accountId": "acct_alice" },
      "content": { "url": "https://x.com/BasecatOnBase/status/2089239292522443175" }
    },
    "config": { "requiredHashtags": ["#BASECAT"], "contentKeywords": ["moon"] }
  }'
```

Response: the full verification record — `verdict` (`pass | fail | resubmit | manual_review`), per-check results, missing evidence, and a self-contained `receipt` (claim/evidence/checks hashes + signer + timestamp). Verdicts are returned with HTTP 200 (they are results, not errors); `400` = unknown `claimType`, `401` = invalid key.

Set `VERIFY_API_KEY` (comma-separated keys via `VERIFY_API_KEYS`) in the app environment. Receipts are self-contained — store them in your own system; record persistence (lookup by id) is the next milestone.

### Try it without signing up

Set `VERIFY_DEMO_KEY` in the app environment, and anyone can try two policies (rate-limited per IP):

```bash
curl -X POST https://ai2human.work/api/v1/verify_claim \
  -H "Authorization: Bearer $VERIFY_DEMO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "claimType": "delivery_confirmed",
    "evidence": {
      "time": { "capturedAt": "2026-08-20T12:30:00Z" },
      "location": { "gps": { "lat": 31.23, "lng": 121.47 } },
      "content": {
        "referenceId": "ORD-1001",
        "imageHashes": ["sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
      },
      "process": { "source": "in_app_capture" }
    }
  }'
```

Demo key is restricted to `eligibility_check` and `delivery_confirmed` (mock evidence sources, deterministic). Full keys unlock all policies.

## Connect from an MCP client

```jsonc
{
  "mcpServers": {
    "ai2human-verify": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp/ai2human-verify/src/server.ts"]
    }
  }
}
```

## Notes

- Evidence has six dimensions: `identity / time / location / content / process / corroboration`.
- The verification chain is the same everywhere: capture → integrity → authenticity → consistency → judgment → anchor.
- `delivery_confirmed` uses a mock evidence service; swap `checkDeliveryReference` for a real carrier API in production.
- v1 receipts are signed JSON (hash bundle); on-chain anchoring / EAS is a later milestone.
