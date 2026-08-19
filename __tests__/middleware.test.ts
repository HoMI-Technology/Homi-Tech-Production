import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Middleware fail-closed tests (ported from origin/feat/security-hardening
 * 4324ce4, adapted to the isProtectedPath classification on main).
 *
 * Regression context: when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY were missing,
 * the middleware used to `return response` for EVERY request — fail-OPEN —
 * serving protected routes with no session verification at all. It must fail
 * CLOSED instead: protected routes redirect to sign-in; public routes still
 * pass through.
 */

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  createClientCalls: 0,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    state.createClientCalls += 1;
    return {
      auth: { getUser: async () => ({ data: { user: state.user } }) },
    };
  },
}));

import { middleware } from "@/middleware";

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function reqUrl(url: string): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  state.user = null;
  state.createClientCalls = 0;
  // Missing env = the fail-closed scenario (stubbed, never ambient-dependent).
  vi.stubEnv(ENV_URL, "");
  vi.stubEnv(ENV_KEY, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware fail-closed (Supabase env missing)", () => {
  it("redirects a protected route to sign-in instead of serving it", async () => {
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/sign-in");
    expect(location).toContain("next=%2Fdashboard");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("redirects nested protected paths and preserves the full next target", async () => {
    const res = await middleware(req("/settings/billing"));
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/sign-in");
    expect(location).toContain("next=%2Fsettings%2Fbilling");
  });

  it("never even builds a Supabase client when env is missing (fail fast)", async () => {
    await middleware(req("/dashboard"));
    expect(state.createClientCalls).toBe(0);
  });

  it("still serves public product routes", async () => {
    const res = await middleware(req("/tools"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("still serves non-product public pages", async () => {
    const res = await middleware(req("/pricing"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware with Supabase env present", () => {
  beforeEach(() => {
    vi.stubEnv(ENV_URL, "https://example.supabase.co");
    vi.stubEnv(ENV_KEY, "anon-key");
  });

  it("redirects unauthenticated users away from protected routes", async () => {
    state.user = null;
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/sign-in");
    expect(location).toContain("next=%2Fdashboard");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("passes authenticated users through on protected routes", async () => {
    state.user = { id: "user-1" };
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("leaves /assessment public so the page can send guests to First Moment", async () => {
    // Middleware must not bounce /assessment to sign-in — that skips First Moment.
    // The page itself server-redirects guests to /first-moment.
    state.user = null;
    const res = await middleware(req("/assessment"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware www → apex", () => {
  it("308s https www onto the matching apex path", async () => {
    const res = await middleware(reqUrl("https://www.homitechnology.com/how-it-works"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://homitechnology.com/how-it-works");
  });

  it("does not stop HTTP www at https://www — Location is https apex", async () => {
    const res = await middleware(reqUrl("http://www.homitechnology.com/how-it-works"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://homitechnology.com/how-it-works");
    expect(res.headers.get("location")).not.toContain("www.homitechnology.com");
  });

  it("preserves query strings on www → apex", async () => {
    const res = await middleware(reqUrl("https://www.homitechnology.com/pricing?utm=1"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://homitechnology.com/pricing?utm=1");
  });

  it("308s www homepage to the trailing-slash apex", async () => {
    const res = await middleware(reqUrl("https://www.homitechnology.com/"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://homitechnology.com/");
  });

  it("www protected paths fold to apex first, not to www sign-in", async () => {
    const res = await middleware(reqUrl("https://www.homitechnology.com/dashboard"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://homitechnology.com/dashboard");
  });
});

describe("middleware sign-in X-Robots-Tag", () => {
  it("sends X-Robots-Tag: noindex on the sign-in response", async () => {
    const res = await middleware(req("/auth/sign-in"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("does not noindex public marketing pages", async () => {
    const res = await middleware(req("/how-it-works"));
    expect(res.headers.get("X-Robots-Tag")).toBeNull();
  });
});
