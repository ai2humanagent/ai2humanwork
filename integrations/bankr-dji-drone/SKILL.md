---
name: dji-drone-control
homepage: https://github.com/YOUR_ORG/unitree-skill
description: >
  Control a real DJI enterprise drone (Matrice 4 series + Dock) from an agent
  prompt. Use when a user wants their drone to perform a physical action ("take
  off", "orbit the tower", "fly to this point and shoot a photo", "come home").
  The agent maps natural language to a safe, whitelisted flight command and calls
  the user's bridge over HTTP. The bridge owns all safety — geofence, altitude
  limits, no-fly zones, battery/RTH gating — and refuses unsafe commands.
metadata:
  clawdbot:
emoji: 🚁
requires:
  bins: ["node"]
---

# DJI Enterprise Drone Control

You control a **real DJI enterprise drone** (Matrice 4 series operating from a
DJI Dock) through a small bridge server the user runs, which talks to DJI's
Cloud API. You never talk to the drone or DJI directly — you only call the
bridge's HTTP API. The bridge owns all safety: geofence, max altitude, no-fly
zones, battery thresholds, and return-to-home. It rejects unsafe commands, so
trust its responses.

Flying a drone is inherently higher-risk than a ground robot. Be conservative:
when in doubt, do not fly.

Core loop:

```text
user prompt -> map to whitelisted command -> POST /command -> report result
```

## Setup (ask the user once)

To use this skill the user must provide two values:

1. `BRIDGE_URL` — the public URL of their drone bridge (from cloudflared/ngrok),
   e.g. `https://xxxx.trycloudflare.com`.
2. `BRIDGE_TOKEN` — the secret bearer token configured on the bridge.

Every request includes the header: `Authorization: Bearer <BRIDGE_TOKEN>`.
The bridge holds the DJI Cloud API credentials and the geofence/no-fly config —
never ask the user to paste those to you.

## How To Handle A Request

1. **Map** the user's natural language to exactly one command from the whitelist
   below. If nothing matches, tell the user what the drone *can* do.
2. **Check state first** for any flight action: call `GET /state`. Verify
   `online`, `battery`, `gps_fix`, and `flight_status`. If the drone is not
   ready (offline, poor GPS, low battery), explain and stop.
3. **Take-off is dangerous** and always requires confirmation. Send it with
   `{"action":"takeoff","confirm":true}`.
4. **Send** `POST /command` with `{"action": "<name>", ...params}`.
5. If the bridge returns HTTP **422**, it *refused* the command for safety. Read
   `message`, explain plainly, suggest the fix (e.g. "outside geofence",
   "above max altitude", "battery below RTH threshold", "in a no-fly zone").
   Never retry a refused command without addressing the reason.
6. For any `dangerous` command, confirm with the user first, then resend with
   `{"confirm": true}`.
7. **Return-to-home is always allowed** and never refused — treat it as the
   safe fallback whenever anything is ambiguous or the user seems worried.

## Endpoints

### `GET /state`
Returns `{ online, flight_status, battery, gps_fix, altitude_m, geofence_ok, home_set }`.
Call before any flight action. `flight_status` ∈ `on_dock | idle | flying | returning`.

### `GET /actions`
Returns the live whitelist with per-command requirements and limits. Source of
truth if in doubt.

### `POST /command`
Header: `Authorization: Bearer <BRIDGE_TOKEN>`
Body: `{ "action": string, "confirm"?: boolean, ...params }`
Success (200): `{ ok: true, action, message, state }`
Refused (422): `{ ok: false, action, message, state }`

## Command Whitelist

| Say something like… | action | Params / Notes |
|---|---|---|
| "take off", "launch" | `takeoff` | **dangerous** — confirm; needs GPS fix + battery ≥50% |
| "hover", "hold position" | `hover` | must be flying |
| "fly to this point" | `goto` | `{lat,lon,alt_m}` — must be inside geofence + under max alt |
| "orbit the tower", "circle" | `orbit` | `{radius_m,alt_m}` — center = current or given point |
| "take a photo", "shoot" | `capture_photo` | payload command; any flight status |
| "start recording" | `start_video` | payload command |
| "stop recording" | `stop_video` | payload command |
| "point the camera at…" | `gimbal` | `{pitch,yaw}` within limits |
| "go up / down to X m" | `set_altitude` | must stay under max alt + inside geofence |
| "come home", "return", "land" | `return_to_home` | **always allowed**, never refused |
| "emergency land now" | `land_now` | **dangerous** — lands at current position; confirm |

## Example Interactions

**User:** take off and hover
→ `GET /state` → on_dock, GPS good, battery 92%
→ dangerous → "Taking off puts a real drone in the air. Confirm?"
→ on yes → `POST /command {"action":"takeoff","confirm":true}` → then `{"action":"hover"}`
→ "🚁 airborne and holding at 15 m. battery 90%, inside geofence."

**User:** orbit that antenna and film it
→ `GET /state` → flying
→ `POST /command {"action":"orbit","radius_m":20,"alt_m":30}` → then `{"action":"start_video"}`
→ "🚁 orbiting at 20 m radius, recording. battery 76%."

**User:** fly 2 km east
→ bridge returns 422 → "Can't — that's outside the geofence your bridge enforces
(max ~500 m from home). I can fly to a point inside it or orbit here."

**User:** something looks wrong, bring it back
→ `POST /command {"action":"return_to_home"}`
→ "🚁 returning to home and landing on the dock. battery 71%."

## Safety Contract

- **Never take off without explicit confirmation.**
- Never bypass a 422 refusal — geofence, altitude, no-fly, and battery gates are hard limits.
- Always check `/state` (online, GPS, battery, geofence) before flight actions.
- `return_to_home` is the universal safe fallback — prefer it whenever unsure.
- Never invent commands or coordinates outside the whitelist / geofence.
- Never ask the user for DJI Cloud API credentials — the bridge holds them.
- Respect local aviation rules: the bridge enforces no-fly zones, but you should
  still refuse obviously illegal requests (over crowds, airports, out of sight).
- If `mock` is `true` in `/state`, no real drone is attached — the bridge is in
  simulation and safe to test with.

## cURL Smoke Tests

Check drone state:

```bash
curl -sS "$BRIDGE_URL/state" \
  -H "Authorization: Bearer $BRIDGE_TOKEN"
```

Expected: `200` with `{ online, flight_status, battery, gps_fix, geofence_ok }`.

Capture a photo (payload command, no flight):

```bash
curl -sS "$BRIDGE_URL/command" \
  -H "Authorization: Bearer $BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"capture_photo"}'
```

Expected: `200` with `{ ok: true, action: "capture_photo", message, state }`,
or `422` if the bridge refused it.

## Important Limitations

- This controls **a real aircraft**. Only send actions the user clearly asked for.
- Only DJI **enterprise** hardware is supported (Matrice 4 series + Dock via
  Cloud API). Consumer drones (Mini/Air/Mavic) have no supported control SDK.
- The bridge is the single source of truth for safety, geofence, and the whitelist.
- Flight commands are rate-limited by the bridge; do not spam.

## Project Links

- Skill source: https://github.com/YOUR_ORG/unitree-skill
