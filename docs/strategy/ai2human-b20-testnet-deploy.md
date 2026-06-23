# AI2Human B20 Base Sepolia Deploy Runbook

This runbook turns the AI2Human B20 Agent Skill output into a real Base Sepolia B20 token deployment.

## What Gets Deployed

- Variant: `ASSET`
- Default name: `AI2Human Verified Proof Token`
- Default symbol: `A2HP`
- Default supply cap: `1,000,000`
- Admin/minter/pauser/metadata/operator: `ACCOUNT_ADDRESS`
- Contract URI: `https://ai2human.work/agent/b20/manifest.json`

This is a testnet proof that AI2Human can move from:

```text
agent request -> B20 config -> roles and policies -> deploy -> mint -> verify
```

## Requirements

Install Base Foundry, because standard Foundry does not register Base B20 precompiles:

```bash
curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash
base-foundryup --install v1.1.0
```

Prepare a Base Sepolia deployer with testnet ETH.

Copy the env template:

```bash
cd b20-contracts
cp .env.b20.example .env.b20
```

Set:

- `PRIVATE_KEY`
- `ACCOUNT_ADDRESS`

Do not commit `.env.b20`.

## Build

```bash
cd contracts
base-forge build
```

## Deploy On Base Sepolia

One-command path:

```bash
./scripts/deploy-b20-base-sepolia.sh
```

Manual path:

```bash
cd b20-contracts
source .env.b20
base-forge script script/CreateAI2HumanB20.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Copy the `AI2Human B20 token` address from the console output or from:

```bash
jq -er '.returns.token.value' broadcast/CreateAI2HumanB20.s.sol/84532/run-latest.json
```

Then update `.env.b20`:

```bash
TOKEN_ADDRESS=0x...
```

## Mint A Test Balance

```bash
cd b20-contracts
source .env.b20
base-forge script script/MintAI2HumanB20.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

## Verify Balance

```bash
source .env.b20
base-cast call "$TOKEN_ADDRESS" \
  "balanceOf(address)(uint256)" "$ACCOUNT_ADDRESS" \
  --rpc-url "$RPC_URL"
```

Explorer:

```text
https://sepolia.basescan.org/address/<TOKEN_ADDRESS>
```

Current Base Sepolia test deployment:

```text
0xb200000000000000000000eaE911AAD5435c86F3
```

Create tx:

```text
0xf0227290cc7f3ff16ebf7181e1c1ccc3719780929529336e61b9f7cab44c81b0
```

Mint tx:

```text
0xf202ad26cdaac02c55c396f48af9d16bff68742dce5221f11a9eaa2fe61aac6a
```

## Notes

- The deployed token is a Base Sepolia testnet artifact.
- `scripts/deploy-b20-base-sepolia.sh` refuses to run without `base-forge`, `base-cast`, `PRIVATE_KEY`, and `ACCOUNT_ADDRESS`.
- Mainnet launch should wait until the Base Beryl/B20 mainnet environment is live and verified.
- For production, AI2Human proof should gate role assignment, allowlist membership, mint eligibility, or policy updates before privileged token operations happen.

## Official References

- Base B20 spec: `https://docs.base.org/base-chain/specs/upgrades/beryl/b20`
- Base B20 launch guide: `https://docs.base.org/get-started/launch-b20-token`
