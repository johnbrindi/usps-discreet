/**
 * Fixed-window, in-memory rate limiter. Effective per server instance — for multi-instance
 * deployments swap the store for Redis/Upstash (see docs/architecture.md).
 */
type Bucket = { count: number; resetAt: number };

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const buckets = new Map<string, Bucket>();
  const maxKeys = opts.maxKeys ?? 10_000;

  return function check(key: string, now = Date.now()) {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxKeys) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
        if (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    const allowed = bucket.count <= opts.limit;
    return { allowed, remaining: Math.max(0, opts.limit - bucket.count), retryAfterMs: allowed ? 0 : bucket.resetAt - now };
  };
}

export const trackingLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
export const contactLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
export const serviceRequestLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
export const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
/** Visit pings: one per page load or tab close, so this only stops floods. */
export const presenceLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const loginLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
