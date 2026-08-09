import { afterEach, describe, it, expect, vi } from "vitest";
import { rateLimit, rateLimitMemory, getClientIp, hasUpstash } from "@/lib/ratelimit";

describe("rateLimitMemory (in-process fallback)", () => {
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

describe("rateLimit (Upstash Redis path)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubUpstash() {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  }

  /** Upstash /pipeline responds with an ARRAY of per-command results. */
  function pipelineResponse(count: number) {
    return new Response(JSON.stringify([{ result: count }, { result: 1 }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("hasUpstash reflects env configuration", () => {
    expect(hasUpstash()).toBe(false);
    stubUpstash();
    expect(hasUpstash()).toBe(true);
  });

  it("allows while the INCR count is within the limit", async () => {
    stubUpstash();
    const fetchMock = vi.fn().mockResolvedValue(pipelineResponse(3));
    vi.stubGlobal("fetch", fetchMock);

    const result = await rateLimit("redis-key", { limit: 5, windowMs: 60_000 });
    expect(result).toEqual({ allowed: true, remaining: 2 });

    // One pipelined round trip: INCR + PEXPIRE NX on a window-scoped key.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://fake.upstash.io/pipeline");
    expect(init.headers.Authorization).toBe("Bearer fake-token");
    const commands = JSON.parse(init.body);
    expect(commands[0][0]).toBe("INCR");
    expect(commands[0][1]).toMatch(/^rl:redis-key:\d+$/);
    expect(commands[1][0]).toBe("PEXPIRE");
    expect(commands[1][3]).toBe("NX");
  });

  it("blocks when the INCR count exceeds the limit", async () => {
    stubUpstash();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(pipelineResponse(6)));

    const result = await rateLimit("redis-key", { limit: 5, windowMs: 60_000 });
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("fails open to the in-memory fallback when Redis errors", async () => {
    stubUpstash();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect timeout")));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const key = `fallback-${Math.random()}`;
    // Request still succeeds (availability over strictness)…
    expect((await rateLimit(key, { limit: 2, windowMs: 60_000 })).allowed).toBe(true);
    expect((await rateLimit(key, { limit: 2, windowMs: 60_000 })).allowed).toBe(true);
    // …and the memory fallback still enforces the limit.
    expect((await rateLimit(key, { limit: 2, windowMs: 60_000 })).allowed).toBe(false);
  });

  it("fails open when Upstash responds non-200", async () => {
    stubUpstash();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const key = `non200-${Math.random()}`;
    expect((await rateLimit(key, { limit: 1, windowMs: 60_000 })).allowed).toBe(true);
  });

  it("does not call fetch at all when Upstash env is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await rateLimit(`no-env-${Math.random()}`, { limit: 1, windowMs: 60_000 });
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(getClientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe(
      "9.9.9.9",
    );
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
