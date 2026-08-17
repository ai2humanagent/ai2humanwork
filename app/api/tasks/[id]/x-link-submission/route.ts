import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type Task } from "../../../../lib/store";
import { getAuthContext } from "../../../../lib/auth";
import { normalizeXHandle } from "../../../../lib/xIdentity";
import { getOperatorAccessForWallet, taskAccessError } from "../../../../lib/operatorAccess";
import { checkTokenGateForWallet, tokenGateErrorMessage } from "../../../../lib/tokenGate.js";
import { getRewardTaskUnavailableReason } from "../../../../lib/rewardTaskGuards.js";
import { parseXArticleUrl, fetchXArticleContent, xHandlesMatch } from "../../../../lib/articleContest";
import { missingRequiredArticleSignals } from "../../../../lib/articleSubmissionSignals.js";
import { appendEvidence } from "../../../../lib/taskEvidence";

export const runtime = "nodejs";

/**
 * POST /api/tasks/[id]/x-link-submission
 * Body: { wallet, postUrl }
 *
 * Single-field submission for quest tasks that only require an X post URL.
 * Fetches the live post, confirms it belongs to the bound X account, checks the
 * campaign keywords (requiredHashtags + contentKeywords), records evidence, and
 * marks the main quest step verified so the reward claim unlocks.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const postUrl = String(body.postUrl || "").trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  if (!postUrl) {
    return NextResponse.json({ error: "Paste your X post URL first." }, { status: 400 });
  }

  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if ((auth.user.walletAddress || "").toLowerCase() !== wallet) {
    return NextResponse.json(
      { error: "Connected wallet does not match this task progress request." },
      { status: 403 }
    );
  }

  const db = await readDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const unavailableReason = getRewardTaskUnavailableReason(task);
  if (unavailableReason) {
    return NextResponse.json({ error: unavailableReason }, { status: 403 });
  }
  const tokenGate = await checkTokenGateForWallet(task, wallet, "quest_action");
  if (!tokenGate.ok) {
    return NextResponse.json(
      {
        error: tokenGateErrorMessage(tokenGate, "quest_action"),
        tokenGate: {
          required: tokenGate.required,
          reason: tokenGate.reason,
          balance: tokenGate.balanceFormatted,
          symbol: tokenGate.gate?.symbol,
          minimumBalance: tokenGate.gate?.minimumBalance,
          network: tokenGate.gate?.network
        }
      },
      { status: tokenGate.reason === "rpc_unavailable" || tokenGate.reason === "price_unavailable" ? 503 : tokenGate.reason === "misconfigured" ? 500 : 403 }
    );
  }
  const access = await getOperatorAccessForWallet(db, wallet);
  if (!access.ok) {
    return NextResponse.json(
      { error: taskAccessError(access, "do_tasks"), missing: access.missing },
      { status: 403 }
    );
  }

  const parsed = parseXArticleUrl(postUrl);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const content = await fetchXArticleContent(parsed.url);
  if (!content.ok) {
    return NextResponse.json(
      { error: `We could not read that X post. ${content.error}`, attempts: content.attempts },
      { status: 422 }
    );
  }

  const boundHandle = access.xAccount?.username
    ? normalizeXHandle(access.xAccount.username)
    : "";
  const postAuthor = content.authorHandle ? normalizeXHandle(content.authorHandle) : "";
  if (!boundHandle) {
    return NextResponse.json(
      { error: "Bind your X account from Profile before submitting." },
      { status: 403 }
    );
  }
  if (!postAuthor) {
    return NextResponse.json(
      { error: "We could not confirm the author of that X post. Make sure the post is public and try again." },
      { status: 422 }
    );
  }
  if (!xHandlesMatch(postAuthor, boundHandle)) {
    return NextResponse.json(
      { error: `This X post belongs to @${postAuthor}, but your bound account is @${boundHandle}. Submit a post from your own account.` },
      { status: 400 }
    );
  }

  const campaign = task.campaign || ({} as NonNullable<Task["campaign"]>);
  const requiredHashtags = (campaign.requiredHashtags || []).map(String);
  const requiredMentions = (campaign.requiredMentions || []).map(String);
  const contentKeywords = ((campaign as { contentKeywords?: string[] }).contentKeywords || []).map(String);
  const missingSignals = missingRequiredArticleSignals({
    texts: [content.text],
    mentions: requiredMentions,
    hashtags: requiredHashtags
  });
  const textLower = content.text.toLowerCase();
  const matchedKeywords = [
    ...requiredHashtags.map((h) => h.replace(/^#/, "")),
    ...requiredMentions.map((m) => m.replace(/^@/, "")),
    ...contentKeywords
  ]
    .map((keyword) => keyword.toLowerCase())
    .filter((keyword) => keyword && textLower.includes(keyword));
  const missingKeywords = [
    ...requiredHashtags,
    ...requiredMentions,
    ...contentKeywords
  ].filter((keyword) => keyword && !textLower.includes(keyword.toLowerCase()));
  if (
    (requiredHashtags.length > 0 || requiredMentions.length > 0 || contentKeywords.length > 0)
    && missingSignals.length === requiredHashtags.length + requiredMentions.length
    && matchedKeywords.length === 0
  ) {
    return NextResponse.json(
      {
        error: `We could not find any campaign keyword (${[...requiredHashtags, ...requiredMentions, ...contentKeywords].slice(0, 5).join(" / ")}) in the post. Add the required keyword or hashtag and resubmit.`,
        matchedKeywords: [],
        missingKeywords: [...new Set(missingKeywords)],
        textExcerpt: content.text.slice(0, 240)
      },
      { status: 422 }
    );
  }

  const url = parsed.url;
  await updateDb((db) => {
    const current = db.tasks.find((t) => t.id === taskId);
    if (!current) return;
    appendEvidence(current, {
      by: "human",
      type: "note",
      content: `x_link_submission: ${url} (author @${postAuthor}, source ${content.source}, matched ${matchedKeywords.join(",") || "none"})`,
      metadata: {
        postUrl: url,
        postAuthor: `@${postAuthor}`,
        source: content.source,
        matchedKeywords,
        missingKeywords,
        missingSignals
      }
    });
    if (!Array.isArray(db.questProgress)) {
      db.questProgress = [];
    }
    let entry = db.questProgress.find(
      (qp) => qp.taskId === taskId && qp.walletAddress === wallet && qp.subtaskKey === "0"
    );
    if (!entry) {
      entry = {
        id: crypto.randomUUID(),
        walletAddress: wallet,
        taskId,
        subtaskKey: "0",
        status: "verified",
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString()
      };
      db.questProgress.push(entry);
    } else {
      entry.status = "verified";
      entry.verifiedAt = new Date().toISOString();
    }
  });

  return NextResponse.json({
    ok: true,
    url,
    status: "verified",
    matchedKeywords: [...new Set(matchedKeywords)],
    missingKeywords: [...new Set(missingKeywords)],
    missingSignals,
    source: content.source,
    textExcerpt: content.text.slice(0, 240)
  });
}
