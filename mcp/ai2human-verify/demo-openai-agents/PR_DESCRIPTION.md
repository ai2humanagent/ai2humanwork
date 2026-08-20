# PR Description

**Title:** examples: add verification guardrail example (verify before act)

**Body:**

Agents often claim completion without proof ("your package is delivered") — a well-known hallucination failure. This example shows a generic, framework-native pattern to close that gap:

- A minimal MCP server exposes `verify_claim(claimType, evidence)`
- An output guardrail trips when the agent claims "done" without a passed verification receipt
- The `finalize_delivery` tool refuses to run unless deterministic verification passes (guardrail + tool-level enforcement)

The scenario (delivery confirmation) is intentionally generic and runs with a mock evidence service — no API keys beyond the standard OpenAI model call, no web3. It demonstrates the `verify before act` pattern that any agent team can adapt by swapping in their own verifier.

Verified locally: `demo.py` runs both the pass and blocked paths; the guardrail direct check trips as expected.
