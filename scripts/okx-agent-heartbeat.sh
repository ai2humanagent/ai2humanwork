#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.20.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

LOG_DIR="$HOME/Library/Logs/ai2human"
mkdir -p "$LOG_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

{
  echo "[$(timestamp)] sending OKX.AI agent heartbeat"
  onchainos agent heartbeat --chain-index 196
  echo "[$(timestamp)] heartbeat ok"
} >> "$LOG_DIR/okx-agent-heartbeat.log" 2>&1
