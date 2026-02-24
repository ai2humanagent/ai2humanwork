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

