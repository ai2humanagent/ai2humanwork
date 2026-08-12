# DJI Enterprise Drone Control — Bankr Skill

This folder is the Bankr-ready skill package for controlling a real **DJI
enterprise drone** (Matrice 4 series + DJI Dock) from the timeline.

```text
user prompt -> map to whitelisted command -> POST /command -> report result
```

The agent never talks to the drone or to DJI directly. It calls a small
**bridge** the user runs, which talks to DJI's Cloud API over MQTT/HTTPS. The
bridge owns all safety — geofence, max altitude, no-fly zones, battery/RTH
gating — and refuses unsafe commands.

This mirrors the `bankr-unitree-g1` skill exactly — same "agent → your bridge →
real hardware" shape. Because it's an aircraft, the safety layer is heavier:
take-off requires confirmation, geofence/altitude are hard limits, and
`return_to_home` is a universal, never-refused fallback.

## Files

- `SKILL.md` — the Bankr skill to submit or install from GitHub.
- `bridge/server.py` — the bridge (FastAPI). HTTP contract the skill calls, plus a
  built-in flight simulator and a live SSE feed for the web simulator. Owns all safety.
- `bridge/requirements.txt` — bridge dependencies (`fastapi`, `uvicorn`).
- `web/index.html` — the **web simulator**: a map with the geofence ring and a live
  drone icon, a state panel (battery/GPS/altitude/geofence), manual control buttons,
  and a live log of every `/command` (green accepted / red 422 refused).
- `examples/takeoff-hover.json` — confirmed take-off then hover.
- `examples/orbit-film.json` — orbit a point while recording.
- `examples/geofence-refusal.json` — a refused command (422) and recovery.
- `examples/return-home.json` — the universal safe fallback.
- `scripts/smoke.mjs` — endpoint smoke test (state → capture_photo, no flight).

## What The User Provides

Two values, mirroring the G1 "paste your key" flow:

| Input | Description |
|---|---|
| `BRIDGE_URL` | Public URL of the drone bridge (cloudflared/ngrok), e.g. `https://xxxx.trycloudflare.com`. |
| `BRIDGE_TOKEN` | Secret bearer token set on the bridge (`BRIDGE_TOKEN` env var). |

The DJI Cloud API credentials and geofence/no-fly config live **only** on the
bridge, never in the agent.

## Try It With Zero Hardware (web simulator)

The bridge ships with a built-in flight simulator and a browser-based simulator,
so you can watch the whole `agent → bridge → drone` chain fly with **no aircraft**.

```bash
cd integrations/bankr-dji-drone
pip install -r bridge/requirements.txt
export BRIDGE_TOKEN=$(openssl rand -hex 24)
export DRONE_MOCK=1
uvicorn bridge.server:app --host 0.0.0.0 --port 8080
```

Then open **http://localhost:8080/** — you'll see a dark map with:

- the **home/dock** marker and the **500 m geofence ring**,
- a live **🚁 drone icon** that actually moves when it flies,
- a **state panel** (battery, GPS, altitude, distance from home, geofence status),
- **manual buttons** (take off, orbit, fly north, "fly 2 km" → watch it get refused,
  return-to-home), each sending a real `POST /command` to the bridge,
- a **live log** where every command shows up green (accepted) or red (422 refused).

Anything the agent (or `scripts/smoke.mjs`) sends through the bridge also appears
here in real time — the map, the panel, and the log all update over SSE.

## Run The Bridge For Real (near the Dock)

Same server, but point it at a real DJI Dock instead of the simulator by dropping
`DRONE_MOCK` and supplying your DJI Cloud API credentials (the MQTT backend is the
one remaining piece to wire in place of the mock state machine):

```bash
export BRIDGE_TOKEN=$(openssl rand -hex 24)
export DJI_CLOUD_APP_KEY=...
export DJI_CLOUD_APP_SECRET=...
export GEOFENCE_RADIUS_M=500     # hard limit around home
export MAX_ALT_M=120             # hard altitude ceiling
export DRONE_MOCK=0              # 0 = real Dock + drone (needs MQTT backend)
uvicorn bridge.server:app --host 0.0.0.0 --port 8080
```

Then expose it with a tunnel (e.g. `cloudflared tunnel --url http://localhost:8080`)
and copy the public URL into `BRIDGE_URL`.

> Simulator vs. real: with `DRONE_MOCK=1` the bridge answers `/state` and `/command`
> from its internal flight model (and reports `mock:true`). Switching to a real Dock
> means replacing that internal model with a DJI Cloud API (MQTT) backend — the HTTP
> contract, geofence/altitude/battery gating, and take-off confirmation stay identical,
> so the skill and the web simulator don't change. See the community
> [`dji-cloud-simulator`](https://github.com/YuYongJu/dji-cloud-simulator) for a
> protocol-accurate MQTT device to test that backend against before real hardware.

> Hardware note: only DJI **enterprise** gear is supported — Matrice 4 series
> operating from a DJI Dock via Cloud API. Consumer drones (Mini/Air/Mavic) have
> no supported third-party control path and cannot be used with this skill.

## Install From GitHub

```text
install the skill at https://github.com/YOUR_ORG/unitree-skill/tree/main/integrations/bankr-dji-drone
```

Then talk to it on the timeline:

```text
@yourbot take off and orbit the tower, film it
```

Expected reply:

```text
🚁 airborne — orbiting at 20 m radius and recording. battery 88%, inside geofence.
```

## Smoke Test

```bash
BRIDGE_URL="https://xxxx.trycloudflare.com" \
BRIDGE_TOKEN="your-bearer-token" \
node integrations/bankr-dji-drone/scripts/smoke.mjs
```

By default the test only checks reachability (`/health`), token + readiness
(`/state`), and a **non-flight** payload command (`capture_photo`). It never
launches the drone. A `422` from `/command` is a valid, expected result — it
means the bridge refused the command for safety.

## Scope

In scope for v1:

- Map natural language to one whitelisted flight/payload command.
- Check state (online, GPS, battery, geofence) before flight.
- Require confirmation for take-off and other dangerous actions.
- Enforce geofence/altitude/no-fly via the bridge; surface 422 refusals plainly.
- Keep `return_to_home` as a universal, never-refused fallback.

Out of scope for v1:

- Consumer DJI drones (no supported control SDK).
- Any command outside the bridge whitelist / geofence.
- Bypassing the bridge's safety gating.
- Talking to the DJI Cloud API directly from the agent.
