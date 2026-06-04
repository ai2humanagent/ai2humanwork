import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../../../lib/auth";
import {
  readDb,
  supportsArticleSubmissionsTable,
  updateDb,
  type ArticleSubmission
} from "../../../../lib/store";
import { isSupabaseEnabled } from "../../../../lib/supabase";
import { appendEvidence } from "../../../../lib/taskEvidence";
import {
  isArticleContestDistribution,
  isSubmissionDeadlinePassed,
  parseXArticleUrl,
  xHandlesMatch
} from "../../../../lib/articleContest";
import { getBoundXAccountForWallet } from "../../../../lib/xIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireArticleSubmissionsStorage() {
  if (!isSupabaseEnabled) return null;
  const ok = await supportsArticleSubmissionsTable();
  return ok ? null : "article_submissions table is missing. Run SUPABASE_ARTICLE_CONTEST_PATCH.sql first.";
}

function isTestArticleContestTask(taskId: string) {
  return taskId.startsWith("x-article-contest-test-");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const url = new URL(request.url);
  const wallet = String(url.searchParams.get("wallet") || "").trim().toLowerCase();

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Connect your wallet before loading article submissions." }, { status: 401 });
  }
  if (!wallet) {
    return NextResponse.json({ error: "wallet query param is required." }, { status: 400 });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json({ error: "Connected wallet does not match this request." }, { status: 403 });
  }

  const db = await readDb();
  const submission = db.articleSubmissions.find(
    (item) => item.taskId === taskId && item.walletAddress.toLowerCase() === wallet
  );

  return NextResponse.json({ submission: submission || null });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const storageError = await requireArticleSubmissionsStorage();
  if (storageError) {
    return NextResponse.json({ error: storageError }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const articleUrl = String(body.articleUrl || "").trim();
  const title = String(body.title || "").trim();
  const contentSnapshot = String(body.contentSnapshot || "").trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required." }, { status: 400 });
  }
  if (!title || title.length < 8) {
    return NextResponse.json({ error: "Add a clear article title." }, { status: 400 });
  }
  if (!contentSnapshot || contentSnapshot.length < 200) {
    return NextResponse.json({ error: "Paste at least 200 characters from your article so it can be reviewed." }, { status: 400 });
  }
  if (contentSnapshot.length > 20000) {
    return NextResponse.json({ error: "Article snapshot is too long. Keep it under 20,000 characters." }, { status: 400 });
  }

  const parsedUrl = parseXArticleUrl(articleUrl);
  if (!parsedUrl.ok) {
    return NextResponse.json({ error: parsedUrl.error }, { status: 400 });
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Connect your wallet before submitting." }, { status: 401 });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json({ error: "Connected wallet does not match this submission." }, { status: 403 });
  }

  const db = await readDb();
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!isArticleContestDistribution(task.rewardDistribution)) {
    return NextResponse.json({ error: "This task does not accept X article submissions." }, { status: 400 });
  }
  const testBypassEnabled = isTestArticleContestTask(taskId);
  if (isSubmissionDeadlinePassed(task.deadline)) {
    return NextResponse.json({ error: "Submission deadline has passed." }, { status: 400 });
  }

  const { xAccount } = await getBoundXAccountForWallet(db, wallet);
  if (!xAccount?.username && !testBypassEnabled) {
    return NextResponse.json({ error: "Bind your X account before submitting an article." }, { status: 403 });
  }
  if (xAccount?.username && !xHandlesMatch(parsedUrl.authorHandle, xAccount.username) && !testBypassEnabled) {
    return NextResponse.json(
      { error: `The article author @${parsedUrl.authorHandle} must match your bound X account @${xAccount.username}.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const normalizedUrl = parsedUrl.url;
  const normalizedXHandle = (xAccount?.username || parsedUrl.authorHandle).replace(/^@/, "");
  const xBindingBypassed = testBypassEnabled && (
    !xAccount?.username || !xHandlesMatch(parsedUrl.authorHandle, xAccount.username)
  );
  const requestId = crypto.randomUUID();
  let saved: ArticleSubmission | null = null;
  let wasUpdate = false;

  const result = await updateDb((nextDb) => {
    if (!Array.isArray(nextDb.articleSubmissions)) {
      nextDb.articleSubmissions = [];
    }

    const duplicateUrl = nextDb.articleSubmissions.find(
      (item) =>
        item.taskId === taskId &&
        item.articleUrl.toLowerCase() === normalizedUrl.toLowerCase() &&
        item.walletAddress.toLowerCase() !== wallet
    );
    if (duplicateUrl && !testBypassEnabled) {
      return { error: "This X article link has already been submitted by another wallet." };
    }

    const duplicateX = nextDb.articleSubmissions.find(
      (item) =>
        item.taskId === taskId &&
        item.xHandle.toLowerCase() === normalizedXHandle.toLowerCase() &&
        item.walletAddress.toLowerCase() !== wallet
    );
    if (duplicateX && !testBypassEnabled) {
      return { error: "This X account already submitted an article for this task." };
    }

    const existing = nextDb.articleSubmissions.find(
      (item) => item.taskId === taskId && item.walletAddress.toLowerCase() === wallet
    );

    if (existing) {
      wasUpdate = true;
      if (existing.status === "paid") {
        return { error: "This submission has already been paid and cannot be changed." };
      }
      existing.xHandle = normalizedXHandle;
      existing.articleUrl = normalizedUrl;
      existing.articleId = parsedUrl.articleId;
      existing.authorHandle = parsedUrl.authorHandle;
      existing.title = title;
      existing.contentSnapshot = contentSnapshot;
      existing.status = "submitted";
      existing.aiScore = undefined;
      existing.aiReview = undefined;
      existing.aiRubric = undefined;
      existing.rank = undefined;
      existing.prizeAmount = undefined;
      existing.reviewedAt = undefined;
      existing.updatedAt = now;
      saved = existing;
    } else {
      saved = {
        id: crypto.randomUUID(),
        taskId,
        walletAddress: wallet,
        userId: auth.user.id,
        xHandle: normalizedXHandle,
        articleUrl: normalizedUrl,
        articleId: parsedUrl.articleId,
        authorHandle: parsedUrl.authorHandle,
        title,
        contentSnapshot,
        status: "submitted",
        submittedAt: now,
        updatedAt: now
      };
      nextDb.articleSubmissions.unshift(saved);
    }

    const targetTask = nextDb.tasks.find((item) => item.id === taskId);
    if (targetTask) {
      appendEvidence(targetTask, {
        by: "system",
        type: "log",
          content: `article_submission:${JSON.stringify({
          requestId,
          taskId,
          action: existing ? "update" : "create",
          testBypassEnabled,
          xBindingBypassed,
          submissionId: saved?.id,
          walletAddress: wallet,
          xHandle: normalizedXHandle,
          articleUrl: normalizedUrl,
          articleId: parsedUrl.articleId,
          authorHandle: parsedUrl.authorHandle,
          titleLength: title.length,
          contentLength: contentSnapshot.length
        })}`,
        createdAt: now
      });
    }

    return { submission: saved };
  });

  if ("error" in result && result.error) {
    console.warn("[ArticleContest] submission:rejected", {
      requestId,
    taskId,
    walletAddress: wallet,
    xHandle: normalizedXHandle,
    articleUrl: normalizedUrl,
    testBypassEnabled,
    xBindingBypassed,
    error: result.error
    });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  console.info("[ArticleContest] submission:accepted", {
    requestId,
    taskId,
    submissionId: result.submission?.id,
    action: wasUpdate ? "update" : "create",
    walletAddress: wallet,
    xHandle: normalizedXHandle,
    articleUrl: normalizedUrl,
    testBypassEnabled,
    xBindingBypassed,
    articleId: parsedUrl.articleId,
    authorHandle: parsedUrl.authorHandle,
    titleLength: title.length,
    contentLength: contentSnapshot.length
  });

  return NextResponse.json({ success: true, requestId, submission: result.submission });
}
