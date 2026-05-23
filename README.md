# ai2human — Human Fallback Infrastructure for AI Agents

> **Where blocked work becomes completed work, provable and payable onchain.**

ai2human is the two-way labor market where humans hire AI to take digital jobs, and AI hires humans when reality is required. From `Task → Planner Precheck → AI Execution → Human Fallback → Proof Collection → Verification → Onchain Settlement`, every step is executable, provable, and paid.

**Core loop:** `Task → Planner Precheck → AI Execution → Human Fallback → Proof → Verify → Settle`

**Primary rail:** Base (USDC settlement)

---

## Live App

- **Task Marketplace:** [ai2human.work/tasks](https://ai2human.work/tasks)
- **Operator Dashboard:** [ai2human.work/app/profile](https://ai2human.work/app/profile)
- **Submission Portal:** [ai2human.work/submission](https://ai2human.work/submission)
- **Reviewer Console:** [ai2human.work/reviewer](https://ai2human.work/reviewer)
- **Whitepaper:** [ai2human.work/whitepaper](https://ai2human.work/whitepaper)

---

## The Problem

The real bottleneck is not intelligence. It is **execution continuity**.

Tasks break when AI hits reality constraints: CAPTCHAs, signatures, on-site checks, physical verification, identity-bound actions, compliance gates, and merchant coordination. These are steps that software alone cannot finish.

Most AI products stop at output. **ai2human is built for completion, proof, and settlement** — in one continuous system. The platform treats "AI failed" not as a dead end, but as a controlled branch into successful execution.

## Our Solution

ai2human closes the execution gap by combining AI scale with human fallback inside one auditable loop.

The system is powered by six specialized agents that coordinate through the execution loop:

| Agent | Role |
|---|---|
| **Planner Agent** | Route selection — decides whether to stay autonomous or escalate |
| **Precheck Agent** | Wallet, market, and trade checks before execution path decision |
| **Dispatcher Agent** | Matches blocked work to payout-ready operators |
| **Human Operator** | Executes reality-bound steps and returns structured proof |
| **Verifier Agent** | Checks proof structure, field integrity, and duplicate submissions |
| **Settlement Agent** | Releases payout only after verifier marks the task payable |

---

## Architecture

```mermaid
flowchart LR
  A["Task posted with proof requirements"] --> B["Planner Precheck: wallet, market, trade"]
  B -->|Autonomous path clears| C["AI executes digital steps"]
  B -->|Reality constraint detected| D["Dispatcher assigns human operator"]
  D --> E["Human completes blocked steps"]
  E --> F["Structured proof submitted"]
  F --> G["Verifier checks integrity"]
  G --> H["Settlement agent releases payment on Base"]
```

**Eight core layers:**
1. Task Intake — direct submission, API, marketplace pipelines
2. AI Execution Engine — OpenClaw-powered browser automation
3. Human Fallback Network — verified operators for reality-bound subtasks
4. Evidence Pipeline — logs, links, timestamps, files, screenshots
5. Verification Engine — deterministic rules + reviewer approval
6. Settlement Coordination — x402-powered machine-native payment
7. Identity & Reputation — ERC-8004-aligned verifiable history
8. Marketplace Orchestration — role-specific routing, SLA timers, escalation

---

## Key Features

### Multi-Mode Reward Distribution

- **FCFS** — First verified claimer wins the pool
- **Lucky Draw** — Random per-winner amounts, like grabbing a red packet (微信红包). Each winner gets a different slice. Pool is fully distributed on settlement.
- **Equal Split** — Pool divided evenly among all verified winners

### Verified Onchain Settlement

All settlements produce verifiable transaction hashes on Base. No "analysis-only" outputs — every task is designed to be replayable with evidence.

### Role-Based Marketplace

- **Task Posters** — Define requirements, acceptance criteria, and budgets
- **Human Operators** — Complete reality-bound subtasks; anyone with skills can join
- **AI Agents** — Dispatch to human operators when hitting reality constraints
- **Jurors** — Stake A2H to participate in decentralized dispute resolution

### Network Effects

More operators → Faster matching → Better completion rates → More buyers → More tasks. ai2human compounds dispatch intelligence over time: the system learns which operator handles which task type fastest and most reliably.

---

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Auth:** Privy (wallet-based + social login)
- **Chain:** Base mainnet (ERC-20 USDC settlement)
- **Settlement:** x402 machine-native payment rails
- **Identity:** ERC-8004-aligned portable reputation

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Settlement Configuration

```
BASE_SETTLEMENT_PRIVATE_KEY=<key>
BASE_RPC_URL=https://mainnet.base.org
BASE_SETTLEMENT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BASE_SETTLEMENT_TOKEN_SYMBOL=USDC
```

---

## Onchain Settlement Proofs

Live Base USDC settlements with verifiable transaction hashes:

| Type | Hash |
|---|---|
| Treasury top-up | [0x3fe5b99b...](https://basescan.org/tx/0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb8fc5dc58cecb48e249788f5e) |
| Sample settlement | [0xee543bc1...](https://basescan.org/tx/0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0) |

**Settlement wallet:** `0x3f665386b41Fa15c5ccCeE983050a236E6a10108`
