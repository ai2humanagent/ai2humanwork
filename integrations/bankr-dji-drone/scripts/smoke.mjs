#!/usr/bin/env node

// Smoke test for the DJI Enterprise Drone Bankr skill.
// It exercises the safe path the agent uses: GET /state, then a NON-FLIGHT
// payload command (capture_photo). It never launches the drone.
//
// Usage:
//   BRIDGE_URL="https://xxxx.trycloudflare.com" \
//   BRIDGE_TOKEN="your-bearer-token" \
//   node integrations/bankr-dji-drone/scripts/smoke.mjs
//
// Optional:
//   ACTION=capture_photo   (default: capture_photo — a safe, non-flight command)
//
// NOTE: this test deliberately does NOT send takeoff/goto/orbit. Flight actions
// must be triggered by an explicit, confirmed user request.

const baseUrl = (process.env.BRIDGE_URL || "").replace(/\/$/, "");
const token = process.env.BRIDGE_TOKEN || "";
const action = process.env.ACTION || "capture_photo";

const FLIGHT_ACTIONS = new Set([
  "takeoff", "goto", "orbit", "set_altitude", "land_now", "hover"
]);

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function main() {
  if (!baseUrl || !token) {
    throw new Error("Set BRIDGE_URL and BRIDGE_TOKEN before running the smoke test.");
  }
  if (FLIGHT_ACTIONS.has(action)) {
    throw new Error(`Refusing to send flight action '${action}' from a smoke test. Use a non-flight command like capture_photo.`);
  }

  // 1) health (no auth) — confirms the bridge is reachable
  const health = await fetch(`${baseUrl}/health`);
  const healthJson = await health.json().catch(() => ({}));
  console.log("health", { status: health.status, mock: healthJson.mock });

  // 2) state (auth) — confirms the token works and shows readiness
  const state = await fetch(`${baseUrl}/state`, { headers: authHeaders() });
  const stateJson = await state.json().catch(() => ({}));
  console.log("state", {
    status: state.status,
    online: stateJson.online,
    flight_status: stateJson.flight_status,
    battery: stateJson.battery,
    gps_fix: stateJson.gps_fix,
    geofence_ok: stateJson.geofence_ok
  });

  if (state.status !== 200) {
    throw new Error(`Expected /state to return 200. Got ${state.status} — check BRIDGE_TOKEN.`);
  }

  // 3) command (auth, non-flight) — the safe action the agent could send
  const command = await fetch(`${baseUrl}/command`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action })
  });
  const commandJson = await command.json().catch(() => ({}));
  console.log("command", {
    status: command.status,
    ok: commandJson.ok,
    action: commandJson.action,
    message: commandJson.message
  });

  if (command.status === 200 && commandJson.ok) {
    console.log(`OK: bridge accepted '${action}'.`);
    return;
  }
  if (command.status === 422) {
    console.log(`Bridge refused '${action}' for safety: ${commandJson.message}. This is a valid, expected response.`);
    return;
  }

  throw new Error(`Unexpected /command result: ${command.status} ${JSON.stringify(commandJson)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
