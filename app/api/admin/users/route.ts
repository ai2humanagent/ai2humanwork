import { NextResponse } from "next/server";
import { getAdminAuthContext } from "../../../lib/adminAuth";
import { readDb } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAddress(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function latestIso(values: Array<string | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function parseUsdcAmount(value?: string | null) {
  if (!value) return 0;
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) || 0 : 0;
}

export async function GET(request: Request) {
  const admin = await getAdminAuthContext(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const db = await readDb();

  const walletCounts = new Map<string, number>();
  const xSubjectCounts = new Map<string, number>();

  for (const user of db.users) {
    const wallet = normalizeAddress(user.walletAddress);
    if (wallet) walletCounts.set(wallet, (walletCounts.get(wallet) || 0) + 1);

    const xSubject = user.xAccount?.subject;
    if (xSubject) xSubjectCounts.set(xSubject, (xSubjectCounts.get(xSubject) || 0) + 1);
  }

  const users = db.users
    .map((user) => {
      const wallet = normalizeAddress(user.walletAddress);
      const human = user.humanId
        ? db.humans.find((item) => item.id === user.humanId) || null
        : null;

      const progress = wallet
        ? db.questProgress.filter((item) => normalizeAddress(item.walletAddress) === wallet)
        : [];
      const luckyDrawEntries = wallet
        ? db.luckyDrawParticipants.filter((item) => normalizeAddress(item.walletAddress) === wallet)
        : [];
      const payments = wallet
        ? db.payments.filter((item) => normalizeAddress(item.receiverAddress) === wallet)
        : [];

      const profileFields = [
        human?.name,
        human?.role,
        human?.location,
        human?.skills?.length ? "skills" : "",
        human?.languages?.length ? "languages" : ""
      ];
      const profileCompleteCount = profileFields.filter(Boolean).length;

      const claimedAmount = payments.reduce((sum, payment) => sum + parseUsdcAmount(payment.amount), 0);

      const xSubject = user.xAccount?.subject || "";

      return {
        id: user.id,
        email: user.email || null,
        createdAt: user.createdAt,
        authProvider: user.authProvider || "local",
        privyUserId: user.privyUserId || null,
        walletAddress: user.walletAddress || null,
        walletDuplicateCount: wallet ? walletCounts.get(wallet) || 0 : 0,
        human: human
          ? {
              id: human.id,
              name: human.name,
              handle: human.handle,
              role: human.role,
              location: human.location,
              verified: human.verified,
              hourlyRate: human.hourlyRate,
              skills: human.skills,
              languages: human.languages,
              avatarUrl: human.avatarUrl || null
            }
          : null,
        xAccount: user.xAccount
          ? {
              subject: user.xAccount.subject,
              username: user.xAccount.username,
              name: user.xAccount.name || null,
              profilePictureUrl: user.xAccount.profilePictureUrl || null,
              linkedAt: user.xAccount.linkedAt || null,
              duplicateCount: xSubject ? xSubjectCounts.get(xSubject) || 0 : 0
            }
          : null,
        stats: {
          taskCount: uniqueCount(progress.map((item) => item.taskId)),
          progressCount: progress.length,
          verifiedCount: progress.filter((item) => item.status === "verified").length,
          actionDoneCount: progress.filter((item) => item.status === "action_done").length,
          pendingCount: progress.filter((item) => item.status === "pending").length,
          luckyDrawEntryCount: luckyDrawEntries.length,
          paymentCount: payments.length,
          claimedAmount: Number(claimedAmount.toFixed(4)),
          lastActivityAt: latestIso([
            user.xAccount?.linkedAt,
            ...progress.map((item) => item.verifiedAt || item.createdAt),
            ...luckyDrawEntries.map((item) => item.createdAt),
            ...payments.map((item) => item.createdAt)
          ])
        },
        readiness: {
          hasWallet: Boolean(wallet),
          hasX: Boolean(user.xAccount?.username),
          hasProfile: Boolean(human),
          profileCompletePercent: Math.round((profileCompleteCount / profileFields.length) * 100)
        },
        flags: {
          duplicateWallet: wallet ? (walletCounts.get(wallet) || 0) > 1 : false,
          duplicateXAccount: xSubject ? (xSubjectCounts.get(xSubject) || 0) > 1 : false,
          missingX: !user.xAccount?.username,
          missingWallet: !wallet,
          missingProfile: !human
        }
      };
    })
    .sort((a, b) => {
      const bActivity = b.stats.lastActivityAt || b.createdAt;
      const aActivity = a.stats.lastActivityAt || a.createdAt;
      return new Date(bActivity).getTime() - new Date(aActivity).getTime();
    });

  const summary = {
    totalUsers: users.length,
    walletUsers: users.filter((user) => user.readiness.hasWallet).length,
    xLinkedUsers: users.filter((user) => user.readiness.hasX).length,
    profileUsers: users.filter((user) => user.readiness.hasProfile).length,
    duplicateWalletUsers: users.filter((user) => user.flags.duplicateWallet).length,
    duplicateXUsers: users.filter((user) => user.flags.duplicateXAccount).length,
    claimedUsers: users.filter((user) => user.stats.paymentCount > 0).length
  };

  const response = NextResponse.json({ summary, users });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
