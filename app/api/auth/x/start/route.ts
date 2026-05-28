import { NextResponse } from "next/server";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { getAuthContext } from "../../../../lib/auth";
import { readDb } from "../../../../lib/store";
import {
  X_OAUTH_STATE_COOKIE,
  createCodeChallenge,
  encodeXOAuthState,
  getXOAuth1Config,
  getXOAuthConfig,
  randomOAuthValue,
  saveXOAuth1RequestState,
  saveXOAuthState
} from "../../../../lib/xOAuth";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function redirectToProfile(request: Request, params: Record<string, string>) {
  const url = new URL("/app/profile", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function normalizeWalletAddress(value: unknown) {
  const address = String(value || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return "";
  return address;
}

function oauthEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function getXOAuthProxyUrl() {
  return (
    process.env.X_OAUTH_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    ""
  ).trim();
}

function buildOAuthHeader(params: Record<string, string>) {
  const header = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${oauthEncode(key)}="${oauthEncode(value)}"`)
    .join(", ");
  return `OAuth ${header}`;
}

function signOAuth1(input: {
  method: string;
  url: string;
  params: Record<string, string>;
  consumerSecret: string;
  tokenSecret?: string;
}) {
  const normalizedParams = Object.entries(input.params)
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
    )
    .map(([key, value]) => `${oauthEncode(key)}=${oauthEncode(value)}`)
    .join("&");
  const signatureBase = [
    input.method.toUpperCase(),
    oauthEncode(input.url),
    oauthEncode(normalizedParams)
  ].join("&");
  const signingKey = `${oauthEncode(input.consumerSecret)}&${oauthEncode(input.tokenSecret || "")}`;
  return crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64");
}

function makeOAuth1Params(apiKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    oauth_consumer_key: apiKey,
    oauth_nonce: randomOAuthValue(24),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extra
  };
}

async function requestTextViaCurl(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  proxyUrl: string;
}) {
  const args = [
    "-sS",
    "--connect-timeout",
    "15",
    "--max-time",
    "45",
    "-x",
    input.proxyUrl,
    "-X",
    input.method
  ];
  for (const [key, value] of Object.entries(input.headers)) {
    args.push("-H", `${key}: ${value}`);
  }
  args.push("-w", "\n__HTTP_STATUS__:%{http_code}", input.url);
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 1024 * 1024
  });
  const marker = "\n__HTTP_STATUS__:";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error("X OAuth1 request returned an unreadable response.");
  }
  return {
    body: stdout.slice(0, markerIndex),
    status: Number(stdout.slice(markerIndex + marker.length).trim())
  };
}

async function requestOAuth1Text(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
}) {
  const proxyUrl = getXOAuthProxyUrl();
  if (proxyUrl) {
    return requestTextViaCurl({ ...input, proxyUrl });
  }
  const response = await fetch(input.url, {
    method: input.method,
    headers: input.headers,
    cache: "no-store"
  });
  return {
    body: await response.text(),
    status: response.status
  };
}

function parseFormBody(body: string) {
  return Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;
}

async function startOAuth1(request: Request, userId: string) {
  const origin = new URL(request.url).origin;
  const { apiKey, apiSecret, callbackUri, apiBaseUrl } = getXOAuth1Config(origin);
  if (!apiKey || !apiSecret) {
    return null;
  }

  const requestTokenUrl = `${apiBaseUrl}/oauth/request_token`;
  const oauthParams = makeOAuth1Params(apiKey, {
    oauth_callback: callbackUri
  });
  oauthParams.oauth_signature = signOAuth1({
    method: "POST",
    url: requestTokenUrl,
    params: oauthParams,
    consumerSecret: apiSecret
  });

  const response = await requestOAuth1Text({
    url: requestTokenUrl,
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader(oauthParams)
    }
  });
  const payload = parseFormBody(response.body);
  if (response.status < 200 || response.status >= 300 || !payload.oauth_token || !payload.oauth_token_secret) {
    console.error("[X OAuth1] request token failed:", {
      status: response.status,
      body: response.body.slice(0, 300)
    });
    return redirectToProfile(request, { x_error: "x_oauth_failed" });
  }

  saveXOAuth1RequestState({
    requestToken: payload.oauth_token,
    requestTokenSecret: payload.oauth_token_secret,
    userId,
    returnTo: "/app/profile",
    callbackUri,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const authorizeUrl = new URL(`${apiBaseUrl}/oauth/authorize`);
  authorizeUrl.searchParams.set("oauth_token", payload.oauth_token);
  return NextResponse.redirect(authorizeUrl);
}

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return redirectToProfile(request, { x_error: "connect_wallet_first" });
  }
  const requestedWallet = normalizeWalletAddress(new URL(request.url).searchParams.get("wallet"));
  let userId = auth.user.id;
  if (requestedWallet) {
    const db = await readDb();
    const walletUser = db.users.find(
      (user) => String(user.walletAddress || "").toLowerCase() === requestedWallet
    );
    if (!walletUser) {
      return redirectToProfile(request, { x_error: "connect_wallet_first" });
    }
    userId = walletUser.id;
  }

  const oauth1Response = await startOAuth1(request, userId);
  if (oauth1Response) return oauth1Response;

  const origin = new URL(request.url).origin;
  const { clientId, redirectUri, scopes } = getXOAuthConfig(origin);
  if (!clientId) {
    return redirectToProfile(request, { x_error: "x_oauth_not_configured" });
  }

  const state = randomOAuthValue();
  const codeVerifier = randomOAuthValue(64);
  const codeChallenge = createCodeChallenge(codeVerifier);
  const returnTo = "/app/profile";
  const statePayload = {
    state,
    codeVerifier,
    userId,
    returnTo,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.search = authorizeUrl.searchParams.toString().replace(/\+/g, "%20");

  const response = NextResponse.redirect(authorizeUrl);
  saveXOAuthState(statePayload);
  response.cookies.set({
    name: X_OAUTH_STATE_COOKIE,
    value: encodeXOAuthState(statePayload),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });
  return response;
}
