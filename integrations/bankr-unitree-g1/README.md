# Unitree G1 Control — Bankr Skill

This folder is the Bankr-ready skill package for controlling a real **Unitree G1
humanoid robot** from the timeline.

The skill teaches an agent how to turn natural language into safe, whitelisted
robot actions:

```text
user prompt -> map to whitelisted action -> POST /command -> report result
```

The agent never talks to the robot directly. It calls a small **bridge** the
user runs on the robot's LAN (see `../../unitree-skill/`). The bridge owns all
safety and refuses unsafe actions.

## Files

- `SKILL.md` — the Bankr skill to submit or install from GitHub.
- `examples/wave-hello.json` — simplest single action.
- `examples/come-here.json` — multi-step motion (stand → balance → walk).
- `examples/sit-down.json` — pose change.
- `scripts/smoke.mjs` — endpoint smoke test (health → state → command).

## What The User Provides

Two values, mirroring the Tesla "paste your key" flow:

| Input | Description |
|---|---|
| `BRIDGE_URL` | Public URL of the G1 bridge (cloudflared/ngrok), e.g. `https://xxxx.trycloudflare.com`. |
| `BRIDGE_TOKEN` | Secret bearer token set on the bridge (`BRIDGE_TOKEN` env var). |

## Run The Bridge (once, on the robot's LAN)

From the sibling `unitree-skill/` package:

```bash
export BRIDGE_TOKEN=$(openssl rand -hex 24)
export G1_MOCK=1   # drop this once the real robot is on the LAN
uvicorn bridge.server:app --host 0.0.0.0 --port 8080
```

Then expose it with a tunnel (e.g. `cloudflared tunnel --url http://localhost:8080`)
and copy the public URL into `BRIDGE_URL`.

## Install From GitHub

Once this folder is pushed to a public repository, tell a Bankr/OpenClaw-style
agent:

```text
install the skill at https://github.com/YOUR_ORG/unitree-skill/tree/main/integrations/bankr-unitree-g1
```

Then just talk to it on the timeline:

```text
@yourbot wave hello on my G1
```

Expected reply:

```text
done on your G1: waved hello 👋 — robot was balance-standing, battery 86%.
```

## Smoke Test

```bash
BRIDGE_URL="https://xxxx.trycloudflare.com" \
BRIDGE_TOKEN="your-bearer-token" \
node integrations/bankr-unitree-g1/scripts/smoke.mjs
```

Optional action override:

```bash
ACTION=sit \
BRIDGE_URL="..." BRIDGE_TOKEN="..." \
node integrations/bankr-unitree-g1/scripts/smoke.mjs
```

The test checks reachability (`/health`), token + readiness (`/state`), and a
real action (`/command`). A `422` from `/command` is a valid, expected result —
it means the bridge refused the action for safety.

## Scope

In scope for v1:

- Map natural language to one whitelisted G1 action.
- Check state before motion; sequence stand → balance → walk when needed.
- Report battery/state back in a crisp, timeline-friendly line.
- Surface `422` safety refusals plainly.

Out of scope for v1:

- Any action outside the bridge whitelist.
- Bypassing the bridge's safety gating.
- Talking to the robot SDK directly from the agent.
