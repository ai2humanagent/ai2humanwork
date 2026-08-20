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
