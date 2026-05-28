import { NextResponse } from "next/server";
import { readDb } from "../../../../lib/store";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDb();

  const task = db.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const taskPayments = db.payments.filter((p) => p.taskId === id);
  const taskQp = db.questProgress.filter((qp) => qp.taskId === id);
  const taskLdp = db.luckyDrawParticipants.filter((ldp) => ldp.taskId === id);

  const participants = Array.from(
    new Map(taskQp.map((qp) => [qp.walletAddress, qp])).values()
  );

  const claimedWallets = new Set(taskPayments.map((p) => p.receiverAddress?.toLowerCase()));

  const winners = (task.drawResult?.winners || []).map((w) => {
    const payment = taskPayments.find(
      (p) => p.receiverAddress?.toLowerCase() === w.address.toLowerCase()
    );
    return {
      address: w.address,
      amount: w.amount,
      claimed: claimedWallets.has(w.address.toLowerCase()),
      txHash: payment?.txHash || null
    };
  });

  const escrow = db.escrowDeposits.find((e) => e.taskId === id);
  const totalPool = task.rewardDistribution?.totalPool || task.budget;
  const maxWinners = task.rewardDistribution?.maxWinners || 1;
  const mode = task.rewardDistribution?.mode || "fcfs";

  const body = {
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      taskState: task.taskState,
      mode,
      totalPool,
      maxWinners,
      claimedCount: taskPayments.length,
      participantCount: participants.length,
      budget: task.budget,
      deadline: task.deadline,
      campaign: task.campaign,
      evidence: task.evidence,
      assignee: task.assignee,
      drawResult: task.drawResult,
      escrowDepositId: task.escrowDepositId,
      escrow,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    },
    participants: participants.map((qp) => {
      const payment = taskPayments.find(
        (p) => p.receiverAddress?.toLowerCase() === qp.walletAddress.toLowerCase()
      );
      const ldp = taskLdp.find(
        (l) => l.walletAddress.toLowerCase() === qp.walletAddress.toLowerCase()
      );
      return {
        wallet: qp.walletAddress,
        subtaskKey: qp.subtaskKey,
        status: qp.status,
        verifiedAt: qp.verifiedAt,
        claimed: !!payment,
        amount: payment?.amount || null,
        txHash: payment?.txHash || null,
        explorerUrl: payment?.explorerUrl || null,
        network: payment?.network || null,
        xHandle: ldp?.xHandle || null,
        createdAt: qp.createdAt
      };
    }),
    winners,
    payments: taskPayments
  };

  const response = NextResponse.json(body);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
