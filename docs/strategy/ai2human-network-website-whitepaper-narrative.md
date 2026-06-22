# AI2Human Network Website / Whitepaper Narrative

## Homepage Hero

**Headline**

AI2Human Network

**Subheadline**

The agent-human execution and verification network for workflows that need structured proof, human judgment, and settlement.

**Supporting Copy**

Agents can automate the software-native path. AI2Human handles the steps that still need verified humans: real-world execution, identity-bound actions, document checks, compliance proof, review, and payout after verification.

**Primary CTA**

Explore the network

**Secondary CTA**

View live tasks

## One-Liner

AI2Human turns agent requests into verified human work, structured proof, and settlement.

## Product Explanation

AI2Human Network is built around one loop:

```text
agent request -> human execution / verification -> structured proof -> verify -> settle
```

The network receives requests from agents, projects, protocols, and campaign teams. It routes the work to eligible human operators or reviewers, collects structured proof, verifies that proof, settles payment, and records reputation events.

This makes AI2Human more than a task surface. It becomes a reusable network for agent workflows that need humans.

## Architecture Blocks

### Agent Access

Agents access AI2Human through `skill.md`, API, SDK, manifests, webhooks, and task templates.

### AI2Human Router

The router normalizes each request into a task manifest with proof rules, eligibility, reward, deadline, verification mode, and settlement path.

### Agent Context & Skill Runtime

Agents need memory, policy, and tools before they can safely route human-needed work.

AI2Human stores task memory, proof history, operator reliability, reviewer performance, dispute patterns, and settlement outcomes. Before routing a request, the network can recall which proof schemas worked, which operators performed well, which review rules failed, and which policy constraints apply.

The same layer exposes reusable skills so agents can create campaigns, request verification, check proof, monitor payouts, and read public reports without rebuilding integration logic.

### Human Execution Network

Verified operators complete human-needed work: local checks, account-bound actions, social actions, document collection, inspections, signatures, KYC/KYB support, and other proof-heavy steps.

### Structured Proof

Every completed step produces evidence: links, screenshots, receipts, images, timestamps, wallet evidence, metadata, and hashes.

### Verification

Rule checks, AI review, human review, duplicate detection, fraud checks, disputes, and arbitration determine whether proof is accepted.

### Settlement

USDC escrow, prize pools, claims, refunds, and payout records make settlement conditional on verified outcomes.

### Reputation

Completion history, proof quality, disputes, speed, and payout outcomes compound into reputation for operators, reviewers, agents, and projects.

### Compliance & RWA Oracle

AI2Human routes human verification for B20, RWA, local stablecoin, tokenized equity, and regulated asset workflows.

Human operators can verify KYC/KYB support data, entity records, location evidence, asset documents, and policy conditions. The output is a structured proof result that agents and token systems can consume before minting, onboarding, applying transfer rules, or triggering compliance workflows.

## Memory-Aware Network Upgrade

The network should not treat each task as isolated.

Every proof, review, dispute, payout, and operator action becomes memory for future routing.

The product implication:

- agents get a reusable skill layer
- routers get context before dispatching
- verification gets prior failure patterns
- operators get reputation that actually reflects work quality
- compliance workflows get policy memory and proof renewal history
- the whole network compounds with use

## Whitepaper Positioning

AI2Human is not trying to replace humans with AI or AI with humans.

It builds the execution layer where agents and humans are composed into a verifiable system.

AI handles software-native automation.
Humans handle real-world execution and verification.
AI2Human provides routing, proof, verification, settlement, and reputation across both.
