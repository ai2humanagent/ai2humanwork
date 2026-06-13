import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthContext } from "../../../../lib/auth";
import {
  readDb,
  supportsArticleSubmissionsTable,
  updateDb,
  type ArticleSubmission,
  type Task
} from "../../../../lib/store";
import { isSupabaseEnabled } from "../../../../lib/supabase";
import { appendEvidence } from "../../../../lib/taskEvidence";
import {
  fetchPublicImageAsset,
  fetchXArticleContent,
  getSubmissionContestKind,
  getArticleContestReviewTarget,
  getArticleContestMinimumWinnerScore,
  hasDefinitiveXNotFound,
  isArticleContestDistribution,
  isSubmissionDeadlinePassed,
  parseXArticleUrl,
  reviewArticleSubmission,
  sanitizeArticleSubmissionForUser,
  shortWalletLabel,
  validateDexscreenerHeaderImage,
  xHandlesMatch
} from "../../../../lib/articleContest";
import { getOperatorAccessForWallet, hasUsableContactEmail, taskAccessError } from "../../../../lib/operatorAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireArticleSubmissionsStorage() {
  if (!isSupabaseEnabled) return null;
  const ok = await supportsArticleSubmissionsTable();
  return ok ? null : "article_submissions table is missing. Run SUPABASE_ARTICLE_CONTEST_PATCH.sql first.";
}

const MAX_ARTICLE_SUBMISSION_UPDATES = 1;

function deriveArticleTitle(input: {
  explicitTitle?: string;
  articleText: string;
  authorHandle: string;
  articleId: string;
}) {
  const explicit = String(input.explicitTitle || "").replace(/\s+/g, " ").trim();
  if (explicit) return explicit.slice(0, 180);

  const firstLine = input.articleText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length >= 8);
  if (firstLine) return firstLine.slice(0, 180);

  return `X submission by @${input.authorHandle} (${input.articleId})`;
}

function deriveBannerTitle(input: {
  note: string;
  walletAddress: string;
}) {
  const firstLine = String(input.note || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length >= 6);
  if (firstLine) return firstLine.slice(0, 180);
  return `Banner submission by ${shortWalletLabel(input.walletAddress)}`;
}

