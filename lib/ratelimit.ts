/**
 * In-memory sliding-window rate limiter.
 *
 * KNOWN LIMITATION (deliberate tradeoff): state lives in the process, so
 * on serverless platforms each warm instance enforces limits separately —
 * a determined client hitting N instances gets ~N× the nominal limit.
 * Acceptable at launch traffic; NOT sufficient against a real abuser.
 * The upgrade path is swapping the body of `rateLimit()` for a shared
 * store (e.g. Upstash Redis `INCR`+`EXPIRE`) — callers keep the same
 * signature, so no route changes are needed. Do not treat these limits
 * as a security boundary; they are cost/abuse dampening only.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    // Drop buckets whose most recent hit is older than 10 minutes —
    // safely beyond any realistic windowMs used by callers.
    const newest = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (now - newest > 10 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Max allowed hits within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining hits allowed in the current window (0 when blocked). */
  remaining: number;
}

/**
 * Records a hit for `key` and reports whether it's within the allowed
 * rate. Sliding window: only hits within the last `windowMs` count.
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const windowStart = now - options.windowMs;
  const existing = buckets.get(key) ?? { hits: [] };
  const recent = existing.hits.filter((t) => t > windowStart);

  if (recent.length >= options.limit) {
    buckets.set(key, { hits: recent });
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  buckets.set(key, { hits: recent });

  return { allowed: true, remaining: Math.max(0, options.limit - recent.length) };
}

/** Extracts a best-effort client IP from standard proxy headers. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
