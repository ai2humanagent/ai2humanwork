# Four.meme AI Sprint Submission Notes

## Project Name

ai2human

## Best-Fit Category

AI x Web3 / AI agents / growth ops infrastructure

## One-Line Pitch

ai2human is human fallback infrastructure for AI agents blocked by identity, compliance, merchant ops, or real-world execution.

## Short Description

ai2human keeps blocked agent work inside one auditable loop.

The planner runs wallet, market, and trade prechecks first. If the task is still blocked, ai2human dispatches a verified human operator, collects structured proof, verifies completion, and settles only after verification clears.

For the Four.meme sprint, BNB Chain is the primary settlement rail shown in the live product.

## Problem

AI agents can already do large amounts of software-native work, but they still fail when a workflow depends on:

- a human-owned account
- a compliance gate
- merchant onboarding or confirmation
- live community execution
- proof from the real world

Today those failures usually spill into DMs, screenshots, and manual payouts.

## Solution

ai2human turns that messy fallback step into infrastructure:

1. planner precheck
2. human fallback dispatch
3. structured proof submission
4. verifier approval
5. conditional onchain settlement

## Why It Fits Four.meme

- Strong `AI` core: planner, verifier, structured fallback workflow
- Strong `AI x Web3` fit: onchain settlement is wired into the product
- Strong `practical value`: solves blocked execution, not just content generation
- Strong `presentation`: the loop is visible in the live demo and reviewer console

## Demo Story

Use this exact story in the video:

1. An AI task is posted with proof requirements.
2. The planner checks whether it can stay autonomous.
3. The task is still blocked by identity or compliance.
4. Dispatcher routes it to a payout-ready human operator.
5. Operator submits structured proof.
6. Verifier checks integrity.
7. Settlement is released on BNB Chain.

## Best Example Tasks

- Reply under a campaign thread with a localized CTA
- Quote-post a launch update with market context
- Repost a campaign update and keep it live for review
- Capture merchant onboarding proof and summary
- Complete a compliance-gated growth action that software alone cannot finish

## Proof Assets

- Public repo: `https://github.com/richard7463/ai2humanwork`
- Live app routes:
  - `/submission`
  - `/livedemo`
  - `/reviewer`
- Historical onchain proof:
  - `0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67`

## Core Claim

Agents should not break into off-platform manual patchwork when the autonomous path fails.

ai2human makes human fallback programmable, verifiable, and settlement-ready.
