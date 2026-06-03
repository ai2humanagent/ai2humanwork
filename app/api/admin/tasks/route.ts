import { NextResponse } from "next/server";
import { readAdminTaskSnapshot } from "../../../lib/adminTaskSnapshot";
import { getAdminAuthContext } from "../../../lib/adminAuth";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const db = await readDb();
  const adminSnapshot = await readAdminTaskSnapshot();
  const payments = adminSnapshot?.payments ?? db.payments;
  const questProgress = adminSnapshot?.questProgress ?? db.questProgress;
  const luckyDrawParticipants = adminSnapshot?.luckyDrawParticipants ?? db.luckyDrawParticipants;

  const tasks = db.tasks.map((task) => {
    const taskPayments = payments.filter((p) => p.taskId === task.id);
    const taskQp = questProgress.filter((qp) => qp.taskId === task.id);
    const taskLdp = luckyDrawParticipants.filter((ldp) => ldp.taskId === task.id);

    // Unique participants (wallets that have any progress)
    const participants = Array.from(
      new Map(
        taskQp.map((qp) => [qp.walletAddress, qp])
      ).values()
    );

    // Claimed winners
    const claimedWallets = new Set(taskPayments.map((p) => p.receiverAddress?.toLowerCase()));

    // Lucky draw winners
    const winners = (task.drawResult?.winners || []).map((winner) => {
      const address = typeof winner === "string" ? winner : winner.address;
      const amount = typeof winner === "string" ? "" : winner.amount;
      return {
        address,
        amount,
        claimed: claimedWallets.has(address.toLowerCase())
      };
    });

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

  const response = NextResponse.json({
    tasks,
    debug: {
      snapshotSource: adminSnapshot?.source || "readDb",
      paymentRows: payments.length,
      questProgressRows: questProgress.length,
      luckyDrawParticipantRows: luckyDrawParticipants.length
    }
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
