# AI2Human Network GitHub Architecture

## Goal

AI2Human should not look like one web app repository.

The GitHub surface should make the technical architecture obvious:

```text
agent request -> human execution / verification -> structured proof -> verify -> settle
```

The public organization should read as an infrastructure network with protocol code, skills, proof schemas, B20/RWA verification tooling, settlement contracts, examples, and docs.

## Organization

Recommended GitHub organization:

```text
ai2humannetwork
```

If the slug is available, create a new GitHub organization with:

- Display name: `AI2Human Network`
- Bio: `Agent-human execution and verification network. Agents request, humans verify, proof settles.`
- Website: `https://ai2human.io`
- X: `@ai2humannetwork`
- Topics: `ai-agents`, `human-verification`, `structured-proof`, `base`, `b20`, `x402`, `agent-skills`

If the slug cannot be created immediately, use the existing `ai2humanagent` organization but set the visible display name, profile README, repo descriptions, and pinned repos to `AI2Human Network`.

## Repo Map

### Tier 1: Core Public Repos

These should be pinned. They define the network.

| Repo | Purpose | Public Description |
| --- | --- | --- |
| `ai2human-site` | Website, app shell, task surfaces, docs pages, B20 page, skill console | Official web app and product surface for AI2Human Network. |
| `ai2human-protocol` | Canonical schemas, state machines, proof lifecycle, settlement lifecycle | Protocol specs for agent requests, human proof, verification, settlement, and reputation. |
| `ai2human-skills` | Agent skills, manifests, OpenClaw/Bankr-compatible skill docs, examples | Agent-readable skills for creating campaigns, requesting verification, and reading proof. |
| `ai2human-proof-kit` | Proof schema, proof bundle validation, reviewer outputs, hash/memo utilities | Structured proof toolkit for human execution and verification workflows. |
| `ai2human-settlement-contracts` | Prize pools, escrow, payout records, campaign contracts, tests | Base settlement contracts for verified rewards, prize pools, and task payouts. |
| `ai2human-b20-gateway` | B20 issuance assistant, policy config, human proof gates, Base Sepolia demo | B20 proof gateway connecting Base token rules with AI2Human human verification. |

### Tier 2: Network Modules

These should exist once there is real code or clear extracted modules.

| Repo | Purpose | Public Description |
| --- | --- | --- |
| `ai2human-router` | Request normalization, task type selection, proof schema selection, operator/reviewer routing | Routing engine for converting agent requests into verifiable human work. |
| `ai2human-reputation-graph` | Operator, reviewer, agent, and project reputation events | Reputation graph for proof quality, dispute history, payouts, and completion records. |
| `ai2human-compliance-oracle` | KYC/KYB support, document/entity/location proof outputs, B20/RWA oracle result schemas | Human-verified compliance oracle for B20, RWA, local stablecoin, and regulated asset workflows. |
| `ai2human-x402-gateway` | x402 payment-gated API routes for creating campaigns and requesting verification | x402 gateway for paid agent access to AI2Human skills and verification workflows. |
| `ai2human-agent-runtime` | Skill permissions, policy packs, memory, safe task creation, agent execution traces | Runtime layer for agents that call AI2Human safely with memory and policy context. |

### Tier 3: Examples And Demos

These help users understand the network quickly.

| Repo | Purpose | Public Description |
| --- | --- | --- |
| `examples-lucky-draw-campaign` | Holder-gated USDC campaign example | End-to-end holder-gated reward campaign example on Base. |
| `examples-b20-proof-token` | Base Sepolia B20 deployment and proof-gated token workflow | Example B20 token workflow with AI2Human proof requirements. |
| `examples-agent-created-campaign` | Agent creates campaign through skill/API | Example of an AI agent creating and monitoring an AI2Human campaign. |
| `examples-rwa-verification-flow` | RWA/B20 issuer verification task, proof bundle, oracle result | Example human-verified RWA/B20 compliance proof flow. |

### Tier 4: Research And Standards

These make the project feel serious without faking activity.

| Repo | Purpose | Public Description |
| --- | --- | --- |
| `ai2human-research` | Whitepaper drafts, proof benchmarks, task traces, evaluation reports | Research and evaluation notes for agent-human execution and structured proof. |
| `proof-schema-registry` | Reusable proof schemas for social, identity, document, location, RWA, compliance | Open registry of structured proof schemas for human-verified workflows. |
| `agent-task-fixtures` | Test fixtures for campaign creation, proof submission, review, payout | Public fixtures for testing agent-created tasks and proof verification. |

## Recommended Pinned Order

1. `ai2human-site`
2. `ai2human-protocol`
3. `ai2human-skills`
4. `ai2human-proof-kit`
5. `ai2human-b20-gateway`
6. `ai2human-settlement-contracts`

This order tells the story:

```text
product -> protocol -> agent access -> proof -> B20/compliance -> settlement
```

## What To Extract From The Current Monorepo

Current repo:

```text
ai2humanagent/ai2humanwork
```

Recommended future name:

```text
ai2human-site
```

