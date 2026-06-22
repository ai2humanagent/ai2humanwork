# AI2Human Network Brand Upgrade

## Final Positioning

AI2Human is the agent-human execution and verification network.

It is not just a task app. It is the network layer agents, projects, and protocols use when a workflow needs human execution, human verification, structured proof, policy checks, and settlement.

Canonical loop:

```text
agent request -> human execution / verification -> structured proof -> verify -> settle
```

## Why The Upgrade Matters

The old framing made AI2Human sound like a task market.

The new framing makes the category clear:

- agents can plan and automate software-native workflows
- real-world workflows still require human execution and human verification
- AI2Human turns those human steps into structured proof
- proof is verified before settlement
- every completion creates reputation and reusable network data

This moves AI2Human from a task surface to infrastructure.

## Core Architecture

1. **Agent / Project Request**
   - Agents, protocols, token teams, campaign teams, and requesters define the work.
   - The request includes scope, budget, deadline, eligibility, proof requirements, and settlement mode.

2. **Agent Access Layer**
   - `skill.md`, API, SDK, manifests, webhooks, and task templates.
   - This makes AI2Human readable by agents instead of only humans.

3. **Agent Context & Skill Runtime**
   - Agents should not route every task from zero context.
   - This layer stores task memory, proof memory, operator/reviewer history, policy packs, and skill permissions.
   - It also supports sandboxed skills so agents can create campaigns, request verification, fetch proof, and monitor settlement without custom integration work.

4. **AI2Human Router**
   - Normalizes the request.
   - Chooses task type, proof schema, operator eligibility, price, review mode, and settlement mode using both current request data and memory/context.

5. **Human Execution Network**
   - Verified operators complete real-world or identity-bound actions.
   - Examples: local checks, X account actions, document review, venue inspection, signature capture, photo proof, KYC/KYB support.

6. **Structured Proof Layer**
   - Human output is not a vague claim.
   - It becomes a proof bundle: URLs, screenshots, receipts, timestamps, attachments, wallet evidence, location notes, reviewer metadata, hashes.

7. **Verification Engine**
   - Rule checks, AI review, human review, duplicate detection, fraud checks, dispute windows, and arbitration.
   - Settlement only follows accepted evidence.

8. **Settlement Layer**
   - USDC escrow, prize pools, payout records, refunds, and claim flows.
   - Payout becomes part of the task lifecycle, not an external manual promise.

9. **Reputation Graph**
   - Operators, agents, reviewers, and projects earn reputation from proof quality, completion history, disputes, and payout outcomes.

10. **Compliance & RWA Oracle**
   - Human-verified KYC, KYB, location, entity, document, and asset proof for B20, RWA, local stablecoins, tokenized equity, and regulated assets.
   - AI2Human can provide the human verification primitive agents and issuers need before policy-aware token actions.

## Memory, Policy & Skill Runtime

The strongest idea to absorb from adjacent AI infrastructure is simple: agents need memory, policy, and skills before they can act reliably.

For AI2Human, that becomes:

- **Task memory:** prior proof quality, review failures, payout outcomes, dispute reasons, fraud patterns.
- **Operator memory:** which humans perform reliably by task type, region, proof format, response time, and dispute history.
- **Reviewer memory:** which reviewers are accurate and consistent.
- **Policy constitution:** network rules loaded before agent actions: eligibility, compliance, settlement, data handling, dispute boundaries.
- **Skill runtime:** reusable agent tools for creating campaigns, requesting verification, submitting proof, checking settlement, and reading public reports.

This does not change the AI2Human category. It strengthens it.

AI2Human remains the execution and verification network, but now every task makes the network smarter instead of remaining a one-off record.

## Compliance & RWA Oracle

This is the most important new module in the network upgrade.

The problem:

Tokenized assets, local stablecoins, B20 issuance, and regulated workflows need more than AI-generated paperwork. They need human verification of real-world facts.

AI2Human can route that work:

```text
issuer / agent request
-> AI2Human verification task
-> human verifier performs KYC / KYB / location / entity / document / asset checks
-> structured proof bundle
-> policy-aware verification
-> oracle result consumed by token issuance or compliance workflow
```

Possible outputs:

- issuer/entity attestation
- document review result
- location proof
- asset proof bundle
- reviewer decision
- compliance tags
- proof hash
- expiry time
- dispute window
- role or policy recommendation

Downstream uses:

- B20 token issuance with role-based controls
- RWA tokenization with asset proof
- local stablecoin issuer verification
- tokenized equity onboarding
- freeze/seize policy inputs
- restricted transfer policy inputs
- ongoing compliance renewal tasks

## Website / Whitepaper Narrative

### Hero

AI2Human Network is the agent-human execution and verification layer for AI workflows.

Agents can request work. Humans execute or verify the real-world step. Proof is structured. Verification gates settlement.

### Short Description

AI2Human turns agent requests into verified human work. The network routes tasks to human operators, collects structured proof, verifies outcomes, settles payment, and compounds reputation across agents, operators, reviewers, and projects.

### Long Description

AI2Human Network exists because AI workflows still break when they touch real-world constraints. Agents can plan, write, browse, and automate software-native steps, but many valuable workflows still require human action: account-bound activity, local verification, document checks, identity-sensitive review, asset proof, field inspection, and compliance evidence.

AI2Human closes that execution gap with one auditable loop:

```text
agent request -> human execution / verification -> structured proof -> verify -> settle
```

The product is not just a task board. It is a network protocol for assigning human-needed steps, collecting proof, verifying evidence, releasing settlement, and building durable reputation. The same infrastructure can power campaign tasks, operator work, verification jobs, and compliance-heavy workflows such as B20 issuance, RWA onboarding, local stablecoins, and regulated asset review.

### Brand Rule

Do not describe AI2Human as only:

- a task app
- a gig marketplace
- a freelancer marketplace
- a simple reward campaign tool

Describe it as:

- an agent-human execution network
- a human verification network for agents
- a structured proof and settlement layer
- a memory-aware execution network
- a policy-governed skill layer for agents
- a compliance and real-world verification oracle
- infrastructure for agent workflows that need humans

## Final Slogan Options

Primary:

```text
Agent requests. Human proof. Verified settlement.
```

Technical:

```text
The agent-human execution and verification network.
```

Compliance/RWA:

```text
Human-verified proof for agent workflows, B20 issuance, and real-world assets.
```

Short public version:

```text
Agents request. Humans verify. Proof settles.
```

## Public Launch Message

AI2Human is upgrading from TaskMarket to AI2Human Network.

The task app is only one surface. The real architecture is bigger: agent requests, human execution, structured proof, verification, settlement, reputation, and now a Compliance & RWA Oracle for human-verified issuance and regulated asset workflows.
