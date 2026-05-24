import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";

export async function GET() {
  const db = await readDb();

  const tasks = db.tasks.map((task) => {
    const taskPayments = db.payments.filter((p) => p.taskId === task.id);
    const taskQp = db.questProgress.filter((qp) => qp.taskId === task.id);
    const taskLdp = db.luckyDrawParticipants.filter((ldp) => ldp.taskId === task.id);

    // Unique participants (wallets that have any progress)
    const participants = Array.from(
      new Map(
        taskQp.map((qp) => [qp.walletAddress, qp])
      ).values()
    );

    // Claimed winners
    const claimedWallets = new Set(taskPayments.map((p) => p.receiverAddress?.toLowerCase()));

    // Lucky draw winners
    const winners = (task.drawResult?.winners || []).map((w) => ({
      address: w.address,
      amount: w.amount,
      claimed: claimedWallets.has(w.address.toLowerCase())
    }));

    const totalPool = task.rewardDistribution?.totalPool || task.budget;
    const maxWinners = task.rewardDistribution?.maxWinners || 1;
    const mode = task.rewardDistribution?.mode || "fcfs";

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      taskState: task.taskState,
      mode,
      totalPool,
      maxWinners,
      claimedCount: taskPayments.length,
      participantCount: participants.length,
      participants: participants.slice(0, 20).map((qp) => {
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
          xHandle: ldp?.xHandle || null
        };
      }),
      winners,
      escrowDepositId: task.escrowDepositId,
      createdAt: task.createdAt,
      deadline: task.deadline,
      campaign: task.campaign
    };
  });

  return NextResponse.json({ tasks });
}
