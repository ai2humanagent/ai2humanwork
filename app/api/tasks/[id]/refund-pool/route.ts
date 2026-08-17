import { NextResponse } from "next/server";
import { checkAdminAuth } from "../../../../lib/adminAuth";
import { getAuthContext } from "../../../../lib/auth";
import { isTaskPublishedByUser } from "../../../../lib/taskOwnership";
import { readDb } from "../../../../lib/store";
import { refundExpiredXTask } from "../../../../lib/xTaskLifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/[id]/refund-pool
 * Manually trigger the managed-pool refund for an expired task. The on-chain
 * refund always returns the remaining pool balance to the contract's immutable
 * refundRecipient (the original requester wallet). Admin or the task publisher
 * can trigger this when the automatic deadline worker missed the task.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = checkAdminAuth(request);
  let authorized = admin.ok;

  if (!authorized) {
    const auth = await getAuthContext(request);
    if (auth.ok) {
      const db = await readDb();
      const task = db.tasks.find((candidate) => candidate.id === params.id);
      if (task && isTaskPublishedByUser(task, auth.user, db.users, db.agents)) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Only an admin or the task publisher can trigger this refund." },
      { status: 401 }
    );
  }

  const result = await refundExpiredXTask(params.id);

  if (result.status === "refunded") {
    return NextResponse.json({
      success: true,
      status: result.status,
      amount: result.amount,
      asset: result.asset,
      poolTxHash: result.poolTxHash,
      returnTxHash: result.returnTxHash
    });
  }

  if (result.status === "skipped") {
    return NextResponse.json(
      { error: "This task is not an eligible expired managed-pool refund candidate.", status: result.status },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: result.error || "The refund could not be completed and needs review.",
      status: result.status,
      amount: result.amount,
      asset: result.asset,
      poolTxHash: result.poolTxHash,
      returnTxHash: result.returnTxHash
    },
    { status: 409 }
  );
}
