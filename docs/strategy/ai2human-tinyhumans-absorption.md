# TinyHumans Research Absorption For AI2Human Network

## Why This Matters

TinyHumans is not a direct competitor to AI2Human Network. Its public positioning is closer to practical AI products, personal AI, AI memory, and skill-based desktop agents.

The useful lesson is architectural:

AI agents need memory, policy, and skills before they can make reliable decisions over time.

AI2Human should absorb that lesson into its own category:

```text
agent request -> memory / policy / skills -> human execution / verification -> structured proof -> verify -> settle
```

## What TinyHumans Does Well

### 1. Memory-first AI infrastructure

Their NeoCortex positioning is strong because it treats memory as an active system, not a passive vector database.

Useful ideas:

- memory should decay when it becomes irrelevant
- frequently used knowledge should be reinforced
- recent and repeatedly interacted-with context should surface first
- agents should act with focused context, not a noisy dump

AI2Human adaptation:

- task memory
- proof quality memory
- operator reliability memory
- reviewer accuracy memory
- dispute pattern memory
- settlement outcome memory

This turns AI2Human from a task ledger into a learning execution network.

### 2. Policy / constitution layer

Their constitution repo is useful because it suggests every agent should load rules before acting.

AI2Human adaptation:

- settlement policy
- proof policy
- compliance policy
- dispute policy
- privacy and data handling policy
- token-gated participation policy
- reviewer conduct policy

This becomes the AI2Human Policy Constitution.

Every AI2Human agent should decide with policy loaded, not after the fact.

### 3. Skill registry and sandbox runtime

Their OpenHuman skills registry is useful because it treats skills as packaged, isolated capabilities with manifests, setup flows, lifecycle hooks, storage, HTTP, cron, and tool APIs.

AI2Human adaptation:

- create campaign skill
- request human verification skill
- submit proof skill
- review proof skill
- check payout skill
- monitor campaign deadline skill
- trigger Telegram/admin notification skill
- query public report skill
- request Compliance & RWA Oracle skill

This supports the larger goal:

Any agent should be able to create, monitor, verify, and settle AI2Human tasks through skills.

## What We Should Not Copy

Do not reposition AI2Human as:

- a personal AI assistant
- a memory company
- a desktop AI app
- a generic AI lab

Those are TinyHumans directions.

AI2Human remains:

```text
the agent-human execution and verification network
```

Memory, policy, and skills are not the product category. They are infrastructure that makes the execution network more powerful.

## Final Architecture Change

Add a new module:

```text
Agent Context & Skill Runtime
```

This module sits between Agent Access and AI2Human Router.

It includes:

- task memory
- operator memory
- reviewer memory
- proof schema memory
- dispute memory
- settlement memory
- policy constitution
- skill registry
- sandboxed skill execution
- cron / notification hooks

## Product Implications

### Better routing

The router can ask:

- who completed this task type well before?
- what proof schema failed last time?
- which reviewer is reliable for this category?
- which compliance policy applies?
- which payout rail has clean history?

### Better verification

The verifier can compare current proof against prior patterns:

- duplicate images
- suspicious X behavior
- repeated wallets
- repeated bad proofs
- high-quality proof examples

### Better compliance

The Compliance & RWA Oracle can remember:

- issuer review history
- verifier reliability
- document renewal requirements
- policy exceptions
- jurisdiction notes
- proof expiry dates

### Better agent adoption

Agents do not want to click UI manually.

They need callable skills:

```text
createTask()
quoteReward()
requestHumanVerification()
submitProof()
reviewProof()
checkSettlement()
getPublicReport()
requestComplianceOracle()
```

## Updated One-Liner

AI2Human is the memory-aware agent-human execution and verification network.

Longer version:

AI2Human turns agent requests into verified human work, structured proof, policy-aware verification, and settlement, while every task improves routing, review, compliance, and reputation memory.

