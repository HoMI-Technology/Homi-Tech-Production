/**
 * Rate limiter — Upstash Redis when configured, in-memory fallback otherwise.
 *
 * With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set, limits are
 * enforced in a shared Redis store (fixed window via INCR + PEXPIRE NX in a
 * single pipelined round trip), so they hold across all serverless
 * instances. Uses Upstash's plain REST API via fetch — no SDK dependency.
 *
 * Without those env vars (local dev, preview without keys), it falls back to
 * the original in-memory sliding window. KNOWN LIMITATION of the fallback:
 * state lives in the process, so each warm serverless instance enforces
 * limits separately — a determined client hitting N instances gets ~N× the
 * nominal limit. The same fallback also absorbs Redis outages (fail-open to
 * memory, never hard-fail the request): these limits are cost/abuse
 * dampening, not a security boundary — auth and entitlements are.
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

/** In-memory sliding-window fallback (also the local-dev implementation). */
function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
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

/** True when Upstash Redis env vars are configured. */
export function hasUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Cap on how long we'll wait for Redis before failing open to memory. */
const REDIS_TIMEOUT_MS = 1000;

/**
 * Fixed-window count in Upstash via a single pipelined round trip:
 * INCR the window's counter, then PEXPIRE it (NX: only set a TTL the first
 * time) so abandoned windows self-clean. Fixed window admits ≤ 2× the limit
 * across a window boundary in the worst case — acceptable for cost/abuse
 * dampening and the standard tradeoff for a one-round-trip limiter.
 */
async function upstashRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const windowIndex = Math.floor(Date.now() / options.windowMs);
  const redisKey = `rl:${key}:${windowIndex}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(options.windowMs), "NX"],
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
 * Redis-backed (shared across instances) when Upstash is configured;
 * in-memory otherwise. Redis errors fail open to the in-memory fallback so
 * an Upstash outage can never take the API down.
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (hasUpstash()) {
    try {
      return await upstashRateLimit(key, options);
    } catch (err) {
      console.warn(
        `[ratelimit] Upstash unavailable, falling back to in-memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return memoryRateLimit(key, options);
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
