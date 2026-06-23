# AI2Human B20 Testnet Contracts

Standalone Base Sepolia deployment package for the AI2Human B20 Agent Skill.

It deploys a B20 `ASSET` token through Base's `B20Factory` precompile, grants the deployer the standard B20 roles, sets a supply cap, and optionally mints a small test balance.

## Setup

Install Base Foundry:

```bash
curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash
base-foundryup --install v1.1.0
```

Install dependencies:

```bash
base-forge install foundry-rs/forge-std --no-git
base-forge install base/base-std --no-git
```

Prepare env:

```bash
cp .env.b20.example .env.b20
```

Fill `PRIVATE_KEY` and `ACCOUNT_ADDRESS` with a Base Sepolia funded deployer.

## Deploy

From the repository root:

```bash
./scripts/deploy-b20-base-sepolia.sh
```

Or manually:

```bash
source .env.b20
base-forge script script/CreateAI2HumanB20.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Explorer:

```text
https://sepolia.basescan.org/address/<TOKEN_ADDRESS>
```
