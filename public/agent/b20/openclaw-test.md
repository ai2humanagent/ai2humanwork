# OpenClaw Test: AI2Human B20 Agent Skill

Use this prompt to test the AI2Human B20 Skill from OpenClaw.

```text
Read https://ai2human.io/agent/b20-skill.md

Then test the B20 Agent Skill with this example:
https://ai2human.io/agent/b20/examples/rwa-community-token.json

Call:
POST https://ai2human.io/api/agent/b20/preview

Show me:
1. tokenConfig
2. rolesConfig
3. policyConfig
4. proofRequirements
5. deploymentPlan
6. missingInputs
7. warnings

Also confirm the Base Sepolia proof deployment:
0xb200000000000000000000eaE911AAD5435c86F3
```

Expected behavior:

- OpenClaw should return a dry-run B20 configuration bundle.
- It should not ask for private keys.
- It should not broadcast a transaction.
- It should explain how AI2Human proof maps into roles, allowlists, mint eligibility, or policy updates.

Live endpoints:

- Skill: `https://ai2human.io/agent/b20-skill.md`
- Demo page: `https://ai2human.io/agent/b20`
- Preview API: `https://ai2human.io/api/agent/b20/preview`
- Example payload: `https://ai2human.io/agent/b20/examples/rwa-community-token.json`
- Testnet token: `https://sepolia.basescan.org/address/0xb200000000000000000000eaE911AAD5435c86F3`
