import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  getAuthContext,
  makeSessionExpiry,
  sanitizeUser
} from "../../../../lib/auth";
import {
  ensurePrivyEmbeddedWallet,
  extractPrivyIdentity,
  getPrivyClient,
  isPrivyServerConfigured
} from "../../../../lib/privy";
import { updateDb, type UserAccount } from "../../../../lib/store";
import { isUsableContactEmail } from "../../../../lib/operatorAccess";

export const runtime = "nodejs";

function normalizeWalletAddress(value: unknown) {
  const address = String(value || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return undefined;
  return address;
}

export async function POST(request: Request) {
  if (!isPrivyServerConfigured()) {
    return NextResponse.json(
      { error: "Privy server env is missing. Set PRIVY_APP_ID and PRIVY_APP_SECRET." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const accessToken = String(body.accessToken || "").trim();
  const requestedEmbeddedWalletAddress = normalizeWalletAddress(body.embeddedWalletAddress);
  if (!accessToken) {
    return NextResponse.json({ error: "accessToken is required." }, { status: 400 });
  }

  const privy = getPrivyClient();
  const priorAuth = await getAuthContext(request);
  const priorUserId = priorAuth.ok ? priorAuth.user.id : "";

  let privyUserId = "";
  try {
    const claims = await privy.verifyAuthToken(accessToken);
    privyUserId = claims.userId;
  } catch (error) {
    console.error("[privy/login] verifyAuthToken failed", {
      appId: process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
      secretConfigured: Boolean(process.env.PRIVY_APP_SECRET),
      secretLength: String(process.env.PRIVY_APP_SECRET || "").length,
      tokenLength: accessToken.length,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Invalid Privy access token." }, { status: 401 });
  }

  let privyUser = await privy.getUser(privyUserId).catch(() => null);
  if (!privyUser) {
    console.error("[privy/login] getUser failed for", privyUserId);
    return NextResponse.json({ error: "Unable to load Privy user." }, { status: 401 });
  }
  try {
    privyUser = await ensurePrivyEmbeddedWallet(privyUser);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Privy embedded wallet." },
      { status: 502 }
    );
  }

  const identity = extractPrivyIdentity(privyUser);
  if (
    requestedEmbeddedWalletAddress &&
    identity.embeddedWalletAddress &&
    requestedEmbeddedWalletAddress !== identity.embeddedWalletAddress
  ) {
    return NextResponse.json({ error: "Embedded wallet does not belong to this Privy user." }, { status: 403 });
  }
  const walletAddress = identity.embeddedWalletAddress;
  const token = createSessionToken();
  const expiresAt = makeSessionExpiry();
  let currentUser: UserAccount | null = null;

  await updateDb((db) => {
    const now = new Date().toISOString();
    let user =
      db.users.find((item) => item.privyUserId === identity.privyUserId) ||
      db.users.find(
        (item) => Boolean(walletAddress) && item.walletAddress?.toLowerCase() === String(walletAddress).toLowerCase()
      ) ||
      db.users.find((item) => Boolean(priorUserId) && item.id === priorUserId) ||
      db.users.find(
        (item) =>
          Boolean(identity.xAccount?.subject) &&
          String(item.xAccount?.subject || "") === String(identity.xAccount?.subject || "")
      ) ||
      null;

    const priorUser = priorUserId ? db.users.find((item) => item.id === priorUserId) || null : null;

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: identity.email,
        passwordHash: "__privy__",
        createdAt: now,
        authProvider: "privy",
        privyUserId: identity.privyUserId,
        walletAddress,
        ...(isUsableContactEmail(identity.email)
          ? {
              contactEmail: identity.email,
              notificationPreferences: {
                emailTaskAlerts: true,
                emailRewardAlerts: true
              }
            }
          : {}),
        ...(identity.xAccount
          ? {
              xAccount: {
                ...identity.xAccount,
                linkedAt: now
              }
            }
          : {})
      };
      db.users.unshift(user);
    } else {
      if (priorUser && priorUser.id !== user.id) {
        user.xAccount ||= priorUser.xAccount;
        user.contactEmail ||= priorUser.contactEmail;
        user.notificationPreferences ||= priorUser.notificationPreferences;
        user.humanId ||= priorUser.humanId;
      }
      if (isUsableContactEmail(identity.email) || !isUsableContactEmail(user.email)) {
        user.email = identity.email;
      }
      user.authProvider = "privy";
      user.privyUserId = identity.privyUserId;
      if (walletAddress) {
        user.walletAddress = walletAddress;
      }
      if (!user.contactEmail && isUsableContactEmail(identity.email)) {
        user.contactEmail = identity.email;
      }
      user.notificationPreferences = {
        emailTaskAlerts: user.notificationPreferences?.emailTaskAlerts !== false,
        emailRewardAlerts: user.notificationPreferences?.emailRewardAlerts !== false
      };
      if (identity.xAccount) {
        user.xAccount = {
          ...identity.xAccount,
          linkedAt: user.xAccount?.linkedAt || now
        };
      }
      if (!user.passwordHash) {
        user.passwordHash = "__privy__";
      }
    }

    db.sessions = db.sessions.filter(
      (session) => +new Date(session.expiresAt) > Date.now()
    );
    db.sessions.unshift({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      createdAt: now,
      expiresAt
    });

    currentUser = user;
  });

  if (!currentUser) {
    return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
  }

  const response = NextResponse.json({
    user: sanitizeUser(currentUser),
    walletAddress: walletAddress || null
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
  return response;
}
