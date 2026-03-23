import { NextResponse } from "next/server";
import crypto from "crypto";
import { updateDb } from "../../../lib/store";
import {
  SESSION_COOKIE,
  createSessionToken,
  makeSessionExpiry,
  sanitizeUser,
  verifyPassword
} from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const token = createSessionToken();
  const expiresAt = makeSessionExpiry();
  let currentUser = null;

  const result = await updateDb((db) => {
    const user = db.users.find((item) => item.email === email);
    if (!user || user.authProvider === "privy" || !verifyPassword(password, user.passwordHash)) {
      return { ok: false as const, error: "Invalid email or password." };
    }

    const now = new Date().toISOString();
    db.sessions = db.sessions.filter(
      (session) => session.userId !== user.id && +new Date(session.expiresAt) > Date.now()
    );
    db.sessions.unshift({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      createdAt: now,
      expiresAt
    });

    currentUser = user;
    return { ok: true as const };
  });

  if (!result.ok || !currentUser) {
    return NextResponse.json({ error: result.error || "Login failed." }, { status: 401 });
  }

  const response = NextResponse.json({ user: sanitizeUser(currentUser) });
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
