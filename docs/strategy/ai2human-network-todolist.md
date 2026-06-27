# AI2Human Network Todo List

## Priority 1: AI2Human X Bot

### Product Thesis

AI2Human should become callable from public social intent.

The user should be able to post a sentence on X:

```text
@ai2humannetwork help me buy headphones in Shenzhen under 80 USDC
```

AI2Human converts it into:

```text
draft task -> proof requirements -> suggested budget -> settlement path -> confirmation link
```

The bigger product definition:

```text
Tweet a task. Route a human. Verify proof. Settle onchain.
```

This is the strongest near-term user-facing expression of the AI2Human Network.

## Why This Matters

AI2Human is not only a dashboard or task website.

If X becomes the input layer, AI2Human becomes a public command network:

```text
social intent -> AI2Human router -> human execution -> proof -> verify -> settle
```

This is similar in surface simplicity to Bankr-style command bots, but the output is different:

- Bankr-style bot: social command -> financial/token action
- AI2Human bot: social command -> verified human execution

## MVP Commands

### 1. Create Local Task

Example:

```text
@ai2humannetwork help me find a supplier for this product in Shenzhen
```

Output draft:

- task title
- location
- suggested budget
- human executor type
- proof requirements
- settlement mode
- confirmation link

### 2. Create Online Task

Example:

```text
@ai2humannetwork find 20 potential partners for this product and prepare a short report
```

Output draft:

- task brief
- expected deliverable
- proof format
- reward
- deadline

### 3. Create Verification Task

Example:

```text
@ai2humannetwork verify whether this merchant exists at this address
```

Output draft:

- verification scope
- evidence requirements
- reviewer mode
- settlement condition

### 4. Create Reward Campaign

Example:

```text
@ai2humannetwork create a 100 USDC holder-gated reward campaign for $A2H holders
```

Output draft:

- campaign title
- reward pool
- max winners
- token gate
- proof requirements
- funding invoice
- preview link

## Safe Flow

The bot should not immediately publish tasks from a single X mention.

Use this flow:

```text
mention received
-> parse intent
-> generate draft
-> reply with preview
-> user confirms
-> funding / escrow step
-> publish
```

This prevents spam, illegal tasks, underpriced tasks, and accidental spending.

## Product Response Format

Example reply:

```text
Draft ready.

Task: Find a product supplier in Shenzhen
Human executor: local sourcing operator
Proof required: supplier photo, quote, contact card, location note
Suggested budget: 30-80 USDC
Settlement: escrow after proof verification

Reply "confirm 50 USDC" to create the task.
```

## Technical Architecture

```text
X mention listener
-> command parser
-> safety classifier
-> task payload builder
-> AI2Human preview API
-> draft task creator
-> funding / escrow generator
-> X reply composer
```

Use existing AI2Human APIs first:

- `POST /api/agent/campaigns/preview`
- `POST /api/agent/campaigns`
- `GET /api/agent/campaigns/{id}/funding`
- `POST /api/agent/campaigns/{id}/publish`

Add new API layer:

- `POST /api/x-bot/preview`
- `POST /api/x-bot/confirm`
- `POST /api/x-bot/webhook`

Add internal page:

- `/agent/x-bot`

This page should allow testing without live X API access:

```text
input social command -> parsed intent -> generated payload -> preview -> suggested X reply
```

## Safety Rules

Reject or require manual review for:

- illegal purchases
- credential requests
- financial custody requests
- medical/legal promises
- harassment or spam
- platform manipulation
- privacy-invasive tasks
- tasks requiring dangerous physical actions
- unclear payment or unclear proof

## Implementation Phases

### Phase 0: Local Console

Build `/agent/x-bot`.

User can paste:

```text
@ai2humannetwork help me buy headphones in Shenzhen under 80 USDC
```

The console returns:

- parsed intent
- task type
- draft payload
- proof requirements
- preview result
- suggested reply

### Phase 1: API Preview

Build:

```text
POST /api/x-bot/preview
```

It should return the same structured response as the console.

### Phase 2: Draft Creation

Build:

```text
POST /api/x-bot/confirm
```

It creates a draft task after explicit confirmation.

### Phase 3: X Integration

Add mention polling or webhook integration.

The bot replies with:

- preview summary
- confirmation instruction
- task link
- funding instruction if needed

### Phase 4: Settlement Integration

Connect to escrow / prize pool / managed pool funding flows.

### Phase 5: Reputation + Operator Routing

Use task type, location, proof requirements, and operator history to recommend or route to operators.

## Positioning

Do not describe this as only an X bot.

Describe it as:

```text
The social command layer for verified human execution.
```

Short public version:

```text
Tweet a task. Humans execute. Proof settles.
```

## Why It Beats A Normal Task App

A normal task app requires users to understand forms.

AI2Human X Bot lets users express intent in natural language where they already are.

The network handles:

- intent parsing
- task creation
- proof design
- human routing
- verification
- settlement

That is the killer app for AI2Human Network.

