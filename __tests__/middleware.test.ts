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
  getUserCalls: 0,
  getUserImpl: null as null | (() => Promise<{ data: { user: { id: string } | null } }>),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    state.createClientCalls += 1;
    return {
      auth: {
        getUser: () => {
          state.getUserCalls += 1;
          if (state.getUserImpl) return state.getUserImpl();
          return Promise.resolve({ data: { user: state.user } });
        },
      },
    };
  },
}));

import { AUTH_LOOKUP_TIMEOUT_MS, middleware } from "@/middleware";

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
  state.getUserCalls = 0;
  state.getUserImpl = null;
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

  it("still serves the public landing page", async () => {
    const res = await middleware(req("/"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("retires /results to First Moment when the session cannot be verified", async () => {
    const res = await middleware(req("/results"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/first-moment");
    expect(state.createClientCalls).toBe(0);
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
    expect(state.getUserCalls).toBe(0);
  });

  it("does not call getUser on public marketing paths", async () => {
    for (const path of ["/", "/pricing", "/how-it-works", "/about"]) {
      state.createClientCalls = 0;
      state.getUserCalls = 0;
      const res = await middleware(req(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("location"), path).toBeNull();
      expect(state.createClientCalls, path).toBe(0);
      expect(state.getUserCalls, path).toBe(0);
    }
  });

  it("retires /results to Home when signed in, First Moment when guest", async () => {
    state.user = { id: "user-1" };
    const signedIn = await middleware(req("/results"));
    expect(signedIn.status).toBe(307);
    expect(new URL(signedIn.headers.get("location") ?? "").pathname).toBe("/dashboard");

    state.user = null;
    const guest = await middleware(req("/results"));
    expect(guest.status).toBe(307);
    expect(new URL(guest.headers.get("location") ?? "").pathname).toBe("/first-moment");
  });
});

describe("middleware does not hang on a never-resolving getUser", () => {
  beforeEach(() => {
    vi.stubEnv(ENV_URL, "https://example.supabase.co");
    vi.stubEnv(ENV_KEY, "anon-key");
    state.getUserImpl = () => new Promise(() => {});
  });

  it("serves public / (and other marketing paths) without waiting on Auth", async () => {
    const started = Date.now();
    const home = await middleware(req("/"));
    const elapsed = Date.now() - started;
    expect(home.status).toBe(200);
    expect(home.headers.get("location")).toBeNull();
    expect(state.createClientCalls).toBe(0);
    expect(state.getUserCalls).toBe(0);
    expect(elapsed).toBeLessThan(200);

    for (const path of ["/pricing", "/how-it-works", "/assessment", "/tools"]) {
      const res = await middleware(req(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("still redirects unauthenticated protected routes — fail-closed, bounded", async () => {
    const started = Date.now();
    const res = await middleware(req("/dashboard"));
    const elapsed = Date.now() - started;
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/sign-in");
    expect(location).toContain("next=%2Fdashboard");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(state.getUserCalls).toBe(1);
    expect(elapsed).toBeLessThan(AUTH_LOOKUP_TIMEOUT_MS + 500);
  });

  it("fails open on retired /results when Auth never answers", async () => {
    const started = Date.now();
    const res = await middleware(req("/results"));
    const elapsed = Date.now() - started;
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/first-moment");
    expect(elapsed).toBeLessThan(AUTH_LOOKUP_TIMEOUT_MS + 500);
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
