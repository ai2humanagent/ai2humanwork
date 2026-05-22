import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type QuestProgressStatus } from "../../../../lib/store";

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

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

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
      (p.receiverAddress || "").toLowerCase() === wallet
  );
  const claimed = !!claimedPayment;

  return NextResponse.json({
    subtasks,
    claimed,
    ...(claimedPayment ? { payment: claimedPayment } : {})
  });
}

/** POST /api/tasks/[id]/quest-progress
 *  Body: { wallet, subtaskKey, action: "action" | "verify" }
 *  Simple state machine: pending → action_done → verified.
 *  No wallet signature required — this is self-attestation.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const subtaskKey = String(body.subtaskKey || "").trim();
  const action = String(body.action || "").trim(); // "action" or "verify"

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  if (!VALID_SUBTASK_KEYS.includes(subtaskKey)) {
    return NextResponse.json({ error: "Invalid subtaskKey" }, { status: 400 });
  }
  if (!["action", "verify"].includes(action)) {
    return NextResponse.json({ error: "action must be 'action' or 'verify'" }, { status: 400 });
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const result = await updateDb((db) => {
    if (!Array.isArray(db.questProgress)) {
      db.questProgress = [];
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
