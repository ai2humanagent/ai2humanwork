import { NextResponse } from "next/server";
import crypto from "crypto";
import { updateDb } from "../../../lib/store";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashPassword,
  makeSessionExpiry,
  sanitizeUser
} from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const token = createSessionToken();
  const expiresAt = makeSessionExpiry();
  let createdUser = null;

  const result = await updateDb((db) => {
    const existing = db.users.find((user) => user.email === email);
    if (existing) {
      return { ok: false as const, error: "Email already registered." };
    }

    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash: hashPassword(password),
      createdAt: now,
      humanId: undefined,
      authProvider: "local" as const
    };

    db.users.unshift(user);
    db.sessions = db.sessions.filter((session) => +new Date(session.expiresAt) > Date.now());
    db.sessions.unshift({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      createdAt: now,
      expiresAt
    });

    createdUser = user;
    return { ok: true as const };
  });

  if (!result.ok || !createdUser) {
    return NextResponse.json({ error: result.error || "Unable to register." }, { status: 409 });
  }

  const response = NextResponse.json({ user: sanitizeUser(createdUser) }, { status: 201 });
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
