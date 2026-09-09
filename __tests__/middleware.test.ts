import { afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function reqUrl(url: string): NextRequest {
  return new NextRequest(url);
}

function pathname(res: Response): string {
  return new URL(res.headers.get("location") ?? "http://localhost/missing").pathname;
}

describe("PR15 KEEP pages pass through", () => {
  it("serves landing, waitlist, auth, and KEEP legal", async () => {
    for (const path of [
      "/",
      "/waitlist",
      "/auth/sign-in",
      "/auth/sign-up",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/legal/privacy",
      "/legal/terms",
      "/legal/cookies",
    ]) {
      const res = await middleware(req(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("does not call a session lookup on KEEP or KILL (no product gate)", async () => {
    const home = await middleware(req("/"));
    expect(home.status).toBe(200);
    const killed = await middleware(req("/dashboard"));
    expect(killed.status).toBe(307);
    expect(pathname(killed)).toBe("/");
  });
});

describe("PR15 KILL pages redirect to `/` for guests and would-be sessions", () => {
  it("folds old product URLs onto `/`", async () => {
    for (const path of [
      "/dashboard",
      "/assessment",
      "/path",
      "/plan",
      "/money",
      "/tools",
      "/advisor",
      "/learn",
      "/timeline",
      "/connections",
      "/settings",
      "/scenarios",
      "/journal",
      "/household",
      "/simulator",
      "/decisions",
      "/admin",
      "/team",
      "/employee/dashboard",
      "/partner/dashboard",
      "/first-moment",
      "/pricing",
      "/how-it-works",
      "/results",
      "/shadow-score",
    ]) {
      const res = await middleware(req(path));
      expect(res.status, path).toBe(307);
      expect(pathname(res), path).toBe("/");
    }
  });

  it("does not bounce KILL routes to sign-in", async () => {
    const res = await middleware(req("/dashboard"));
    expect(pathname(res)).toBe("/");
    expect(res.headers.get("location") ?? "").not.toContain("/auth/sign-in");
  });
});

describe("extra legal folds to /legal/privacy", () => {
  it("redirects disclaimer, subprocessors, dmca, acceptable-use", async () => {
    for (const path of [
      "/legal/disclaimer",
      "/legal/subprocessors",
      "/legal/dmca",
      "/legal/acceptable-use",
    ]) {
      const res = await middleware(req(path));
      expect(res.status, path).toBe(307);
      expect(pathname(res), path).toBe("/legal/privacy");
    }
  });
});

describe("PR15 dark APIs", () => {
  it("404s product JSON and leaves KEEP APIs open", async () => {
    const scoring = await middleware(req("/api/scoring"));
    expect(scoring.status).toBe(404);
    expect(await scoring.json()).toEqual({ error: "not_found" });

    const waitlist = await middleware(req("/api/waitlist"));
    expect(waitlist.status).toBe(200);
    expect(waitlist.headers.get("location")).toBeNull();

    const health = await middleware(req("/api/healthcheck"));
    expect(health.status).toBe(200);

    const csp = await middleware(req("/api/csp-report"));
    expect(csp.status).toBe(200);
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

  it("www KILL paths fold to apex first, not to www `/`", async () => {
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

  it("does not noindex KEEP public pages", async () => {
    const res = await middleware(req("/"));
    expect(res.headers.get("X-Robots-Tag")).toBeNull();
  });
});

describe("CCP v1 `/home` activation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("DARK-style: flag off folds `/home` onto `/`", async () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "false");
    const res = await middleware(req("/home"));
    expect(res.status).toBe(307);
    expect(pathname(res)).toBe("/");
  });

  it("flag on lets `/home` pass (no Home UI in this PR — Next 404s the empty route)", async () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "true");
    const res = await middleware(req("/home"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
