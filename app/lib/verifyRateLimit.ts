// Minimal in-memory fixed-window rate limiter for the verify API.
// Note: state is per server instance (fine for MVP; move to Redis/Upstash when scaling).

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitExceeded(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || "unknown";
}
