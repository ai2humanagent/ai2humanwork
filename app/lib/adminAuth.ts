import { getAuthContext } from "./auth";
import type { UserAccount } from "./store";

export type AdminAuthResult =
  | { ok: true; user: UserAccount }
  | { ok: false; status: number; error: string };

type TokenAdminAuthResult = { ok: boolean; status: number; error: string };

function normalizeAddress(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function splitEnvList(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdminWallets() {
  return new Set(
    splitEnvList(process.env.ADMIN_WALLET_ADDRESSES || process.env.ADMIN_WALLETS)
      .map(normalizeAddress)
      .filter(Boolean)
  );
}

function getAdminUserIds() {
  return new Set(splitEnvList(process.env.ADMIN_USER_IDS));
}

function extractToken(request: Request) {
  const fromHeader = request.headers.get("x-admin-token");
  if (fromHeader) return fromHeader.trim();

  const auth = request.headers.get("authorization");
  if (!auth) return "";

  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return "";

  return (token || "").trim();
}

export function checkAdminAuth(request: Request): TokenAdminAuthResult {
  const configuredToken = process.env.ADMIN_API_TOKEN;

  if (!configuredToken) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 500, error: "Admin auth is not configured." };
    }
    return { ok: true, status: 200, error: "" };
  }

  const requestToken = extractToken(request);
  if (!requestToken || requestToken !== configuredToken) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  return { ok: true, status: 200, error: "" };
}

export function isAdminUser(user: UserAccount | null | undefined) {
  if (!user) return false;
  const adminWallets = getAdminWallets();
  const adminUserIds = getAdminUserIds();
  const wallet = normalizeAddress(user.walletAddress);

  return (
    (wallet && adminWallets.has(wallet)) ||
    (user.id && adminUserIds.has(user.id)) ||
    (user.privyUserId && adminUserIds.has(user.privyUserId))
  );
}

export async function getAdminAuthContext(request: Request): Promise<AdminAuthResult> {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }

  if (!isAdminUser(auth.user)) {
    return { ok: false, status: 403, error: "Admin access required." };
  }

  return { ok: true, user: auth.user };
}

export async function getAdminAuthFromCookieHeader(cookieHeader: string): Promise<AdminAuthResult> {
  const request = new Request("https://ai2human.work/admin", {
    headers: { cookie: cookieHeader }
  });
  return getAdminAuthContext(request);
}
