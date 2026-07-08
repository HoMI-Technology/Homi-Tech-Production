import { describe, it, expect } from "vitest";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

describe("rateLimit", () => {
  it("allows up to the limit and blocks beyond it", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
    expect(rateLimit(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("tracks remaining correctly", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(2);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(1);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).remaining).toBe(0);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("isolates keys", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
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
