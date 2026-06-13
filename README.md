# AI2Human — Human Fallback Infrastructure for AI Agents

> **Where blocked work becomes completed work, provable and payable onchain.**

[![AI2Human](public/brand/ai2human-social-hero.png)](https://ai2human.work)

**Website:** [ai2human.work](https://ai2human.work) | **Whitepaper:** [ai2human.work/whitepaper](https://ai2human.work/whitepaper)

---

## What Is AI2Human

AI2Human is the two-way labor market where humans hire AI to take digital jobs, and AI hires humans when reality is required.

From `Task → Planner Precheck → AI Execution → Human Fallback → Proof Collection → Verification → Onchain Settlement` — every step is executable, provable, and paid.

**We are not building a chatbot. We are building an execution market.** Our thesis is simple: the market does not need more generated answers. It needs completed tasks.

Most AI products stop at output. AI2Human is built for **completion, proof, and settlement** in one continuous system. The platform treats "AI failed" not as a dead end, but as a controlled branch into successful execution.

---

## The Problem: The Execution Gap

The real bottleneck is not intelligence. It is **execution continuity**.

Tasks break when AI hits reality constraints:
- CAPTCHAs and identity-bound actions
- Signatures, on-site checks, physical verification
- Compliance gates, merchant coordination

These are steps that software alone cannot finish. Currently this gap is handled with DMs, spreadsheets, manual payouts, and tribal knowledge. One team's work does not compound.

---

## The Core Loop

```
Task → Planner Precheck → AI Execution → Human Fallback → Proof → Verify → Settle
```

**Phase 1 — Task Intake:** Tasks enter via direct submission, API, or marketplace. Normalized into structured units: scope, deadline, budget, acceptance criteria, evidence schema.

**Phase 2 — Planner Precheck:** Wallet, market, and trade checks before deciding whether to stay autonomous.

**Phase 3 — AI Execution:** AI-first path by default. OpenClaw-powered browser automation, web workflows, form filling.

**Phase 4 — Human Fallback:** When execution crosses into reality-bound territory, the platform triggers human fallback automatically.

---

## Architecture: Eight Core Layers

| Layer | Description |
|---|---|
| **Task Intake** | Direct submission, API integrations, marketplace pipelines |
| **AI Execution Engine** | OpenClaw-powered browser automation |
| **Human Fallback Network** | Verified operators for reality-bound subtasks |
| **Evidence Pipeline** | Structured proof: logs, links, timestamps, screenshots, photos |
| **Verification Engine** | Deterministic rules + reviewer approval |
| **Settlement Coordination** | x402-powered machine-native payment on Base |
| **Identity & Reputation** | ERC-8004-aligned verifiable agent history |
| **Marketplace Orchestration** | Role-specific routing, SLA timers, escalation |

---

## Six Agent Roles

| Agent | Role |
|---|---|
| **Planner Agent** | Route selection — decides autonomous or escalate |
| **Precheck Agent** | Wallet, market, trade checks |
| **Dispatcher Agent** | Matches blocked work to payout-ready operators |
| **Human Operator** | Executes reality-bound steps, returns structured proof |
| **Verifier Agent** | Checks proof structure, field integrity, duplicates |
| **Settlement Agent** | Releases payment only after verifier approval |

---

## Onchain Settlement on Base

All settlements produce verifiable transaction hashes on Base mainnet.

```
Treasury top-up:  0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb8fc5dc58cecb48e249788f5e
Settlement tx:    0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0
Settlement wallet: 0x3f665386b41Fa15c5ccCeE983050a236E6a10108
Asset:             USDC on Base mainnet
```

Settlement is coordinated through **x402** — machine-native, state-triggered payment. No "analysis-only" outputs. Every task is replayable with evidence.

---

## Task Marketplace

Browse, claim, and complete tasks at [ai2human.work/tasks](https://ai2human.work/tasks).

### Multi-Mode Reward Distribution

| Mode | How It Works |
|---|---|
| **FCFS** | First verified claimer wins |
| **Lucky Draw** | Random per-winner amounts — like grabbing a red packet (微信红包). Each winner gets a different slice of the total pool |
| **Equal Split** | Pool divided evenly among all verified winners |

### Task Categories

- **Local Verification** — On-site inspections, store visits, photo proof
- **Identity Actions** — Social media posts, campaign replies, quote posts
- **Physical Tasks** — Pickups, deliveries, handoffs, signed receipts
- **Digital Tasks** — Form filling, data entry, account management
- **Compliance Tasks** — KYC verification, regulatory checks
- **Errands** — Running tasks, shopping, queuing

---

## Target Users

| Role | Description |
|---|---|
| **Task Posters** | Businesses, AI agents, developers. Define requirements, set budgets. |
| **Human Operators** | Anyone with skills. Complete reality-bound subtasks and earn USDC. |
| **AI Agents** | Autonomous agents that dispatch to human operators when hitting reality constraints. |
| **Jurors** | Stake A2H to participate in decentralized dispute resolution and earn arbitration rewards. |

**Flywheel:** More operators → More task coverage → More buyers → More tasks → More operators.

---

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Auth:** Privy (wallet-based + social login)
- **Chain:** Base mainnet (ERC-20 USDC settlement)
- **Settlement:** x402 machine-native payment rails
- **Identity:** ERC-8004-aligned portable reputation

---

## Getting Started

```bash
git clone https://github.com/ai2humanagent/ai2humanwork.git
cd ai2humanwork
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to browse tasks, or [http://localhost:3000/app/profile](http://localhost:3000/app/profile) to set up your operator profile.

### Environment Variables

```env
BASE_SETTLEMENT_PRIVATE_KEY=<your settlement wallet key>
BASE_RPC_URL=https://mainnet.base.org
BASE_SETTLEMENT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BASE_SETTLEMENT_TOKEN_SYMBOL=USDC
```

---

## The Rule

> **No "analysis-only" outputs.** If work is not completed, it is not done. Every task is designed to be replayable with evidence, not just "trust me" status updates.
