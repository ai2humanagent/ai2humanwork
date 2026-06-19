import { NextResponse } from "next/server";
import { readDb } from "../../../lib/store";
import {
  isDueForAutomaticArticleReview,
  shouldAutoPayArticleContest
} from "../../../lib/articleContestAutomation.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  return scheme?.toLowerCase() === "bearer" ? (token || "").trim() : "";
}

function checkCronAuth(request: Request) {
  const configured = String(process.env.CRON_SECRET || "").trim();
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, status: 500, error: "CRON_SECRET is not configured." }
      : { ok: true, status: 200, error: "" };
  }
  const token = readBearerToken(request) || String(request.headers.get("x-cron-secret") || "").trim();
  return token && token === configured
    ? { ok: true, status: 200, error: "" }
    : { ok: false, status: 401, error: "Invalid cron secret." };
}

function hasAdminAutomationToken() {
  return Boolean(String(process.env.ADMIN_API_TOKEN || "").trim());
}

function buildInternalUrl(request: Request, path: string) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  return url.toString();
}

async function postAdminJson(request: Request, path: string, body?: Record<string, unknown>) {
  const token = String(process.env.ADMIN_API_TOKEN || "").trim();
  const response = await fetch(buildInternalUrl(request, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token
    },
    cache: "no-store",
    body: JSON.stringify(body || {})
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function hasMissingScoreError(result: Awaited<ReturnType<typeof postAdminJson>>) {
  return result.status === 409 && Array.isArray((result.data as { missingScores?: unknown }).missingScores);
}

export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!hasAdminAutomationToken()) {
    return NextResponse.json(
      { error: "ADMIN_API_TOKEN is required so cron can reuse the admin review APIs." },
      { status: 500 }
    );
  }

  const db = await readDb();
  const maxBatch = Math.max(1, Math.min(Number(process.env.ARTICLE_CONTEST_AUTOMATION_BATCH_SIZE || 3), 10));
  const nowMs = Date.now();
  const due = db.tasks
    .filter((task) =>
      isDueForAutomaticArticleReview(
        task,
        db.articleSubmissions.filter((submission) => submission.taskId === task.id),
        nowMs
      )
    )
    .slice(0, maxBatch);

  const autoPayEnabled = String(process.env.ARTICLE_CONTEST_AUTO_PAY_ENABLED || "").toLowerCase() === "true";
  const autoPayMaxPoolUsdc = Number(process.env.ARTICLE_CONTEST_AUTO_PAY_MAX_USDC || 0);
  const results: Array<Record<string, unknown>> = [];

  for (const task of due) {
    let review = await postAdminJson(request, `/api/admin/tasks/${encodeURIComponent(task.id)}/article-review`, {
      closeNow: false,
      automated: true
    });
    const entry: Record<string, unknown> = {
      taskId: task.id,
      title: task.title,
      review
    };

    if (hasMissingScoreError(review)) {
      entry.scoreRefresh = await postAdminJson(request, `/api/admin/tasks/${encodeURIComponent(task.id)}/article-review`, {
        force: true,
        closeNow: false,
        automated: true
      });
      if ((entry.scoreRefresh as { ok?: boolean }).ok) {
        review = await postAdminJson(request, `/api/admin/tasks/${encodeURIComponent(task.id)}/article-review`, {
          closeNow: false,
          automated: true
        });
        entry.review = review;
      }
    }

    if (review.ok && shouldAutoPayArticleContest(task, { enabled: autoPayEnabled, maxPoolUsdc: autoPayMaxPoolUsdc })) {
      entry.payout = await postAdminJson(request, `/api/admin/tasks/${encodeURIComponent(task.id)}/article-payout`, {
        automated: true
      });
    } else if (review.ok) {
      entry.payout = {
        skipped: true,
        reason: autoPayEnabled ? "Pool exceeds auto-pay limit." : "Auto-pay disabled."
      };
    }
    results.push(entry);
  }

  const response = NextResponse.json({
    success: true,
    checkedAt: new Date(nowMs).toISOString(),
    due: due.length,
    results
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}
