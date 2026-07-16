/**
 * Distributed rate limiting for serverless routes.
 *
 * When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, limits
 * are enforced in a shared Redis store (fixed-window buckets) so concurrent
 * warm instances share one counter. Without Redis, falls back to the in-process
 * sliding-window limiter — fine for local dev, not a cross-instance boundary.
 */

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

interface Bucket {
  hits: number[];
}

const memoryBuckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemory(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of memoryBuckets) {
    const newest = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (now - newest > 10 * 60 * 1000) {
      memoryBuckets.delete(key);
    }
  }
}

/** In-process sliding window — used when Redis is not configured. */
export function rateLimitMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupMemory(now);

  const windowStart = now - options.windowMs;
  const existing = memoryBuckets.get(key) ?? { hits: [] };
  const recent = existing.hits.filter((t) => t > windowStart);

  if (recent.length >= options.limit) {
    memoryBuckets.set(key, { hits: recent });
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  memoryBuckets.set(key, { hits: recent });

  return { allowed: true, remaining: Math.max(0, options.limit - recent.length) };
}

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Fixed-window bucket key shared across all serverless instances. */
function redisBucketKey(key: string, windowMs: number, now = Date.now()): string {
  const windowId = Math.floor(now / windowMs);
  return `rl:${key}:${windowId}`;
}

async function rateLimitRedis(key: string, options: RateLimitOptions): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const bucket = redisBucketKey(key, options.windowMs);
  const ttlSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucket],
        ["EXPIRE", bucket, ttlSeconds],
      ]),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { result?: unknown[] };
    const count = Number(json.result?.[0]);
    if (!Number.isFinite(count)) return null;

    if (count > options.limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: Math.max(0, options.limit - count) };
  } catch {
    return null;
  }
}

/**
 * Records a hit for `key` and reports whether it's within the allowed rate.
 * Prefers Upstash Redis when configured; otherwise uses in-process memory.
 */
export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  if (redisConfigured()) {
    const redisResult = await rateLimitRedis(key, options);
    if (redisResult) return redisResult;
  }
  return rateLimitMemory(key, options);
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

/**
 * Convenience guard for route handlers — returns a 429 response when blocked.
 */
export async function enforceRateLimit(
  key: string,
  options: RateLimitOptions,
  message = "Too many requests. Try again in a moment.",
): Promise<Response | null> {
  const { allowed } = await rateLimit(key, options);
  if (allowed) return null;
  return Response.json({ error: message }, { status: 429 });
}
