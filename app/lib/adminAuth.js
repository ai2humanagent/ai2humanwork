import crypto from "crypto";

export const ADMIN_SESSION_COOKIE = "a2h_admin";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function getConfiguredUsername() {
  return String(process.env.ADMIN_USERNAME || "").trim();
}

function getConfiguredPasswordHash() {
  return String(process.env.ADMIN_PASSWORD_SHA256 || "").trim().toLowerCase();
}

function getConfiguredPassword() {
  return String(process.env.ADMIN_PASSWORD || "").trim();
}

function getSessionSecret() {
  return String(
    process.env.ADMIN_SESSION_SECRET ||
      process.env.ADMIN_PASSWORD_SHA256 ||
      process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_API_TOKEN ||
      ""
  ).trim();
}

function hasPasswordLoginConfig() {
  return Boolean(getConfiguredUsername() && (getConfiguredPasswordHash() || getConfiguredPassword()) && getSessionSecret());
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hmac(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookies(cookieHeader) {
  const cookies = new Map();
  for (const part of String(cookieHeader || "").split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, decodeURIComponent(rawValue.join("=") || ""));
  }
  return cookies;
}

function extractAdminCookie(request) {
  return parseCookies(request.headers.get("cookie")).get(ADMIN_SESSION_COOKIE) || "";
}

function extractToken(request) {
  const fromHeader = request.headers.get("x-admin-token");
  if (fromHeader) return fromHeader.trim();

  const auth = request.headers.get("authorization");
  if (!auth) return "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return "";
  return (token || "").trim();
}

export function verifyAdminPassword(username, password) {
  const configuredUsername = getConfiguredUsername();
  if (!hasPasswordLoginConfig()) {
    return {
      ok: false,
      status: process.env.NODE_ENV === "production" ? 500 : 401,
      error: "Admin password login is not configured."
    };
  }

  if (!timingSafeEqualString(String(username || "").trim(), configuredUsername)) {
    return { ok: false, status: 401, error: "Invalid admin credentials." };
  }

  const configuredHash = getConfiguredPasswordHash();
  const passwordMatches = configuredHash
    ? timingSafeEqualString(sha256(password), configuredHash)
    : timingSafeEqualString(String(password || ""), getConfiguredPassword());

  if (!passwordMatches) {
    return { ok: false, status: 401, error: "Invalid admin credentials." };
  }

  return { ok: true, username: configuredUsername };
}

export function createAdminSessionToken(username) {
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyAdminSessionToken(token) {
  if (!token || !getSessionSecret()) return false;
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return false;
  if (!timingSafeEqualString(hmac(payload), signature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.u !== getConfiguredUsername()) return false;
    if (!parsed.exp || Number(parsed.exp) < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function checkAdminApiToken(request) {
  const configuredToken = process.env.ADMIN_API_TOKEN;
  if (!configuredToken) return { configured: false, ok: false };
  const requestToken = extractToken(request);
  return {
    configured: true,
    ok: Boolean(requestToken && timingSafeEqualString(requestToken, configuredToken))
  };
}

export function checkAdminAuth(request) {
  if (verifyAdminSessionToken(extractAdminCookie(request))) {
    return { ok: true, status: 200, error: "" };
  }

  const apiToken = checkAdminApiToken(request);
  if (apiToken.ok) {
    return { ok: true, status: 200, error: "" };
  }

  if (!hasPasswordLoginConfig() && !apiToken.configured) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 500,
        error: "Admin auth is not configured."
      };
    }

    return { ok: true, status: 200, error: "" };
  }

  return {
    ok: false,
    status: 401,
    error: "Admin login required."
  };
}

export async function getAdminAuthContext(request) {
  return checkAdminAuth(request);
}

export async function getAdminAuthFromCookieHeader(cookieHeader) {
  const request = new Request("https://ai2human.work/admin", {
    headers: { cookie: cookieHeader }
  });
  return getAdminAuthContext(request);
}
