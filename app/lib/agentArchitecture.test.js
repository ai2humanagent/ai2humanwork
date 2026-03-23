import test from "node:test";
import assert from "node:assert/strict";
import { getTaskAgentArchitecture } from "./agentArchitecture.js";

test("marks x402 gate as ready once human proof exists", () => {
  const roles = getTaskAgentArchitecture({
    status: "human_done",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:10:00.000Z",
    evidence: []
  });

  const x402Role = roles.find((role) => role.id === "x402_gate_agent");
  assert.equal(x402Role.state, "ready");
});

test("marks x402 gate as done once unlock evidence is recorded", () => {
  const roles = getTaskAgentArchitecture({
    status: "paid",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:10:00.000Z",
    evidence: [
      {
        id: "1",
        by: "system",
        type: "note",
        content: "x402_bundle_paid: 0.01 USDT by 0x1111111111111111111111111111111111111111",
        createdAt: "2026-03-22T00:10:00.000Z"
      }
    ]
  });

  const x402Role = roles.find((role) => role.id === "x402_gate_agent");
  assert.equal(x402Role.state, "done");
});
