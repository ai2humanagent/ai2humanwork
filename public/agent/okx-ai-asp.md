# AI2Human OKX.AI ASP Registration

AI2Human should register on OKX.AI as an **ASP (Agent Service Provider)**.

Primary service type:

```text
A2MCP / Agent-to-MCP
```

Service name:

```text
AI2Human Task Router
```

## Service Description

AI2Human Task Router lets agents create human-executed or human-verified tasks from one API call.

The service turns an agent request into:

```text
agent request -> human execution / verification -> structured proof -> verify -> settle
```

Agents use AI2Human when a workflow needs a real human, public account action, local confirmation, screenshot proof, manual review, eligibility verification, or settlement after proof.

## A2MCP Endpoint

```text
POST https://ai2human.io/api/x402/agent/tasks/create
```

Metadata:

```text
GET https://ai2human.io/api/x402/agent/tasks/create
```

The endpoint supports x402-style paid calls for OKX.AI A2MCP registration and also supports a public no-payout demo mode for testing.

## What The Endpoint Does

Input:

- task title
- description / brief
- budget
- deadline
- target URL
- proof requirements
- optional distribution list

Output:

- AI2Human task ID
- AI2Human task URL
- proof schema
- verification checks
- campaign status
- settlement / funding mode

## Safe Demo Payload

Use this first when testing with OpenClaw, Codex, Claude, or OKX.AI.

```json
{
  "mode": "demo",
  "environment": "test",
  "fundingMode": "test_no_payout",
  "title": "Verify an agent workflow with human proof",
  "description": "A human operator should complete the requested action, submit a live URL or screenshot, and wait for verification.",
  "targetUrl": "https://ai2human.io",
  "requesterName": "OKX.AI Agent",
  "requesterHandle": "@ai2humannetwork",
  "budget": "0 USDC",
  "deadline": "24h",
  "proofRequired": [
    "public profile or wallet identity",
    "live proof URL or screenshot",
    "one-line execution summary"
  ],
  "distribution": ["ai2human", "okxai"]
}
```

## Test Command

```bash
curl https://ai2human.io/api/x402/agent/tasks/create \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "demo",
    "environment": "test",
    "fundingMode": "test_no_payout",
    "title": "Verify an agent workflow with human proof",
    "description": "A human operator should complete the requested action, submit a live URL or screenshot, and wait for verification.",
    "targetUrl": "https://ai2human.io",
    "requesterName": "OKX.AI Agent",
    "requesterHandle": "@ai2humannetwork",
    "budget": "0 USDC",
    "deadline": "24h",
    "proofRequired": ["public profile or wallet identity", "live proof URL or screenshot", "one-line execution summary"],
    "distribution": ["ai2human", "okxai"]
  }'
```

## OKX.AI Registration Prompt

Send this to Onchain OS after logging in to Agentic Wallet:

```text
Help me register an A2MCP ASP on OKX.AI using OKX Agent Identity from Onchain OS.

Service name: AI2Human Task Router
Endpoint: https://ai2human.io/api/x402/agent/tasks/create
Description: AI2Human Task Router lets agents create human-executed or human-verified tasks from one API call. It returns an AI2Human task URL, proof schema, verification checks, status, and settlement/funding mode. The core loop is agent request -> human execution / verification -> structured proof -> verify -> settle.
Pricing: 0.01 USDT0 per API call, x402-compatible.
Use cases: human proof tasks, community campaigns, product feedback proof, public account actions, local verification, B20/RWA eligibility proof, and agent workflow fallback.
```

## Secondary Service

After A2MCP is listed, AI2Human can also register an A2A service:

```text
AI2Human Human Execution Network
```

Use A2A for complex negotiated work:

- KOL campaigns
- local verification
- supplier discovery
- physical-world checks
- document or eligibility review
- B20 / RWA human proof workflows
