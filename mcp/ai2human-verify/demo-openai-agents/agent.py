"""OpenAI Agents SDK demo: verification guardrail.

Pattern demonstrated: verify before act. The agent may query verification via
the mounted MCP server, but finalizing a delivery re-runs the deterministic
verification core inside the tool and refuses without a pass. An output
guardrail trips if the agent claims completion without a receipt.
"""

from __future__ import annotations

import json
import sys

from agents import Agent, GuardrailFunctionOutput, Runner, function_tool, output_guardrail
from agents.mcp import MCPServerStdio

from verification_core import run_delivery_verification


def finalize_delivery_fn(
    order_ref: str,
    captured_at: str,
    gps_lat: float,
    gps_lng: float,
    image_hash: str,
) -> str:
    """Finalize a delivery. Refuses unless deterministic verification passes.

    Args:
        order_ref: Delivery reference id (e.g. ORD-1001).
        captured_at: ISO timestamp when the delivery photo was captured.
        gps_lat / gps_lng: GPS coordinates of the claimed delivery location.
        image_hash: sha256 hash of the delivery photo.
    """
    evidence = {
        "time": {"capturedAt": captured_at},
        "location": {"gps": {"lat": gps_lat, "lng": gps_lng}},
        "content": {"referenceId": order_ref, "imageHashes": [image_hash]},
        "process": {"source": "in_app_capture"},
    }
    record = run_delivery_verification(evidence)
    if record["verdict"] == "pass":
        return json.dumps(
            {
                "status": "finalized",
                "orderRef": order_ref,
                "receiptId": record["receipt"]["receiptId"],
                "checks": record["checks"],
            }
        )
    failed = [c for c in record["checks"] if not c.get("passed")]
    return json.dumps({"status": "refused", "reasons": failed, "missing": record["missing"]})


finalize_delivery = function_tool(finalize_delivery_fn)


async def completion_guardrail_fn(agent: Agent, output) -> GuardrailFunctionOutput:
    """Trip if the agent claims completion without a verification receipt."""
    text = output if isinstance(output, str) else str(output)
    claims_done = "finalized" in text.lower() or "delivered" in text.lower()
    has_receipt = "receiptId" in text
    if claims_done and not has_receipt:
        return GuardrailFunctionOutput(
            tripwire_triggered=True,
            output_info={"reason": "completion claimed without a verification receipt"},
        )
    return GuardrailFunctionOutput(tripwire_triggered=False, output_info={})


completion_guardrail = output_guardrail(completion_guardrail_fn)


def build_agent(mcp_server: MCPServerStdio) -> Agent:
    return Agent(
        name="delivery-agent",
        instructions=(
            "You finalize delivery claims. Evidence: order reference, capture timestamp, "
            "GPS, image hash. You may call verify_claim (MCP) to pre-check. To finalize, "
            "call finalize_delivery with the exact evidence. NEVER claim a delivery is "
            "finalized or completed unless finalize_delivery returns status 'finalized' "
            "with a receiptId. If it is refused, report the reasons and do not claim completion."
        ),
        tools=[finalize_delivery],
        mcp_servers=[mcp_server],
        output_guardrails=[completion_guardrail],
    )


async def run_scenarios(mcp_server: MCPServerStdio) -> None:
    agent = build_agent(mcp_server)

    print("=== Scenario A: valid evidence ===")
    result_a = await Runner.run(
        agent,
        "The rider reports order ORD-1001 was delivered. Evidence: captured at "
        "2026-08-20T12:30:00Z, gps 31.23,121.47, image hash "
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa. Verify and finalize.",
    )
    print("A output:", result_a.final_output)

    print("\n=== Scenario B: invalid evidence (unknown order) ===")
    result_b = await Runner.run(
        agent,
        "The rider reports order ORD-9999 was delivered. Evidence: captured at "
        "2026-08-20T12:30:00Z, gps 31.23,121.47, image hash "
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb. Verify and finalize.",
    )
    print("B output:", result_b.final_output)

    print("\n=== Guardrail direct check: completion claim without receipt must trip ===")
    check = await completion_guardrail(agent, "The delivery is finalized.")
    print("tripwire_triggered:", check.tripwire_triggered)
    assert check.tripwire_triggered is True
    print("Guardrail OK.")


async def main() -> None:
    import asyncio
    from pathlib import Path

    server = MCPServerStdio(
        params={
            "command": sys.executable,
            "args": [str(Path(__file__).parent / "verify_claim_mcp_server.py")],
        }
    )
    async with server:
        await run_scenarios(server)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
