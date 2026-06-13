import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../../../lib/auth";
import { readDb, updateDb, type QuestProgressStatus } from "../../../../lib/store";
import { getBoundXAccountForWallet, normalizeXHandle } from "../../../../lib/xIdentity";
import { getOperatorAccessForWallet, taskAccessError } from "../../../../lib/operatorAccess";

export const runtime = "nodejs";

const VALID_SUBTASK_KEYS = ["0", "1", "2", "3"];


/** GET /api/tasks/[id]/quest-progress?wallet=0x... */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const url = new URL(request.url);
  const wallet = (url.searchParams.get("wallet") || "").trim().toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "wallet query param is required" }, { status: 400 });
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Connect your wallet before loading task progress." }, { status: 401 });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json(
      { error: "Connected wallet does not match this task progress request." },
      { status: 403 }
    );
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const { xAccount } = await getBoundXAccountForWallet(db, wallet);
  const access = await getOperatorAccessForWallet(db, wallet);

  const progress = db.questProgress.filter(
    (qp) => qp.taskId === taskId && qp.walletAddress === wallet
  );

  // Build a map: subtaskKey -> status
  const subtasks: Record<string, QuestProgressStatus> = {};
  for (const key of VALID_SUBTASK_KEYS) {
    const entry = progress.find((qp) => qp.subtaskKey === key);
    subtasks[key] = entry?.status || "pending";
  }

  // Check if reward already claimed (payment exists for this wallet+task)
  const claimedPayment = db.payments.find(
    (p) =>
      p.taskId === taskId &&
      p.source === "twitter_task" &&
      (!task.poolAddress || (p.method === "prize_pool_claim" && Boolean(p.txHash))) &&
      (p.receiverAddress || "").toLowerCase() === wallet
  );
  const claimed = !!claimedPayment;

  // Check xHandle from luckyDrawParticipants
  const participant = db.luckyDrawParticipants.find(
    (p) => p.taskId === taskId && p.walletAddress === wallet
  );

  return NextResponse.json({
    subtasks,
    claimed,
    xAccount,
    requirements: {
      ok: access.ok,
      missing: access.missing
    },
    ...(claimedPayment ? { payment: claimedPayment } : {}),
    ...(xAccount?.username ? { xHandle: xAccount.username } : participant?.xHandle ? { xHandle: participant.xHandle } : {})
  });
}

/** POST /api/tasks/[id]/quest-progress
 *  Body: { wallet, subtaskKey, action: "action" | "verify", xHandle?: string }
 *  Simple state machine: pending → action_done → verified.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const subtaskKey = String(body.subtaskKey || "").trim();
  const action = String(body.action || "").trim();
  const xHandle = body.xHandle ? String(body.xHandle).trim().replace(/^@/, "") : undefined;

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  if (!VALID_SUBTASK_KEYS.includes(subtaskKey)) {
    return NextResponse.json({ error: "Invalid subtaskKey" }, { status: 400 });
  }
  if (!["action", "verify"].includes(action)) {
    return NextResponse.json({ error: "action must be 'action' or 'verify'" }, { status: 400 });
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Connect your wallet before doing tasks." }, { status: 401 });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json(
      { error: "Connected wallet does not match this task progress request." },
      { status: 403 }
    );
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const access = await getOperatorAccessForWallet(db, wallet);
  if (!access.ok) {
    return NextResponse.json(
      { error: taskAccessError(access, "do_tasks"), missing: access.missing },
      { status: 403 }
    );
  }
  const xAccount = access.xAccount!;
  if (xHandle && normalizeXHandle(xHandle) !== normalizeXHandle(xAccount.username)) {
    return NextResponse.json(
      { error: "Submitted X handle does not match your bound X account." },
      { status: 400 }
    );
  }

  const result = await updateDb((db) => {
    if (!Array.isArray(db.questProgress)) {
      db.questProgress = [];
    }
    if (!Array.isArray(db.luckyDrawParticipants)) {
      db.luckyDrawParticipants = [];
    }

    let entry = db.questProgress.find(
      (qp) => qp.taskId === taskId && qp.walletAddress === wallet && qp.subtaskKey === subtaskKey
    );

    if (!entry) {
      entry = {
        id: crypto.randomUUID(),
        walletAddress: wallet,
        taskId,
        subtaskKey,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      db.questProgress.push(entry);
    }

    if (action === "action" && entry.status === "pending") {
      entry.status = "action_done";
    } else if (action === "verify" && entry.status === "action_done") {
      entry.status = "verified";
      entry.verifiedAt = new Date().toISOString();
    }

    return { status: entry.status };
  });

  return NextResponse.json({ success: true, subtaskKey, status: result.status });
}
