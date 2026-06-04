import { NextResponse } from "next/server";
import { readAdminTaskSnapshot } from "../../../../lib/adminTaskSnapshot";
import { buildAdminWinners } from "../../../../lib/adminTaskWinners";
import { getAdminAuthContext } from "../../../../lib/adminAuth";
import { readDb } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const db = await readDb();
  const adminSnapshot = await readAdminTaskSnapshot(id);

  const task = adminSnapshot?.tasks.find((t) => t.id === id) ?? db.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const taskPayments = db.payments.filter((p) => p.taskId === id);
  const snapshotPayments = adminSnapshot?.payments ?? taskPayments;
  const taskQp = adminSnapshot?.questProgress ?? db.questProgress.filter((qp) => qp.taskId === id);
  const taskLdp =
    adminSnapshot?.luckyDrawParticipants ??
    db.luckyDrawParticipants.filter((ldp) => ldp.taskId === id);
  const articleSubmissions =
    adminSnapshot?.articleSubmissions ??
    db.articleSubmissions.filter((submission) => submission.taskId === id);

  const participants = Array.from(
    new Map(taskQp.map((qp) => [qp.walletAddress, qp])).values()
  );

  const winners = buildAdminWinners(task, snapshotPayments);

  const escrow = (adminSnapshot?.escrowDeposits ?? db.escrowDeposits).find((e) => e.taskId === id);
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
      claimedCount: snapshotPayments.length,
      participantCount: mode === "ranked_article_contest" ? articleSubmissions.length : participants.length,
      submissionCount: articleSubmissions.length,
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
      const payment = snapshotPayments.find(
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
    articleSubmissions,
    winners,
    payments: snapshotPayments,
    debug: {
      snapshotSource: adminSnapshot?.source || "readDb",
      readDbPayments: taskPayments.length,
      snapshotPayments: snapshotPayments.length,
      questProgressRows: taskQp.length,
      luckyDrawParticipantRows: taskLdp.length,
      articleSubmissionRows: articleSubmissions.length
    }
  };

  const response = NextResponse.json(body);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
