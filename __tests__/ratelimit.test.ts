import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, rateLimitMemory, getClientIp } from "@/lib/ratelimit";

describe("rateLimitMemory", () => {
  it("allows up to the limit and blocks beyond it", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimitMemory(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
    expect(rateLimitMemory(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("tracks remaining correctly", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimitMemory(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(2);
    expect(rateLimitMemory(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(1);
    expect(rateLimitMemory(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(0);
    expect(rateLimitMemory(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("isolates keys", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimitMemory(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimitMemory(a, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimitMemory(b, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
  });
});

describe("rateLimit (async)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("uses Redis when Upstash env is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: [1, 1] }),
    }) as typeof fetch;

    const result = await rateLimit(`redis-test-${Math.random()}`, { limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("falls back to memory when Redis fetch fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as typeof fetch;

    const key = `fallback-${Math.random()}`;
    const result = await rateLimit(key, { limit: 2, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(getClientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
