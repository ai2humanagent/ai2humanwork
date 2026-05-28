import { NextResponse } from "next/server";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { updateDb } from "../../../../lib/store";
import {
  X_OAUTH_STATE_COOKIE,
  decodeXOAuthState,
  getXOAuth1Config,
  getXOAuthConfig,
  takeXOAuth1RequestState,
  takeXOAuthState
} from "../../../../lib/xOAuth";

export const runtime = "nodejs";

type XTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type XUserResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
  errors?: unknown[];
  title?: string;
  detail?: string;
  reason?: string;
  type?: string;
};

type XOAuth1UserResponse = {
  id_str?: string;
  name?: string;
  screen_name?: string;
  profile_image_url_https?: string;
  errors?: Array<{ code?: number; message?: string }>;
};

class XOAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type JsonHttpResponse<T> = {
  ok: boolean;
  status: number;
  payload: T;
};

const execFileAsync = promisify(execFile);

function getXOAuthProxyUrl() {
  return (
    process.env.X_OAUTH_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    ""
  ).trim();
}

function oauthEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
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
    oauth_nonce: crypto.randomBytes(18).toString("base64url"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extra
  };
}

async function fetchJsonViaCurl<T>(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  proxyUrl: string;
}): Promise<JsonHttpResponse<T>> {
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
  if (input.body !== undefined) {
    args.push("--data-raw", input.body);
  }
  args.push("-w", "\n__HTTP_STATUS__:%{http_code}", input.url);

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 1024 * 1024
  });
  const marker = "\n__HTTP_STATUS__:";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error("X OAuth proxy request returned an unreadable response.");
  }
  const responseBody = stdout.slice(0, markerIndex);
  const status = Number(stdout.slice(markerIndex + marker.length).trim());
  return {
    ok: status >= 200 && status < 300,
    status,
    payload: (JSON.parse(responseBody || "{}") || {}) as T
  };
}

async function fetchTextViaCurl(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
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
  if (input.body !== undefined) {
    args.push("--data-raw", input.body);
  }
  args.push("-w", "\n__HTTP_STATUS__:%{http_code}", input.url);
  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 1024 * 1024
  });
  const marker = "\n__HTTP_STATUS__:";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error("X OAuth request returned an unreadable response.");
  }
  return {
    body: stdout.slice(0, markerIndex),
    status: Number(stdout.slice(markerIndex + marker.length).trim())
  };
}

async function fetchJson<T>(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: URLSearchParams }
): Promise<JsonHttpResponse<T>> {
  const proxyUrl = getXOAuthProxyUrl();
  const method = init.method || "GET";
  const headers = init.headers || {};
  const body = init.body?.toString();

  if (proxyUrl) {
    return fetchJsonViaCurl<T>({
      url,
      method,
      headers,
      body,
      proxyUrl
    });
  }

  const response = await fetch(url, {
    method,
    headers,
    body: init.body,
    cache: "no-store"
  });
  return {
    ok: response.ok,
    status: response.status,
    payload: (await response.json().catch(() => ({}))) as T
  };
}

async function fetchText(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string }
) {
  const proxyUrl = getXOAuthProxyUrl();
  const method = init.method || "GET";
  const headers = init.headers || {};
  if (proxyUrl) {
    return fetchTextViaCurl({
      url,
      method,
      headers,
      body: init.body,
      proxyUrl
    });
  }
  const response = await fetch(url, {
    method,
    headers,
    body: init.body,
    cache: "no-store"
  });
  return {
    status: response.status,
    body: await response.text()
  };
}

function parseFormBody(body: string) {
  return Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;
}

async function bindXAccount(input: {
  userId: string;
  xUser: {
    subject: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
  };
}) {
  const now = new Date().toISOString();
  let conflict = false;
  let updated = false;

  await updateDb((db) => {
    conflict = db.users.some(
      (user) => user.id !== input.userId && user.xAccount?.subject === input.xUser.subject
    );
    if (conflict) return;

    const user = db.users.find((item) => item.id === input.userId);
    if (!user) return;
    user.xAccount = {
      subject: input.xUser.subject,
      username: input.xUser.username.replace(/^@/, ""),
      name: input.xUser.name || undefined,
      profilePictureUrl: input.xUser.profilePictureUrl || undefined,
      linkedAt: now
    };
    updated = true;
  });

  return { conflict, updated };
}

