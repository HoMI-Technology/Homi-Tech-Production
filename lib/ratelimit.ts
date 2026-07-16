/**
 * Distributed rate limiting for serverless routes.
 *
 * When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, limits
 * are enforced in a shared Redis store (fixed window via INCR + PEXPIRE NX in
 * a single pipelined round trip) so concurrent warm instances share one
 * counter. Uses Upstash's plain REST API via fetch — no SDK dependency.
 *
 * Without Redis (local dev, previews without keys) — or if Redis errors or
 * times out — falls back to the in-process sliding-window limiter (fail-open:
 * an Upstash outage can never take the API down). The fallback is per
 * instance, so a client hitting N warm instances gets ~N× the nominal limit:
 * these limits are cost/abuse dampening, not a security boundary — auth and
 * entitlements are.
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

/** True when Upstash Redis env vars are configured. */
export function hasUpstash(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Cap on how long we'll wait for Redis before failing open to memory. */
const REDIS_TIMEOUT_MS = 1000;

/**
 * Fixed-window count in Upstash via a single pipelined round trip: INCR the
 * window's counter, then PEXPIRE it (NX: only set a TTL the first time) so
 * abandoned windows self-clean. The pipeline endpoint returns an ARRAY of
 * per-command results — `[{result}, {result}]` — not `{result: [...]}`.
 * Fixed window admits ≤ 2× the limit across a window boundary in the worst
 * case — the standard tradeoff for a one-round-trip limiter.
 */
async function rateLimitRedis(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const windowIndex = Math.floor(Date.now() / options.windowMs);
  const bucket = `rl:${key}:${windowIndex}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", bucket],
      ["PEXPIRE", bucket, String(options.windowMs), "NX"],
    ]),
    signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Upstash pipeline responded ${res.status}`);
  }

  const results = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  const first = results?.[0];
  if (!first || typeof first.result !== "number") {
    throw new Error(first?.error ?? "Upstash pipeline returned no INCR count");
  }

  const count = first.result;
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
  };
}

/**
 * Records a hit for `key` and reports whether it's within the allowed rate.
 * Prefers Upstash Redis when configured; Redis errors fail open to the
 * in-process fallback.
 */
export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  if (hasUpstash()) {
    try {
      return await rateLimitRedis(key, options);
    } catch (err) {
      console.warn(
        `[ratelimit] Upstash unavailable, falling back to in-memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
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
