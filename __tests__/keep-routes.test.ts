import { describe, it, expect } from "vitest";
import {
  classifyChangeControlLane,
  extraLegalRedirect,
  isDarkApiPath,
  isDarkProductPath,
  isKeepApiPath,
  isKeepPagePath,
  isKeepPath,
  isV4HomeEnabled,
  isV4Path,
  isV4RouteActivated,
  compareAliasRedirect,
  normalizeAppPath,
  V4_LIVE_PATHS,
  V4_PENDING_PATHS,
} from "@/lib/auth/keep-routes";

describe("normalizeAppPath", () => {
  it("keeps `/` and strips other trailing slashes", () => {
    expect(normalizeAppPath("/")).toBe("/");
    expect(normalizeAppPath("/waitlist/")).toBe("/waitlist");
    expect(normalizeAppPath("/legal/privacy/")).toBe("/legal/privacy");
  });
});

describe("KEEP pages", () => {
  it("allows landing, waitlist, auth, and the three legal pages", () => {
    for (const path of [
      "/",
      "/waitlist",
      "/auth/sign-in",
      "/auth/sign-up",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/callback",
      "/auth/sign-out",
      "/legal/privacy",
      "/legal/terms",
      "/legal/cookies",
      "/marketing/gtm/foo.pdf",
    ]) {
      expect(isKeepPagePath(path), path).toBe(true);
    }
  });

  it("does not keep scratched product or extra marketing", () => {
    for (const path of [
      "/dashboard",
      "/assessment",
      "/first-moment",
      "/pricing",
      "/tools",
      "/admin",
      "/partner/dashboard",
    ]) {
      expect(isKeepPagePath(path), path).toBe(false);
    }
  });
});

describe("extra legal", () => {
  it("folds extra legal onto /legal/privacy and leaves KEEP legal alone", () => {
    expect(extraLegalRedirect("/legal/privacy")).toBeNull();
    expect(extraLegalRedirect("/legal/terms")).toBeNull();
    expect(extraLegalRedirect("/legal/cookies")).toBeNull();
    expect(extraLegalRedirect("/legal/disclaimer")).toBe("/legal/privacy");
    expect(extraLegalRedirect("/legal/subprocessors")).toBe("/legal/privacy");
    expect(extraLegalRedirect("/legal/dmca")).toBe("/legal/privacy");
    expect(extraLegalRedirect("/legal")).toBe("/legal/privacy");
    expect(extraLegalRedirect("/dashboard")).toBeNull();
  });
});

describe("CCP isKeepPath", () => {
  it("allows KEEP pages and KEEP APIs", () => {
    for (const path of [
      "/",
      "/waitlist",
      "/auth/sign-in",
      "/legal/privacy",
      "/legal/terms",
      "/legal/cookies",
      "/api/waitlist",
      "/api/healthcheck",
      "/api/csp-report",
    ]) {
      expect(isKeepPath(path), path).toBe(true);
    }
  });

  it("does not keep DARK product or pending Home", () => {
    expect(isKeepPath("/dashboard")).toBe(false);
    expect(isKeepPath("/assessment")).toBe(false);
    expect(isKeepPath("/home")).toBe(false);
    expect(isKeepPath("/api/scoring")).toBe(false);
  });
});

describe("CCP isDarkProductPath", () => {
  it("marks pre-PR15 product/role trees dark", () => {
    for (const path of [
      "/dashboard",
      "/admin",
      "/partner/dashboard",
      "/employee/dashboard",
    ]) {
      expect(isDarkProductPath(path), path).toBe(true);
      expect(classifyChangeControlLane(path), path).toBe("DARK");
    }
  });

  it("does not mark KEEP, extra legal, or V4 Home as dark pages", () => {
    expect(isDarkProductPath("/")).toBe(false);
    expect(isDarkProductPath("/legal/disclaimer")).toBe(false);
    expect(isDarkProductPath("/home")).toBe(false);
    expect(isDarkProductPath("/api/scoring")).toBe(false);
  });
});

describe("CCP isV4Path", () => {
  it("names Shell v4 workspaces as V4_PENDING and leaves V4_LIVE empty", () => {
    expect(V4_PENDING_PATHS).toEqual([
      "/home",
      "/money",
      "/path",
      "/scenarios",
      "/ask",
      "/tools",
      "/learn",
      "/settings",
      "/connections",
      "/assessment",
    ]);
    expect(V4_LIVE_PATHS).toEqual([]);
    expect(isV4Path("/home")).toBe(true);
    expect(isV4Path("/home/inbox")).toBe(true);
    expect(isV4Path("/money")).toBe(true);
    expect(isV4Path("/settings")).toBe(true);
    expect(isV4Path("/assessment")).toBe(true);
    expect(isV4Path("/learn")).toBe(true);
    expect(isV4Path("/ask")).toBe(true);
    expect(isV4Path("/money/bills")).toBe(true);
    expect(classifyChangeControlLane("/money/bills")).toBe("V4_PENDING");
    expect(compareAliasRedirect("/compare")).toBe("/scenarios");
    expect(compareAliasRedirect("/compare/foo")).toBe("/scenarios");
    expect(compareAliasRedirect("/scenarios")).toBeNull();
    expect(isV4Path("/compare")).toBe(false);
    expect(isV4Path("/dashboard")).toBe(false);
    expect(classifyChangeControlLane("/home")).toBe("V4_PENDING");
    expect(classifyChangeControlLane("/settings")).toBe("V4_PENDING");
    expect(classifyChangeControlLane("/assessment")).toBe("V4_PENDING");
    expect(classifyChangeControlLane("/learn")).toBe("V4_PENDING");
    expect(classifyChangeControlLane("/ask")).toBe("V4_PENDING");
    expect(classifyChangeControlLane("/trust")).toBe("DARK");
  });

  it("activates Home only when the flag is on and the allow-list includes Home", () => {
    expect(isV4HomeEnabled({})).toBe(false);
    expect(isV4HomeEnabled({ HOMI_V4_HOME_ENABLED: "true" })).toBe(true);
    expect(isV4HomeEnabled({ HOMI_V4_HOME_ENABLED: "TRUE" })).toBe(false);
    expect(isV4RouteActivated("/home", { v4HomeEnabled: false })).toBe(false);
    expect(isV4RouteActivated("/home", { v4HomeEnabled: true })).toBe(true);
    expect(
      isV4RouteActivated("/home", { v4HomeEnabled: true, allowList: [] }),
    ).toBe(false);
  });
});

describe("KEEP vs dark APIs", () => {
  it("keeps waitlist, healthcheck, and csp-report", () => {
    expect(isKeepApiPath("/api/waitlist")).toBe(true);
    expect(isKeepApiPath("/api/healthcheck")).toBe(true);
    expect(isKeepApiPath("/api/csp-report")).toBe(true);
    expect(isDarkApiPath("/api/waitlist")).toBe(false);
  });

  it("darks product JSON", () => {
    for (const path of [
      "/api/scoring",
      "/api/assessments",
      "/api/advisor",
      "/api/agents",
      "/api/account/export",
      "/api/checkout",
      "/api/billing/portal",
      "/api/plaid/accounts",
      "/api/household",
      "/api/admin/users",
    ]) {
      expect(isDarkApiPath(path), path).toBe(true);
      expect(isKeepApiPath(path), path).toBe(false);
    }
  });
});
