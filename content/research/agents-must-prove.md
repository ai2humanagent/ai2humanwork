Agents are great at claiming things. "Your package is delivered." "The order is placed." "The ticket is resolved." Sometimes those claims are true. Sometimes the agent just… decided they were true. The most famous failure mode of the current agent stack isn't capability — it's that **an agent's word is its own verification**.

This is about to become a liability. Agents are moving from chat to actions: they'll file refunds, dispatch deliveries, sign off on compliance, release bounties, settle invoices. The moment an agent's claim gates money or an irreversible action, "trust me, I did it" stops being a UX quirk and becomes a financial hole.

We think the fix isn't better prompting. It's a missing primitive: **the ability to prove a claim — and a receipt you can keep.**

## Why self-verification is structurally broken

You cannot make an LLM verify its own output reliably. Three reasons, none of which better prompting fixes:

1. **Same blind spots.** The verifier is the same system that made the claim. If the model hallucinated a delivery confirmation, it will hallucinate the verification of it with equal confidence.
2. **Adversarial pressure.** In rewards, bounties, and refunds, someone is incentivized to cheat. An LLM judge is just another target — prompt it, social-engineer it, or flood it.
3. **No receipt.** Even a correct "yes" is a token string. There's nothing another system can hold, store, and independently re-check.

So we built the thing that's missing: **`verify(claim, evidence) → verdict + receipt`** — a verification engine that treats "prove it" as a primitive, not a feature.

## Evidence has six dimensions. That's the whole ontology.

We stopped designing per-scenario checks and decomposed evidence itself:

| Dimension | Question |
| --- | --- |
| identity | Who did it? |
| time | When — is it fresh? |
| location | Where did it happen? |
| content | What's the artifact (text, photo hash, URL)? |
| process | How was it captured (device, source)? |
| corroboration | Who else confirms it (systems, sensors, people)? |

Every scenario on earth is a subset of these six. A delivery claim is `identity + time + location + content + corroboration`. An eligibility claim is `identity + content + dedupe`. A fact claim is `content + corroboration`. We've gone through dozens of real use cases and never needed a seventh dimension — which is the strongest evidence that this is the right cut.

## Every check runs the same six-step chain

```text
capture → integrity → authenticity → consistency → judgment → anchor
```

- **capture**: evidence must be collected at the time and place of the claim. A photo uploaded from the gallery isn't evidence; a photo taken in the app is.
- **integrity**: hashes, metadata, EXIF — was it tampered with?
- **authenticity**: is it what it claims to be? Author matches the account? AI-generated detection on photos? Trusted capture source?
- **consistency**: does it agree with other evidence? GPS within 50m of the delivery point? Capture time within the delivery window? Same photo reused by five people?
- **judgment**: when rules are ambiguous, escalate — to a rubric-scored model review, then to a human. Rules first, models only where judgment is genuinely needed.
- **anchor**: bind the verdict, the evidence hashes, and the checks into a receipt.

Each step is an attack model: fake GPS, reused photos, AI-generated "handmade" content, sybil clusters, timestamp tampering. The chain is how we make each one expensive.

## Assurance levels: the generalization that makes this composable

Per-scenario policies are a trap — fifty scenarios means fifty bespoke systems. Instead we parameterize by assurance level:

| Level | What it means | When |
| --- | --- | --- |
| L1 | Self-attested | Low stakes |
| L2 | Tool-verified (deterministic checks) | Digital facts |
| L3 | Evidence-backed (time + place + content + cross-check) | Real-world actions |
| L4 | Human-verified (rubric + operator review) | High value, ambiguous |
| L5 | Adjudicated (dispute resolution with a decision record) | Money, disputes |

A scenario is just a level plus a subset of evidence dimensions. The engine, the chain, and the receipt stay the same. This is the difference between building 50 tools and building one engine with 50 configurations.

## The receipt is the product

The verdict is useful; the receipt is what makes it trustworthy. It's self-contained:

```json
{
  "receiptId": "r_8f2a…",
  "claimHash": "sha256:…",
  "evidenceHash": "sha256:…",
  "checksHash": "sha256:…",
  "verdict": "pass",
  "signer": "ai2human-verify",
  "issuedAt": "2026-08-20T12:31:05Z"
}
```

Anyone holding it can recompute the hashes and verify the claim was verified — without asking us. That's what makes receipts composable: one agent's verified claim becomes another agent's trusted input. This is the direction of travel — signed, anchored receipts so the credential survives across systems, not just within ours.

## What the agent integration actually looks like

We exposed the engine as an **MCP server** — which means it works in every framework that speaks MCP: OpenAI Agents SDK, Claude, LangChain, whatever comes next. One server, all frameworks.

The important insight is the **two-layer enforcement**:

```python
@function_tool
def finalize_delivery(order_ref, captured_at, gps_lat, gps_lng, image_hash):
    record = run_delivery_verification({...})
    if record["verdict"] != "pass":
        return refused(record)          # no receipt, no finalize
    return finalized(record["receipt"]) # pass carries the receipt
```

The tool re-runs the deterministic verification and refuses without a pass. That's the binding layer. On top of it, an output guardrail trips if the agent's final answer claims completion without a receipt:

```python
if "finalized" in output and "receiptId" not in output:
    return GuardrailFunctionOutput(tripwire_triggered=True, ...)
```

Why both? Because a guardrail only sees text and only runs on final output — by the time it trips, the agent may have already spent tokens and called other tools. The tool-level check is the actual gate; the guardrail is the visible one. Most "verification" demos show one layer; the failure cases are exactly in the gap between them.

## This is the value, and it's bigger than one API

What's real today:

- **X post claims** in production: fetch the live post, verify author, hashtags, keywords, freshness. This isn't a demo — campaigns run on it.
- **Eligibility checks**: active membership + public post + one-claim-per-account dedupe.
- **Delivery claims**: the full six-step chain (mock evidence service for now — swap in a carrier API).
- **A hosted API**: `POST /api/v1/verify_claim`, API-key auth, full record with receipt. A developer's entire integration is one curl.

```bash
curl -X POST https://ai2human.work/api/v1/verify_claim \
  -H "Authorization: Bearer $VERIFY_API_KEY" \
  -d '{"claimType":"eligibility_check","evidence":{...},"config":{...}}'
```

And the metric that matters most: **verification reports**. After a campaign, you publish the numbers — submitted, passed, rejected, and *why*. "1,284 submitted → 1,102 passed → 182 rejected: 94 missing keywords, 51 not registered, 37 duplicates." That report is the product demo, the anti-fraud proof, and the marketing, all at once. Numbers like that are the strongest possible evidence that "prove it" isn't a slogan — it's a pipeline.

## The honest gaps

Delivery verification runs against a mock source until we integrate a real carrier API. Receipts are hashed but not yet signed or anchored to durable storage. Lookup-by-id persistence is next. And yes — we opened a PR to the OpenAI Agents SDK with the example; it was closed. We don't need acceptance to keep building the pattern in the open.

## The thesis

The bottleneck for agents isn't intelligence anymore — it's trust. An agent that can act but can't prove is a liability; an agent that can act *and prove* is infrastructure. We're building the layer where **"done" stops being a model's opinion and becomes a verifiable fact** — six evidence dimensions, one chain, five assurance levels, and a receipt you can keep. If you're building agents that will ever touch money, actions, or the real world, the question isn't whether you need this. It's whether your agent can answer it.

**"Prove it." — now it's a primitive.**
