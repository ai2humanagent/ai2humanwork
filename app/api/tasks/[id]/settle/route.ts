import { NextResponse } from "next/server";
import { updateDb } from "../../../../lib/store";
import { checkAdminAuth } from "../../../../lib/adminAuth";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";
import crypto from "crypto";
import { executeXLayerSettlement } from "../../../../lib/xlayerSettlement";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = checkAdminAuth(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let updated: unknown = null;
  let payment: unknown = null;
  let transitionError = "";
  let settlementError = "";

  try {
    await updateDb(async (db) => {
      const task = db.tasks.find((item) => item.id === params.id);
      if (!task) {
        return;
      }

      if (!canTransition(task.status, "paid")) {
        transitionError = explainInvalidTransition(task.status, "paid");
        return;
      }

      const previousStatus = task.status;
      const receiver =
        task.assignee?.name || (previousStatus === "verified" ? "Verified Executor" : "Unknown");
      const settlement = await executeXLayerSettlement({
        amount: task.budget?.trim() || "0",
        receiverAddress: task.assignee?.walletAddress
      });

      task.status = "paid";
      task.updatedAt = new Date().toISOString();
      appendTransitionEvidence(task, {
        by: "system",
        from: previousStatus,
        to: "paid",
        action:
          settlement.method === "xlayer_erc20"
            ? "Payment settled on X Layer"
            : "Payment settled in demo mode"
      });
      appendEvidence(task, {
        by: "system",
        type: "log",
        content: settlement.evidenceLabel
      });
      appendEvidence(task, {
        by: "system",
        type: "note",
        content: `agent_event: settlement_agent | Released ${settlement.amount} ${
          settlement.tokenSymbol || "USDC"
        } via ${settlement.method}.`
      });
      if (settlement.configurationHint && settlement.method === "mock_x402") {
        appendEvidence(task, {
          by: "system",
          type: "note",
          content: settlement.configurationHint
        });
      }

      const nextPayment = {
        id: crypto.randomUUID(),
        taskId: task.id,
        amount: settlement.amount,
        receiver,
        receiverAddress: settlement.receiverAddress,
        method: settlement.method,
        status: settlement.status,
        source: "task" as const,
        network: settlement.network,
        chainId: settlement.chainId,
        tokenSymbol: settlement.tokenSymbol,
        tokenAddress: settlement.tokenAddress,
        txHash: settlement.txHash,
        explorerUrl: settlement.explorerUrl,
        createdAt: task.updatedAt
      };
      db.payments.unshift(nextPayment);

      updated = task;
      payment = nextPayment;
    });
  } catch (error) {
    settlementError = error instanceof Error ? error.message : "Settlement failed";
  }

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (settlementError) {
    return NextResponse.json({ error: settlementError }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task: updated, payment });
}
