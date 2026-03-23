import crypto from "crypto";
import { readDb, updateDb, type UserAccount } from "./store";

export const SESSION_COOKIE = "ai2human_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type AuthContext = {
  ok: true;
  user: UserAccount;
  token: string;
};

type AuthFailure = {
  ok: false;
  status: number;
  error: string;
};

function parseCookieValue(cookieHeader: string, key: string): string {
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawName, ...rest] = pair.trim().split("=");
    if (rawName !== key) continue;
    return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(digest, "hex");
  if (candidate.length !== target.length) return false;
  return crypto.timingSafeEqual(candidate, target);
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function makeSessionExpiry(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

export function sanitizeUser(user: UserAccount) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    humanId: user.humanId,
    walletAddress: user.walletAddress,
    authProvider: user.authProvider || "local"
  };
}

export async function getAuthContext(request: Request): Promise<AuthContext | AuthFailure> {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = parseCookieValue(cookieHeader, SESSION_COOKIE);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const db = await readDb();
  const now = Date.now();
  const session = db.sessions.find(
    (item) => item.token === token && +new Date(item.expiresAt) > now
  );
  if (!session) {
    return { ok: false, status: 401, error: "Session expired." };
  }

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) {
    return { ok: false, status: 401, error: "Session user not found." };
  }

  return { ok: true, user, token };
}

export async function clearSessionByToken(token: string) {
  if (!token) return;
  await updateDb((db) => {
    db.sessions = db.sessions.filter((item) => item.token !== token);
  });
}

export function extractSessionToken(request: Request): string {
  const cookieHeader = request.headers.get("cookie") || "";
  return parseCookieValue(cookieHeader, SESSION_COOKIE);
}
