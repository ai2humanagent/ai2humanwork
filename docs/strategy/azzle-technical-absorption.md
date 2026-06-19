# Azzle Technical Absorption Notes

Date: 2026-06-19

## What Was Reviewed

Repository: `Dabus123/azzle`

Reviewed files:
- `README.md`
- `AGENTS.md`
- `BOOTSTRAP.md`
- `protocol/TASK_STATE_MACHINE.md`
- `protocol/ACCESS_FEES.md`
- `protocol/AGENT_DEPOSITS.md`
- `contracts/src/TaskRegistry.sol`
- `contracts/src/AgentDepositVault.sol`
- `contracts/src/EscrowVault.sol`
- `agents/src/sdk/client.ts`
- `agents/src/cli.ts`

## Useful Patterns To Absorb

Azzle is an agent-to-agent labor and settlement protocol. AI2Human is different: AI2Human handles the moment an agent hits a human gate and needs a real person to execute, prove, verify, and settle work.

The useful parts for AI2Human are protocol design patterns, not the product narrative:

- Clear task state machine: posted, claimed, active, in review, completed, disputed, resolved.
- Economic gates before important actions: posting, claiming, dismissing, leaving, and accessing work.
- Escrow-first settlement: money is attached to the task before the network treats it as payable.
- Agent-readable onboarding: a skill file, bootstrap instructions, SDK/CLI examples, and clear constraints.
- Dispute and reputation hooks: not every failure should be admin-only; the system needs structured future paths for arbitration.

## What Not To Copy

AI2Human should not become an agent-to-agent marketplace clone. The differentiation is human fallback infrastructure:

Task -> human execution -> proof -> verify -> settle.

The platform should stay focused on real accounts, real-world actions, identity-bound steps, local checks, media proof, review, and Base USDC settlement.

## Completed Work

Commit already completed:

`e767372 Add token-gated campaign eligibility`

That commit added activity-level token holder eligibility. A task can now define a token gate inside campaign config, and the platform checks the connected wallet before participation and before reward claim when configured.

Follow-up implemented after that commit:

- Added dynamic USD-value token gates.
- A campaign can require around `1 USDC` worth of a token without hardcoding a token amount.
- The system can resolve the current token threshold from a configured price or DexScreener.
- The same token gate can apply to `quest_action`, `article_submit`, `task_claim`, and `reward_claim`.
- UI copy and agent skill docs now describe value-based token gates.

## Holder-Gated Lucky Draw Plan

For an `$A2H` holder-gated lucky draw, the campaign should carry this config:

```json
{
  "eligibility": {
    "tokenGate": {
      "network": "base",
      "chainId": 8453,
      "contractAddress": "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3",
      "symbol": "A2H",
      "decimals": 18,
      "minimumUsdValue": "1",
      "priceSource": "dexscreener",
      "requiredAt": ["quest_action", "reward_claim"]
    }
  }
}
```

This is dynamic campaign configuration, not hardcoded system behavior. Other projects can use a different ERC20 contract, chain, decimals, fixed token amount, USD value threshold, or price source.

## Creation Requirements

Do not create a production lucky draw from invented defaults. The requester or third-party agent must provide:

- campaign title
- deadline
- X account to follow
- X post URL to like and repost
- Telegram group URL, if Telegram join is required
- reward pool
- number of winners
- token gate config, if holder-only access is required

After draft creation, AI2Human should return the task URL and funding invoice directly to the third-party agent. The agent should not need to open the campaign page to discover the recipient address.

## Next Product Steps

- Add richer funding invoice display and API response shape for agent-created tasks.
- Add admin visibility for token gate status and price source.
- Add campaign template examples for fixed-balance and dynamic USD-value token gates.
- Add future snapshot support if a campaign wants eligibility frozen at a specific block.
- Add dispute hooks for cases where proof is contested after token-gated participation.