Keep the existing repo as the product monorepo for now. Do not split everything immediately. Extract only modules that already have a clean boundary.

### Extract First

| From Current Repo | New Repo |
| --- | --- |
| `public/agent/skill.md`, `public/agent/manifest.json`, agent examples | `ai2human-skills` |
| B20 skill planner, manifest, deploy docs, Base Sepolia proof | `ai2human-b20-gateway` |
| proof bundle schemas, review outputs, scoring notes | `ai2human-proof-kit` |
| reward campaign contracts, prize pool references, settlement docs | `ai2human-settlement-contracts` |
| whitepaper, architecture diagrams, protocol state machines | `ai2human-protocol` |

### Keep In Site Repo

- Next.js app
- task pages
- campaign pages
- wallet connection
- admin UI
- public landing pages
- B20 and skill console UI until they become standalone packages

## Repo Descriptions

Use these exact descriptions for GitHub metadata.

```text
ai2human-site
Official web app and product surface for AI2Human Network.
```

```text
ai2human-protocol
Protocol specs for agent requests, human proof, verification, settlement, and reputation.
```

```text
ai2human-skills
Agent-readable skills for creating campaigns, requesting verification, and reading proof from AI2Human.
```

```text
ai2human-proof-kit
Structured proof schemas, validation helpers, reviewer outputs, and proof hash utilities.
```

```text
ai2human-settlement-contracts
Base settlement contracts for verified rewards, prize pools, task payouts, and escrow flows.
```

```text
ai2human-b20-gateway
B20 proof gateway connecting Base token rules with AI2Human human verification.
```

```text
ai2human-compliance-oracle
Human-verified compliance oracle for B20, RWAs, local stablecoins, and regulated asset workflows.
```

```text
ai2human-x402-gateway
x402 payment-gated gateway for agent access to AI2Human verification and campaign skills.
```

## Minimum README Structure For Every Repo

Each repo should have the same clean structure:

```text
# <Repo Name>

One sentence explaining what this module does.

## Why This Exists

Explain which part of the AI2Human Network loop it powers.

## Architecture

Show inputs, processing, outputs.

## Usage

Give one concrete command, API call, manifest example, or flow.

## Status

Mainnet / testnet / prototype / spec.

## Links

- Website
- Docs
- X
- Related repos
```

## Topics

Use focused topics, not random trend stuffing.

Core topics:

```text
ai-agents
human-verification
structured-proof
agent-skills
base
onchain-settlement
usdc
proof-verification
task-network
ai2human
```

For B20 repos:

```text
b20
base
rwa
compliance
tokenization
human-proof
```

For x402 repos:

```text
x402
agent-payments
paid-api
base
```

## What Not To Do

Do not create 20 empty repos.

Do not fork random projects just to look active.

Do not create fake commits or fake contributors.

Do not claim partnerships with Base, Bankr, OpenClaw, or any other project unless confirmed.

Do not overuse B20 or RWA language in every repo. Put those narratives where they belong:

- `ai2human-b20-gateway`
- `ai2human-compliance-oracle`
- `examples-rwa-verification-flow`

## 7-Day Execution Plan

### Day 1

- Create or rename organization surface to `AI2Human Network`.
- Set org bio, website, X handle, avatar, and profile README.
- Rename or mirror `ai2humanwork` positioning as `ai2human-site`.

### Day 2

- Create `ai2human-protocol`.
- Add canonical architecture, state machine, proof schema overview, and settlement lifecycle.

### Day 3

- Create `ai2human-skills`.
- Extract the current agent skill, manifest, examples, and OpenClaw testing guide.

### Day 4

- Create `ai2human-b20-gateway`.
- Add B20 skill spec, Base Sepolia deployment proof, demo screenshots, and testnet transaction references.

### Day 5

- Create `ai2human-proof-kit`.
- Add proof bundle schemas, sample proof objects, validation scripts, and review output examples.

### Day 6

- Create `ai2human-settlement-contracts`.
- Add prize pool/escrow contract references, campaign settlement docs, tests, and Base USDC examples.

### Day 7

- Pin repos.
- Add consistent topics and descriptions.
- Publish a GitHub architecture post showing the organization map.

## Final Public GitHub Story

AI2Human Network is not a single task app.

It is a modular agent-human execution and verification network:

```text
ai2human-site
  user-facing product

ai2human-protocol
  canonical loop and state machines

ai2human-skills
  agent access layer

ai2human-proof-kit
  structured proof layer

ai2human-settlement-contracts
  verified payout layer

ai2human-b20-gateway
  B20 and token policy proof gateway

ai2human-compliance-oracle
  RWA, local stablecoin, and regulated asset verification
```

That is the GitHub version of the architecture:

```text
agents request -> humans execute / verify -> proof is structured -> review accepts or rejects -> settlement happens -> reputation compounds
```

## Product Todo Reference

The highest-priority product direction after the initial GitHub organization split is the AI2Human X Bot:

```text
Tweet a task. Route a human. Verify proof. Settle onchain.
```

See:

```text
docs/strategy/ai2human-network-todolist.md
```
