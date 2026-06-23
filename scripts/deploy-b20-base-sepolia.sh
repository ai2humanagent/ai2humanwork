#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
B20_CONTRACTS_DIR="$ROOT_DIR/b20-contracts"
ENV_FILE="${1:-$B20_CONTRACTS_DIR/.env.b20}"

FORGE_BIN="${FORGE_BIN:-}"
CAST_BIN="${CAST_BIN:-}"
EXTRA_SCRIPT_FLAGS=()

if [[ -z "$FORGE_BIN" ]]; then
  if command -v base-forge >/dev/null 2>&1; then
    FORGE_BIN="base-forge"
  elif command -v forge >/dev/null 2>&1; then
    FORGE_BIN="forge"
    EXTRA_SCRIPT_FLAGS+=(--skip-simulation)
    echo "base-forge not found; falling back to stock forge with --skip-simulation."
    echo "Install Base Foundry for full B20 precompile simulation support:"
    echo "  curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash"
    echo "  base-foundryup --install v1.1.0"
  else
    echo "No forge binary found. Install Base Foundry first."
    exit 1
  fi
fi

if [[ -z "$CAST_BIN" ]]; then
  if command -v base-cast >/dev/null 2>&1; then
    CAST_BIN="base-cast"
  elif command -v cast >/dev/null 2>&1; then
    CAST_BIN="cast"
  fi
fi

if [[ -z "$CAST_BIN" ]]; then
  echo "cast or base-cast is required for post-deploy verification."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  echo "Create it with:"
  echo "  cp b20-contracts/.env.b20.example b20-contracts/.env.b20"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${RPC_URL:=https://sepolia.base.org}"
: "${CHAIN_ID:=84532}"
: "${B20_MINT_AFTER_DEPLOY:=true}"

if [[ -z "${PRIVATE_KEY:-}" || "$PRIVATE_KEY" == "0xREPLACE_WITH_BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY" ]]; then
  echo "PRIVATE_KEY is missing in $ENV_FILE"
  exit 1
fi

if [[ -z "${ACCOUNT_ADDRESS:-}" || "$ACCOUNT_ADDRESS" == "0xREPLACE_WITH_DEPLOYER_OR_ADMIN_ADDRESS" ]]; then
  echo "ACCOUNT_ADDRESS is missing in $ENV_FILE"
  exit 1
fi

cd "$B20_CONTRACTS_DIR"

if [[ ! -d "lib/forge-std" ]]; then
  echo "Installing forge-std..."
  "$FORGE_BIN" install foundry-rs/forge-std --no-git
fi

if [[ ! -d "lib/base-std" ]]; then
  echo "Installing base-std..."
  "$FORGE_BIN" install base/base-std --no-git
fi

echo "Building B20 scripts..."
"$FORGE_BIN" build script/CreateAI2HumanB20.s.sol script/MintAI2HumanB20.s.sol

echo "Deploying AI2Human B20 on Base Sepolia..."
"$FORGE_BIN" script script/CreateAI2HumanB20.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  "${EXTRA_SCRIPT_FLAGS[@]}"

TOKEN_ADDRESS="$(jq -er '.returns.token.value' "broadcast/CreateAI2HumanB20.s.sol/$CHAIN_ID/run-latest.json")"
echo "TOKEN_ADDRESS=$TOKEN_ADDRESS"

if [[ "$B20_MINT_AFTER_DEPLOY" == "true" ]]; then
  export TOKEN_ADDRESS
  echo "Minting test balance..."
  "$FORGE_BIN" script script/MintAI2HumanB20.s.sol \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    "${EXTRA_SCRIPT_FLAGS[@]}"

  echo "Verifying balance..."
  "$CAST_BIN" call "$TOKEN_ADDRESS" \
    "balanceOf(address)(uint256)" "$ACCOUNT_ADDRESS" \
    --rpc-url "$RPC_URL"
fi

echo "Explorer: https://sepolia.basescan.org/address/$TOKEN_ADDRESS"