function countArticleSubmissionUpdates(
  task: Task | undefined,
  input: { submissionId: string; walletAddress: string; xHandle: string }
) {
  if (!task?.evidence?.length) return 0;
  return task.evidence.filter((item) => {
    if (!item.content.startsWith("article_submission:")) return false;
    try {
      const payload = JSON.parse(item.content.slice("article_submission:".length)) as {
        action?: string;
        submissionId?: string;
        walletAddress?: string;
        xHandle?: string;
      };
      if (payload.action !== "update") return false;
      if (payload.submissionId && payload.submissionId === input.submissionId) return true;
      if (
        payload.walletAddress?.toLowerCase() === input.walletAddress.toLowerCase() &&
        payload.xHandle?.toLowerCase() === input.xHandle.toLowerCase()
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }).length;
}

function readRequiredStrings(task: Task, key: "requiredMentions" | "requiredHashtags") {
  const campaign = task.campaign as Record<string, unknown> | undefined;
  const values = campaign?.[key];
  return Array.isArray(values)
    ? values.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function readCampaignBoolean(task: Task, key: "requiresImage") {
  const campaign = task.campaign as Record<string, unknown> | undefined;
  return Boolean(campaign?.[key]);
}

function missingRequiredArticleSignals(input: {
  text: string;
  mentions: string[];
  hashtags: string[];
}) {
  const normalized = ` ${input.text.toLowerCase().replace(/\s+/g, " ")} `;
  const missingMentions = input.mentions.filter((mention) => {
    const handle = mention.toLowerCase().replace(/^@/, "");
    return !new RegExp(`(^|[^a-z0-9_])@?${handle}([^a-z0-9_]|$)`, "i").test(normalized);
  });
  const missingHashtags = input.hashtags.filter((tag) => {
    const value = tag.toLowerCase().replace(/^#/, "");
    return !new RegExp(`(^|[^a-z0-9_])#${value}([^a-z0-9_]|$)`, "i").test(normalized);
  });
  return [...missingMentions, ...missingHashtags];
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
  const task = db.tasks.find((item) => item.id === taskId);
  const submission = db.articleSubmissions.find(
    (item) => item.taskId === taskId && item.walletAddress.toLowerCase() === wallet
  );
  const updateCount = submission && task
    ? countArticleSubmissionUpdates(task, {
        submissionId: submission.id,
        walletAddress: wallet,
        xHandle: submission.xHandle
      })
    : 0;

  return NextResponse.json({
    submission: submission && task
      ? sanitizeArticleSubmissionForUser(submission, { deadline: task.deadline, taskState: task.taskState })
      : submission || null,
    updateCount,
    updateLocked: Boolean(submission && updateCount >= MAX_ARTICLE_SUBMISSION_UPDATES),
    maxUpdates: MAX_ARTICLE_SUBMISSION_UPDATES
  });
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
  const requestedTitle = String(body.title || "").trim();
  const contentSnapshot = String(body.contentSnapshot || "").trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required." }, { status: 400 });
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
    return NextResponse.json({ error: "This task does not accept ranked contest submissions." }, { status: 400 });
  }
  if (isSubmissionDeadlinePassed(task.deadline)) {
    return NextResponse.json({ error: "Submission deadline has passed." }, { status: 400 });
  }

  const contestKind = getSubmissionContestKind(task);
  const isBannerImageContest = contestKind === "banner_image";
  const requiresAttachedImage = !isBannerImageContest && readCampaignBoolean(task, "requiresImage");

  if (isBannerImageContest) {
    if (!contentSnapshot || contentSnapshot.length < 30) {
      return NextResponse.json({ error: "Add a short design note so the banner can be reviewed fairly." }, { status: 400 });
    }
    if (contentSnapshot.length > 5000) {
      return NextResponse.json({ error: "Design note is too long. Keep it under 5,000 characters." }, { status: 400 });
    }
  } else {
    const minimumSnapshotChars = requiresAttachedImage ? 12 : 200;
    if (!contentSnapshot || contentSnapshot.length < minimumSnapshotChars) {
      return NextResponse.json(
        {
          error: requiresAttachedImage
            ? "Add a short banner reason in the post text so the image can be judged fairly."
            : "Paste at least 200 characters from your article so it can be reviewed."
        },
        { status: 400 }
      );
    }
    if (requiresAttachedImage && contentSnapshot.length > 600) {
      return NextResponse.json({ error: "Keep the banner reason brief. Use 600 characters or less." }, { status: 400 });
    }
    if (!requiresAttachedImage && contentSnapshot.length > 20000) {
      return NextResponse.json({ error: "Article text is too long. Keep it under 20,000 characters." }, { status: 400 });
    }
  }

  const parsedUrl = isBannerImageContest ? null : parseXArticleUrl(articleUrl);
  if (!isBannerImageContest && (!parsedUrl || !parsedUrl.ok)) {
    return NextResponse.json({ error: parsedUrl?.error || "Submit a valid X article URL." }, { status: 400 });
  }
  const parsedXUrl = !isBannerImageContest && parsedUrl && parsedUrl.ok ? parsedUrl : null;

  const isTestArticleContest = task.id.startsWith("x-article-contest-test-");
  const access = await getOperatorAccessForWallet(db, wallet);
  if (isBannerImageContest || isTestArticleContest) {
    const sessionUser = db.users.find((item) => item.id === auth.user.id) || auth.user;
    const hasContactEmail = hasUsableContactEmail(access.user) || hasUsableContactEmail(sessionUser);
    if (!sessionUser.walletAddress || sessionUser.walletAddress.toLowerCase() !== wallet || !hasContactEmail) {
      return NextResponse.json(
        {
          error: isBannerImageContest
            ? "Add a contact email in Profile before you submit a banner."
            : "Add a contact email in Profile before you submit an article.",
          missing: access.missing.filter((item) => item !== "x_account")
        },
        { status: 403 }
      );
    }
  } else if (!access.ok) {
    return NextResponse.json(
      { error: taskAccessError(access, "submit_article"), missing: access.missing },
      { status: 403 }
    );
  }
  const xAccount = access.xAccount;
  if (!isBannerImageContest && !isTestArticleContest && (!xAccount?.username || !xHandlesMatch(parsedXUrl!.authorHandle, xAccount.username))) {
    return NextResponse.json(
      { error: `The article author @${parsedXUrl!.authorHandle} must match your bound X account @${xAccount?.username || "unknown"}.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const normalizedUrl = isBannerImageContest ? articleUrl : parsedXUrl!.url;
  const normalizedXHandle = isBannerImageContest
    ? wallet
    : (isTestArticleContest ? parsedXUrl!.authorHandle : xAccount?.username || parsedXUrl!.authorHandle).replace(/^@/, "");
  let xPrecheck: Awaited<ReturnType<typeof fetchXArticleContent>> | null = null;

  if (isBannerImageContest) {
    const imageCheck = await fetchPublicImageAsset(normalizedUrl);
    if (!imageCheck.ok) {
      return NextResponse.json(
        {
          error: imageCheck.error,
          details: imageCheck.attempts
        },
        { status: 400 }
      );
    }
  } else {
    xPrecheck = await fetchXArticleContent(normalizedUrl);
    const precheck = xPrecheck;
    if (precheck.ok) {
      if (
        precheck.authorHandle &&
        (!xHandlesMatch(precheck.authorHandle, parsedXUrl!.authorHandle) ||
          !xHandlesMatch(precheck.authorHandle, normalizedXHandle))
      ) {
        return NextResponse.json(
          {
            error: `The live X post belongs to @${precheck.authorHandle}, not @${parsedXUrl!.authorHandle}. Submit your own public X link.`
          },
          { status: 400 }
        );
      }
      if (requiresAttachedImage && (!precheck.mediaUrls || precheck.mediaUrls.length === 0)) {
        return NextResponse.json(
          {
            error: "This contest requires a public X post or thread with at least one attached image.",
            details: precheck.attempts
          },
          { status: 400 }
        );
      }
      if (requiresAttachedImage && precheck.mediaUrls?.[0]) {
        const imageCheck = await validateDexscreenerHeaderImage(precheck.mediaUrls[0]);
        if (!imageCheck.ok) {
          return NextResponse.json(
            {
              error: imageCheck.error,
              details: imageCheck.attempts
            },
            { status: 400 }
          );
        }
      }
    } else if (hasDefinitiveXNotFound(precheck.attempts)) {
      return NextResponse.json(
        {
          error: "This X link could not be found. Please submit a public, existing X post, article, or thread URL.",
          details: precheck.attempts
        },
        { status: 400 }
      );
    }
  }

  if (!isBannerImageContest) {
    const requiredMentions = readRequiredStrings(task, "requiredMentions");
    const requiredHashtags = readRequiredStrings(task, "requiredHashtags");
    const precheck = xPrecheck || await fetchXArticleContent(normalizedUrl);
    const requiredSignalText = precheck.ok ? precheck.text : contentSnapshot;
    const missingSignals = missingRequiredArticleSignals({
      text: requiredSignalText,
      mentions: requiredMentions,
      hashtags: requiredHashtags
    });
    if (missingSignals.length > 0) {
      return NextResponse.json(
        {
          error: `Your X post/thread must include ${missingSignals.join(" and ")} before submitting.`
        },
        { status: 400 }
      );
    }
  }

  const title = isBannerImageContest
    ? deriveBannerTitle({
        note: contentSnapshot,
        walletAddress: wallet
      })
    : deriveArticleTitle({
        explicitTitle: requestedTitle,
        articleText: contentSnapshot,
        authorHandle: parsedXUrl!.authorHandle,
        articleId: parsedXUrl!.articleId || "unknown"
      });
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
    if (duplicateUrl) {
      return { error: isBannerImageContest ? "This banner image URL has already been submitted by another wallet." : "This X article link has already been submitted by another wallet." };
    }

    const duplicateArticleId = !isBannerImageContest && parsedXUrl?.articleId
      ? nextDb.articleSubmissions.find(
          (item) =>
            item.taskId === taskId &&
            item.articleId === parsedXUrl.articleId &&
            item.walletAddress.toLowerCase() !== wallet
        )
      : null;
    if (duplicateArticleId) {
      return { error: "This X article has already been submitted by another wallet." };
    }

    const duplicateX = nextDb.articleSubmissions.find(
      (item) =>
        item.taskId === taskId &&
        item.xHandle.toLowerCase() === normalizedXHandle.toLowerCase() &&
        item.walletAddress.toLowerCase() !== wallet
    );
    if (duplicateX) {
      return {
        error: isBannerImageContest
          ? "This wallet already submitted a banner for this task."
          : "This X account already submitted an article for this task."
      };
    }

    const existing = nextDb.articleSubmissions.find(
      (item) => item.taskId === taskId && item.walletAddress.toLowerCase() === wallet
    );

    if (existing) {
      wasUpdate = true;
      if (existing.status === "paid") {
        return { error: "This submission has already been paid and cannot be changed." };
      }
      const targetTask = nextDb.tasks.find((item) => item.id === taskId);
      const updateCount = countArticleSubmissionUpdates(targetTask, {
        submissionId: existing.id,
        walletAddress: wallet,
        xHandle: existing.xHandle
      });
      if (updateCount >= MAX_ARTICLE_SUBMISSION_UPDATES) {
        return {
          error: isBannerImageContest
            ? "This submission has already been updated once. To keep the contest fair, the image URL and design note are now locked."
            : requiresAttachedImage
              ? "This submission has already been updated once. To keep the contest fair, the X link and post text are now locked."
              : "This submission has already been updated once. To keep the contest fair, the X link and article text are now locked."
        };
      }
      existing.xHandle = normalizedXHandle;
      existing.articleUrl = normalizedUrl;
      existing.articleId = isBannerImageContest ? undefined : parsedXUrl!.articleId;
      existing.authorHandle = isBannerImageContest ? wallet : parsedXUrl!.authorHandle;
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
        articleId: isBannerImageContest ? undefined : parsedXUrl!.articleId,
        authorHandle: isBannerImageContest ? wallet : parsedXUrl!.authorHandle,
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
          submissionId: saved?.id,
          walletAddress: wallet,
          xHandle: normalizedXHandle,
          articleUrl: normalizedUrl,
          articleId: isBannerImageContest ? undefined : parsedXUrl!.articleId,
          authorHandle: isBannerImageContest ? wallet : parsedXUrl!.authorHandle,
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
    articleId: isBannerImageContest ? undefined : parsedXUrl!.articleId,
    authorHandle: isBannerImageContest ? wallet : parsedXUrl!.authorHandle,
    titleLength: title.length,
    contentLength: contentSnapshot.length
  });

  if (!result.submission) {
    return NextResponse.json({ success: true, requestId, submission: result.submission });
  }

  let reviewedSubmission = result.submission;
  try {
    const reviewResult = await reviewArticleSubmission({
      submission: result.submission,
      minimumWinnerScore: getArticleContestMinimumWinnerScore(task.rewardDistribution),
      reviewTarget: getArticleContestReviewTarget(task),
      task,
      now
    });
    reviewedSubmission = reviewResult.submission;
    await updateDb((nextDb) => {
      nextDb.articleSubmissions = nextDb.articleSubmissions.map((submission) =>
        submission.id === reviewedSubmission.id ? reviewedSubmission : submission
      );
      const targetTask = nextDb.tasks.find((item) => item.id === taskId);
      if (targetTask) {
        appendEvidence(targetTask, {
          by: "system",
          type: "log",
          content: `article_submission_prereview:${JSON.stringify({
            requestId,
            taskId,
            submissionId: reviewedSubmission.id,
            xHandle: reviewedSubmission.xHandle,
            walletAddress: reviewedSubmission.walletAddress,
            score: reviewedSubmission.aiScore,
            status: reviewedSubmission.status,
            debug: reviewResult.debug
          })}`,
          createdAt: new Date().toISOString()
        });
      }
    });
    console.info("[ArticleContest] submission:prereview_complete", {
      requestId,
      taskId,
      submissionId: reviewedSubmission.id,
      score: reviewedSubmission.aiScore,
      status: reviewedSubmission.status,
      provider: reviewResult.debug.provider,
      source: reviewResult.debug.source,
      contentSource: reviewResult.debug.contentSource
    });
  } catch (error) {
    console.warn("[ArticleContest] submission:prereview_failed", {
      requestId,
      taskId,
      submissionId: result.submission.id,
      error: error instanceof Error ? error.message : "unknown"
    });
  }

  return NextResponse.json({
    success: true,
    requestId,
    submission: sanitizeArticleSubmissionForUser(reviewedSubmission, {
      deadline: task.deadline,
      taskState: task.taskState
    }),
    updateCount: wasUpdate ? MAX_ARTICLE_SUBMISSION_UPDATES : 0,
    updateLocked: wasUpdate,
    maxUpdates: MAX_ARTICLE_SUBMISSION_UPDATES
  });
}
