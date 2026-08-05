#!/usr/bin/env node

// Smoke test for the Unitree G1 Bankr skill.
// It exercises the same path the agent uses: GET /state, then POST /command.
//
// Usage:
//   BRIDGE_URL="https://xxxx.trycloudflare.com" \
//   BRIDGE_TOKEN="your-bearer-token" \
//   node integrations/bankr-unitree-g1/scripts/smoke.mjs
//
// Optional:
//   ACTION=wave   (default: wave)

const baseUrl = (process.env.BRIDGE_URL || "").replace(/\/$/, "");
const token = process.env.BRIDGE_TOKEN || "";
const action = process.env.ACTION || "wave";

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function main() {
  if (!baseUrl || !token) {
    throw new Error("Set BRIDGE_URL and BRIDGE_TOKEN before running the smoke test.");
  }

  // 1) health (no auth) — confirms the bridge is reachable
  const health = await fetch(`${baseUrl}/health`);
  const healthJson = await health.json().catch(() => ({}));
  console.log("health", { status: health.status, mock: healthJson.mock, mode: healthJson.mode });

  // 2) state (auth) — confirms the token works and shows readiness
  const state = await fetch(`${baseUrl}/state`, { headers: authHeaders() });
  const stateJson = await state.json().catch(() => ({}));
  console.log("state", {
    status: state.status,
    fsm: stateJson.fsm,
    battery: stateJson.battery,
    ready: stateJson.ready
  });

  if (state.status !== 200) {
    throw new Error(`Expected /state to return 200. Got ${state.status} — check BRIDGE_TOKEN.`);
  }

  // 3) command (auth) — the actual action the agent would send
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