function redirectToProfile(request: Request, params: Record<string, string>) {
  const url = new URL("/app/profile", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: X_OAUTH_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0
  });
  return response;
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawName, ...rest] = pair.trim().split("=");
    if (rawName === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: input.codeVerifier
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded"
  };
  if (input.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`;
  }

  const response = await fetchJson<XTokenResponse>("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body
  });
  const payload = response.payload;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Unable to exchange X OAuth code. status=${response.status}`
    );
  }
  console.info("[X OAuth] token exchanged", {
    scope: payload.scope || "unknown",
    tokenType: payload.token_type || "unknown"
  });
  return payload.access_token;
}

async function fetchXUser(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };
  let response = await fetchJson<XUserResponse>("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers
  });
  if (!response.ok || !response.payload.data?.id || !response.payload.data.username) {
    response = await fetchJson<XUserResponse>("https://api.x.com/2/users/me", {
      headers
    });
  }
  const payload = response.payload;
  if (!response.ok || !payload.data?.id || !payload.data.username) {
    if (response.status === 403 && payload.reason === "client-not-enrolled") {
      throw new XOAuthError(
        "x_api_not_enrolled",
        "X API v2 access is not enabled for this Project."
      );
    }
    throw new Error(
      `Unable to load X account. status=${response.status} detail=${JSON.stringify({
        title: payload.title,
        detail: payload.detail,
        reason: payload.reason,
        type: payload.type,
        errors: payload.errors
      })}`
    );
  }
  return payload.data;
}

async function exchangeOAuth1AccessToken(input: {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  requestToken: string;
  requestTokenSecret: string;
  verifier: string;
}) {
  const accessTokenUrl = `${input.apiBaseUrl}/oauth/access_token`;
  const oauthParams = makeOAuth1Params(input.apiKey, {
    oauth_token: input.requestToken,
    oauth_verifier: input.verifier
  });
  oauthParams.oauth_signature = signOAuth1({
    method: "POST",
    url: accessTokenUrl,
    params: oauthParams,
    consumerSecret: input.apiSecret,
    tokenSecret: input.requestTokenSecret
  });
  const response = await fetchText(accessTokenUrl, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader(oauthParams)
    }
  });
  const payload = parseFormBody(response.body);
  if (
    response.status < 200 ||
    response.status >= 300 ||
    !payload.oauth_token ||
    !payload.oauth_token_secret
  ) {
    throw new Error(`Unable to exchange X OAuth1 token. status=${response.status}`);
  }
  return payload;
}

async function fetchOAuth1User(input: {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  fallbackUserId?: string;
  fallbackScreenName?: string;
}) {
  const verifyUrl = `${input.apiBaseUrl}/1.1/account/verify_credentials.json`;
  const queryParams = {
    include_email: "false",
    skip_status: "true"
  };
  const oauthParams = makeOAuth1Params(input.apiKey, {
    oauth_token: input.accessToken
  });
  oauthParams.oauth_signature = signOAuth1({
    method: "GET",
    url: verifyUrl,
    params: {
      ...queryParams,
      ...oauthParams
    },
    consumerSecret: input.apiSecret,
    tokenSecret: input.accessTokenSecret
  });
  const url = new URL(verifyUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }
  const response = await fetchText(url.toString(), {
    method: "GET",
    headers: {
      Authorization: buildOAuthHeader(oauthParams)
    }
  });
  const payload = JSON.parse(response.body || "{}") as XOAuth1UserResponse;
  if (response.status >= 200 && response.status < 300 && payload.id_str && payload.screen_name) {
    return {
      subject: payload.id_str,
      username: payload.screen_name,
      name: payload.name || undefined,
      profilePictureUrl: payload.profile_image_url_https || undefined
    };
  }
  if (input.fallbackUserId && input.fallbackScreenName) {
    console.warn("[X OAuth1] verify_credentials failed, using access token identity", {
      status: response.status,
      errors: payload.errors || []
    });
    return {
      subject: input.fallbackUserId,
      username: input.fallbackScreenName
    };
  }
  throw new Error(`Unable to load X OAuth1 account. status=${response.status}`);
}

