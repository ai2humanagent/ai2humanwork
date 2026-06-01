function extractToken(request) {
  const fromHeader = request.headers.get("x-admin-token");
  if (fromHeader) return fromHeader.trim();

  const auth = request.headers.get("authorization");
  if (!auth) return "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return "";
  return (token || "").trim();
}

export function checkAdminAuth(request) {
  const configuredToken = process.env.ADMIN_API_TOKEN;

  if (!configuredToken) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 500,
        error: "Admin auth is not configured."
      };
    }

    return { ok: true, status: 200, error: "" };
  }

  const requestToken = extractToken(request);
  if (!requestToken || requestToken !== configuredToken) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized."
    };
  }

  return { ok: true, status: 200, error: "" };
}

function normalizeAddress(value) {
  return value?.trim().toLowerCase() || "";
}

function splitEnvList(value) {
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

export function isAdminUser(user) {
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

export async function getAdminAuthContext(request) {
  const { getAuthContext } = await import("./auth");
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }

  if (!isAdminUser(auth.user)) {
    return { ok: false, status: 403, error: "Admin access required." };
  }

  return { ok: true, user: auth.user };
}

export async function getAdminAuthFromCookieHeader(cookieHeader) {
  const request = new Request("https://ai2human.work/admin", {
    headers: { cookie: cookieHeader }
  });
  return getAdminAuthContext(request);
}
