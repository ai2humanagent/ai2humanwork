import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type QuestProgressStatus } from "../../../../lib/store";

export const runtime = "nodejs";

const VALID_SUBTASK_KEYS = ["0", "1", "2", "3", "4"];


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

  // Check xHandle from luckyDrawParticipants
  const participant = db.luckyDrawParticipants.find(
    (p) => p.taskId === taskId && p.walletAddress === wallet
  );

  return NextResponse.json({
    subtasks,
    claimed,
    ...(claimedPayment ? { payment: claimedPayment } : {}),
    ...(participant?.xHandle ? { xHandle: participant.xHandle } : {})
  });
}

/** POST /api/tasks/[id]/quest-progress
 *  Body: { wallet, subtaskKey, action: "action" | "verify", xHandle?: string }
 *  Simple state machine: pending → action_done → verified.
 *  xHandle is saved to luckyDrawParticipants when verifying subtask "4".
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

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
    } else if (action === "verify" && entry.status === "pending" && subtaskKey === "4") {
      // Task 4 (xHandle confirmation): skip action_done, go directly to verified
      entry.status = "verified";
      entry.verifiedAt = new Date().toISOString();
    }

    // Save xHandle when verifying subtask 4 (X handle confirmation)
    if (subtaskKey === "4" && action === "verify" && xHandle) {
      let participant = db.luckyDrawParticipants.find(
        (p) => p.taskId === taskId && p.walletAddress === wallet
      );
      if (!participant) {
        participant = {
          id: crypto.randomUUID(),
          taskId,
          walletAddress: wallet,
          xHandle,
          createdAt: new Date().toISOString()
        };
        db.luckyDrawParticipants.push(participant);
      } else {
        participant.xHandle = xHandle;
      }
    }

    return { status: entry.status };
  });

  return NextResponse.json({ success: true, subtaskKey, status: result.status });
}