import { describe, it, expect } from "vitest";
import {
  extraLegalRedirect,
  isDarkApiPath,
  isKeepApiPath,
  isKeepPagePath,
  normalizeAppPath,
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
