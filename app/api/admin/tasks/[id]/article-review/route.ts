import { NextResponse } from "next/server";
import { getAdminAuthContext } from "../../../../../lib/adminAuth";
import { readDb, updateDb } from "../../../../../lib/store";
import {
  assignArticleContestPrizes,
  isArticleContestDistribution,
  isSubmissionDeadlinePassed,
  scoreArticleSubmission
} from "../../../../../lib/articleContest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const force = Boolean(body.force);
  const closeNow = Boolean(body.closeNow);
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!isArticleContestDistribution(task.rewardDistribution)) {
    return NextResponse.json({ error: "This task is not a ranked article contest." }, { status: 400 });
  }
  if (!force && !closeNow && !isSubmissionDeadlinePassed(task.deadline)) {
    return NextResponse.json({ error: "Submission deadline has not passed yet." }, { status: 400 });
  }

  const submissions = db.articleSubmissions.filter((item) => item.taskId === taskId);
  if (!submissions.length) {
    return NextResponse.json({ error: "No article submissions to review." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const scored = await Promise.all(
    submissions.map(async (submission) => {
      if (submission.status === "paid") return submission;
      const score = await scoreArticleSubmission({
        title: submission.title,
        content: submission.contentSnapshot,
        articleUrl: submission.articleUrl
      });
      return {
        ...submission,
        status: "reviewed" as const,
        aiScore: score.score,
        aiReview: score.review,
        aiRubric: score.rubric,
        reviewedAt: now,
        updatedAt: now
      };
    })
  );
  const ranked = assignArticleContestPrizes(scored, task.rewardDistribution);

  await updateDb((nextDb) => {
    nextDb.articleSubmissions = nextDb.articleSubmissions.map((submission) => {
      if (submission.taskId !== taskId) return submission;
      return ranked.find((item) => item.id === submission.id) || submission;
    });
    const targetTask = nextDb.tasks.find((item) => item.id === taskId);
    if (targetTask) {
      if (closeNow) {
        targetTask.deadline = now;
      }
      targetTask.updatedAt = now;
    }
  });

  return NextResponse.json({
    success: true,
    deadline: closeNow ? now : task.deadline,
    closedNow: closeNow,
    reviewed: ranked.length,
    winners: ranked.filter((submission) => submission.status === "winner" || submission.status === "paid").length,
    submissions: ranked
  });
}
