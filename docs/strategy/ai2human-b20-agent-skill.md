# AI2Human B20 Agent Skill

## Status

- Built: yes
- Live skill path after deploy: `https://ai2human.work/agent/b20-skill.md`
- Live manifest path after deploy: `https://ai2human.work/agent/b20/manifest.json`
- Preview API after deploy: `POST https://ai2human.work/api/agent/b20/preview`
- Onchain deployment: not included in v1

## Product Position

AI2Human B20 Agent Skill is a proof-to-policy generator for B20 token systems on Base.

The product line:

```text
B20 gives tokens native rules. AI2Human gives those rules verifiable inputs.
```

The skill does not position AI2Human as a B20 launchpad. It positions AI2Human as the infrastructure layer that helps agents and builders decide:

- who can mint
- who can receive a role
- who belongs on an allowlist
- who should be blocked or reviewed
- what proof should be attached to a token action

## What v1 Does

An agent can send a request such as:

```text
Create a B20 token for a verified RWA community.
Max supply 1,000,000.
Only verified members can mint.
Admin can freeze risky addresses.
Require AI2Human proof before role assignment.
```

The preview endpoint returns:

- `tokenConfig`
- `rolesConfig`
- `policyConfig`
- `proofRequirements`
- `deploymentPlan`
- `missingInputs`
- `nextQuestions`
- `warnings`

This is useful before B20 goes live because it lets agents produce reviewable token plans without pretending to deploy.

## Technical Surface

The implementation preserves Base B20 concepts from the official docs:

- `ASSET` and `STABLECOIN` variants
- B20Factory method: `createB20(variant, salt, params, initCalls)`
- roles:
  - `DEFAULT_ADMIN_ROLE`
  - `MINT_ROLE`
  - `BURN_ROLE`
  - `BURN_BLOCKED_ROLE`
  - `PAUSE_ROLE`
  - `UNPAUSE_ROLE`
  - `METADATA_ROLE`
  - Asset-only `OPERATOR_ROLE`
- policy scopes:
  - `TRANSFER_SENDER_POLICY`
  - `TRANSFER_RECEIVER_POLICY`
  - `TRANSFER_EXECUTOR_POLICY`
  - `MINT_RECEIVER_POLICY`
- `ALLOWLIST` and `BLOCKLIST`
- `mintWithMemo` / memo-ready proof hash
- supply-cap planning
- `policyExists(policyId)` warning before attaching policies

## Files

- Skill: `public/agent/b20-skill.md`
- Manifest: `public/agent/b20/manifest.json`
- Example payload: `public/agent/b20/examples/rwa-community-token.json`
- Preview route: `app/api/agent/b20/preview/route.ts`
- Generator: `app/lib/b20AgentSkill.js`
- Tests: `app/lib/b20AgentSkill.test.js`

## Example X Post

```text
We’re building the AI2Human B20 Agent Skill.

Agents describe the token.
AI2Human turns it into proof-based B20 rules.

Roles.
Policies.
Supply caps.
Freeze controls.
Mint eligibility.
Human-verified proof inputs.

B20 gives tokens native rules.
AI2Human gives those rules verifiable inputs.

Launching after Beryl.

Comment “B20 Skill” for early access.

#B20 #Base #AI2Human #RWA
```