async function handleOAuth1Callback(request: Request, url: URL) {
  const denied = url.searchParams.get("denied");
  if (denied) {
    return redirectToProfile(request, { x_error: "x_oauth_failed" });
  }

  const requestToken = url.searchParams.get("oauth_token") || "";
  const verifier = url.searchParams.get("oauth_verifier") || "";
  const savedState = requestToken ? takeXOAuth1RequestState(requestToken) : null;
  if (!requestToken || !verifier || !savedState) {
    return redirectToProfile(request, { x_error: "invalid_x_oauth_state" });
  }

  const origin = new URL(request.url).origin;
  const { apiKey, apiSecret, apiBaseUrl } = getXOAuth1Config(origin);
  if (!apiKey || !apiSecret) {
    return redirectToProfile(request, { x_error: "x_oauth_not_configured" });
  }

  try {
    const accessToken = await exchangeOAuth1AccessToken({
      apiBaseUrl,
      apiKey,
      apiSecret,
      requestToken,
      requestTokenSecret: savedState.requestTokenSecret,
      verifier
    });
    const xUser = await fetchOAuth1User({
      apiBaseUrl,
      apiKey,
      apiSecret,
      accessToken: accessToken.oauth_token,
      accessTokenSecret: accessToken.oauth_token_secret,
      fallbackUserId: accessToken.user_id,
      fallbackScreenName: accessToken.screen_name
    });
    const { conflict, updated } = await bindXAccount({
      userId: savedState.userId,
      xUser
    });
    if (conflict) {
      return redirectToProfile(request, { x_error: "x_account_already_bound" });
    }
    if (!updated) {
      return redirectToProfile(request, { x_error: "session_changed" });
    }
    return redirectToProfile(request, { x_linked: "1" });
  } catch (err) {
    console.error("[X OAuth1] callback failed:", err);
    return redirectToProfile(request, { x_error: "x_oauth_failed" });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("oauth_token") || url.searchParams.has("oauth_verifier") || url.searchParams.has("denied")) {
    return handleOAuth1Callback(request, url);
  }

  const error = url.searchParams.get("error");
  if (error) {
    return redirectToProfile(request, { x_error: error });
  }

  const code = url.searchParams.get("code") || "";
  const returnedState = url.searchParams.get("state") || "";
  const cookieState = decodeXOAuthState(getCookie(request, X_OAUTH_STATE_COOKIE));
  const savedState =
    cookieState && cookieState.state === returnedState
      ? cookieState
      : returnedState
        ? takeXOAuthState(returnedState)
        : null;
  if (!code || !returnedState || !savedState || savedState.state !== returnedState) {
    return redirectToProfile(request, { x_error: "invalid_x_oauth_state" });
  }

  const origin = new URL(request.url).origin;
  const { clientId, clientSecret, redirectUri } = getXOAuthConfig(origin);
  if (!clientId) {
    return redirectToProfile(request, { x_error: "x_oauth_not_configured" });
  }

  try {
    const accessToken = await exchangeCode({
      code,
      codeVerifier: savedState.codeVerifier,
      clientId,
      clientSecret,
      redirectUri: savedState.redirectUri || redirectUri
    });
    const xUser = await fetchXUser(accessToken);
    const { conflict, updated } = await bindXAccount({
      userId: savedState.userId,
      xUser: {
        subject: xUser.id,
        username: xUser.username,
        name: xUser.name || undefined,
        profilePictureUrl: xUser.profile_image_url || undefined
      }
    });

    if (conflict) {
      return redirectToProfile(request, { x_error: "x_account_already_bound" });
    }
    if (!updated) {
      return redirectToProfile(request, { x_error: "session_changed" });
    }
    return redirectToProfile(request, { x_linked: "1" });
  } catch (err) {
    console.error("[X OAuth] callback failed:", err);
    if (err instanceof XOAuthError) {
      return redirectToProfile(request, { x_error: err.code });
    }
    return redirectToProfile(request, { x_error: "x_oauth_failed" });
  }
}
