import crypto from "crypto";

export const X_OAUTH_STATE_COOKIE = "ai2human_x_oauth";

export type XOAuthState = {
  state: string;
  codeVerifier: string;
  userId: string;
  returnTo: string;
  redirectUri?: string;
  expiresAt: number;
};

export type XOAuth1RequestState = {
  requestToken: string;
  requestTokenSecret: string;
  userId: string;
  returnTo: string;
  callbackUri: string;
  expiresAt: number;
};

type GlobalWithXOAuthState = typeof globalThis & {
  __ai2humanXOAuthStates?: Map<string, XOAuthState>;
  __ai2humanXOAuth1States?: Map<string, XOAuth1RequestState>;
};

function getStateStore() {
  const globalStore = globalThis as GlobalWithXOAuthState;
  if (!globalStore.__ai2humanXOAuthStates) {
    globalStore.__ai2humanXOAuthStates = new Map<string, XOAuthState>();
  }
  return globalStore.__ai2humanXOAuthStates;
}

function getOAuth1StateStore() {
  const globalStore = globalThis as GlobalWithXOAuthState;
  if (!globalStore.__ai2humanXOAuth1States) {
    globalStore.__ai2humanXOAuth1States = new Map<string, XOAuth1RequestState>();
  }
  return globalStore.__ai2humanXOAuth1States;
}

function getStateSecret() {
  return (
    process.env.X_OAUTH_STATE_SECRET ||
    process.env.PRIVY_APP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "ai2human-local-x-oauth"
  );
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sign(payload: string) {
  return base64Url(
    crypto.createHmac("sha256", getStateSecret()).update(payload).digest()
  );
}

export function randomOAuthValue(bytes = 32) {
  return base64Url(crypto.randomBytes(bytes));
}

export function createCodeChallenge(codeVerifier: string) {
  return base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
}

export function encodeXOAuthState(state: XOAuthState) {
  const payload = base64Url(JSON.stringify(state));
  return `${payload}.${sign(payload)}`;
}

export function saveXOAuthState(state: XOAuthState) {
  const store = getStateStore();
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) store.delete(key);
  }
  store.set(state.state, state);
}

export function takeXOAuthState(state: string): XOAuthState | null {
  const store = getStateStore();
  const value = store.get(state) || null;
  if (!value) return null;
  store.delete(state);
  if (Date.now() > value.expiresAt) return null;
  return value;
}

export function saveXOAuth1RequestState(state: XOAuth1RequestState) {
  const store = getOAuth1StateStore();
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) store.delete(key);
  }
  store.set(state.requestToken, state);
}

export function takeXOAuth1RequestState(requestToken: string): XOAuth1RequestState | null {
  const store = getOAuth1StateStore();
  const value = store.get(requestToken) || null;
  if (!value) return null;
  store.delete(requestToken);
  if (Date.now() > value.expiresAt) return null;
  return value;
}

export function decodeXOAuthState(value: string): XOAuthState | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as XOAuthState;
    if (!state.state || !state.codeVerifier || !state.userId || Date.now() > state.expiresAt) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function getXOAuthConfig(origin: string) {
  const clientId = process.env.X_OAUTH_CLIENT_ID || process.env.TWITTER_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET || process.env.TWITTER_OAUTH_CLIENT_SECRET || "";
  const configuredRedirectUri =
    process.env.X_OAUTH_REDIRECT_URI ||
    process.env.TWITTER_OAUTH_REDIRECT_URI ||
    "";
  const originUrl = new URL(origin);
  const configuredUrl = configuredRedirectUri ? new URL(configuredRedirectUri) : null;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const shouldUseCurrentLocalOrigin =
    configuredUrl &&
    localHosts.has(originUrl.hostname) &&
    localHosts.has(configuredUrl.hostname) &&
    originUrl.port === configuredUrl.port;
  const redirectUri = shouldUseCurrentLocalOrigin || !configuredRedirectUri
    ? `${origin}/api/auth/x/callback`
    : configuredRedirectUri;
  const scopes = process.env.X_OAUTH_SCOPES || "tweet.read users.read";
  return { clientId, clientSecret, redirectUri, scopes };
}

export function getXOAuth1Config(origin: string) {
  const apiKey =
    process.env.X_OAUTH1_API_KEY ||
    process.env.X_API_KEY ||
    process.env.TWITTER_API_KEY ||
    "";
  const apiSecret =
    process.env.X_OAUTH1_API_SECRET ||
    process.env.X_API_SECRET ||
    process.env.TWITTER_API_SECRET ||
    "";
  const callbackUri =
    process.env.X_OAUTH1_CALLBACK_URI ||
    process.env.TWITTER_OAUTH1_CALLBACK_URI ||
    getXOAuthConfig(origin).redirectUri;
  const apiBaseUrl = process.env.X_OAUTH1_API_BASE_URL || "https://api.x.com";
  return { apiKey, apiSecret, callbackUri, apiBaseUrl };
}
