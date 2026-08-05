---
name: unitree-g1-control
homepage: https://github.com/YOUR_ORG/unitree-skill
description: >
  Control a real Unitree G1 humanoid robot from an agent prompt.
  Use when a user wants their G1 to perform a physical action ("wave hello",
  "shake hands", "sit down", "come here") from the timeline. The agent maps
  natural language to a safe, whitelisted action and calls the user's bridge
  over HTTP. The bridge owns all safety and refuses unsafe actions.
metadata:
  clawdbot:
emoji: 🤖
requires:
  bins: ["node"]
---

# Unitree G1 Humanoid Control

You control a **real Unitree G1 humanoid robot** through a small bridge server
the user runs on the robot's local network. You never talk to the robot
directly — you only call the bridge's HTTP API. The bridge owns all safety: it
rejects unsafe actions, so trust its responses.

Core loop:

```text
user prompt -> map to whitelisted action -> POST /command -> report result
```

## Setup (ask the user once)

To use this skill the user must provide two values:

1. `BRIDGE_URL` — the public URL of their G1 bridge (from cloudflared/ngrok),
   e.g. `https://xxxx.trycloudflare.com`.
2. `BRIDGE_TOKEN` — the secret bearer token configured on the bridge.

Every request includes the header: `Authorization: Bearer <BRIDGE_TOKEN>`.

## How To Handle A Request

1. **Map** the user's natural language to exactly one action from the whitelist
   below. If nothing matches, tell the user what the robot *can* do.
2. **Check state first** for any motion/pose change: call `GET /state`. If the
   robot is not ready (`fsm != balance_stand`) and the user asked for movement,
   first issue `balance_stand`, then the action.
3. **Send** `POST /command` with `{"action": "<name>"}`.
4. **Report** results in a crisp, timeline-friendly style, e.g.:
   > done on your G1: waved hello 👋 — robot was balance-standing, battery 87%.
5. If the bridge returns HTTP **422**, it *refused* the action for safety. Read
   `message`, explain plainly, and suggest the fix (e.g. "battery too low",
   "robot is sitting — say 'stand up' first"). Never retry a refused action
   without addressing the reason.
6. If an action is marked **dangerous**, ask the user to confirm, then resend
   with `{"action": "<name>", "confirm": true}`.

## Endpoints

### `GET /state`
Returns `{ fsm, battery, ready, mock }`. Call before motion.

### `GET /actions`
Returns the live whitelist with per-action requirements. Source of truth if in
doubt.

### `POST /command`
Header: `Authorization: Bearer <BRIDGE_TOKEN>`
Body: `{ "action": string, "confirm"?: boolean }`
Success (200): `{ ok: true, action, message, state }`
Refused (422): `{ ok: false, action, message, state }`

## Action Whitelist

| Say something like… | action | Notes |
|---|---|---|
| "wave", "say hi", "wave hello" | `wave` | needs standing |
| "shake hands", "give me a handshake" | `shake_hand` | needs balance stand |
| "stand up", "get up" | `stand_up` | from sit/damp |
| "get ready", "balance", "steady" | `balance_stand` | required before walking |
| "sit down", "take a seat" | `sit` | |
| "stand tall", "rise up" | `high_stand` | |
| "crouch", "get low" | `low_stand` | |
| "walk forward", "come here", "step forward" | `walk_forward` | needs ready + battery ≥30% |
| "turn around", "spin" | `turn` | needs ready + battery ≥30% |
| "relax", "soften", "damp" | `damp` | safe soft state |
| "go limp", "release" | `zero_torque` | **dangerous** — must be supported; confirm required |

## Example Interactions

**User:** wave hello to everyone
→ `GET /state` → ready
→ `POST /command {"action":"wave"}`
→ "done on your G1: waved hello 👋 (battery 86%)."

**User:** come here
→ `GET /state` → fsm `sit`, not ready
→ `POST /command {"action":"stand_up"}` → then `{"action":"balance_stand"}`
→ `POST /command {"action":"walk_forward"}`
→ "stood up, balanced, and walked forward. battery 84%."

**User:** go limp
→ dangerous → "That makes the robot go completely limp — make sure it's
supported. Confirm?" → on yes → `POST /command {"action":"zero_torque","confirm":true}`

## Safety Contract

- Never invent actions outside the whitelist.
- Never bypass a 422 refusal.
- Always surface battery / state to the user when reporting.
- For anything involving walking or falling risk, prefer confirming with the
  user if context is ambiguous.

## cURL Smoke Tests

Check robot state:

```bash
curl -sS "$BRIDGE_URL/state" \
  -H "Authorization: Bearer $BRIDGE_TOKEN"
```

Expected: `200` with `{ fsm, battery, ready, mock }`.

Send a wave:

```bash
curl -sS "$BRIDGE_URL/command" \
  -H "Authorization: Bearer $BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"wave"}'
```

Expected: `200` with `{ ok: true, action: "wave", message, state }`, or `422`
if the bridge refused it for safety.

## Important Limitations

- This controls **physical hardware**. Only send actions the user clearly asked
  for.
- The bridge is the single source of truth for safety and the live whitelist.
- Motion is rate-limited by the bridge; do not spam commands.
- If `mock` is `true` in `/state`, no real robot is attached — the bridge is in
  simulation and responses are safe to test with.

## Project Links

- Skill source: https://github.com/YOUR_ORG/unitree-skill
