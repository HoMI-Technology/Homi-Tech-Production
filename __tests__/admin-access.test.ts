/**
 * Admin-access policy contract (lib/auth/admin). What matters:
 * - role + optional email allowlist gate access
 * - MFA is always required (2026-08 policy): AAL2 session passes, enrolled
 *   but AAL1 must step up, no verified factor gets guided enrollment — and
 *   every failure mode fails closed.
 */

import { describe, it, expect } from "vitest";
import {
  deriveNextLevel,
  evaluateAdminAccess,
  isEmailAllowlisted,
  parseAdminEmails,
  type AdminAccessInput,
} from "@/lib/auth/admin";

/** A baseline enrolled admin with a verified (AAL2) session — the happy path. */
function base(overrides: Partial<AdminAccessInput> = {}): AdminAccessInput {
  return {
    role: "admin",
    email: "admin@homi.com",
    allowlist: [],
    currentLevel: "aal2",
    nextLevel: "aal2",
    ...overrides,
  };
}

describe("parseAdminEmails", () => {
  it("normalizes, lowercases, splits on commas/space, and de-dupes", () => {
    expect(parseAdminEmails("A@x.com, b@Y.com  a@x.com")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("returns [] for empty/undefined (allowlist disabled)", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });

  it("drops tokens that aren't email-shaped", () => {
    expect(parseAdminEmails("notanemail, real@x.com")).toEqual(["real@x.com"]);
  });
});

describe("isEmailAllowlisted", () => {
  it("passes everyone when the allowlist is empty", () => {
    expect(isEmailAllowlisted("anyone@x.com", [])).toBe(true);
  });

  it("matches case-insensitively and rejects non-members", () => {
    expect(isEmailAllowlisted("Admin@X.com", ["admin@x.com"])).toBe(true);
    expect(isEmailAllowlisted("other@x.com", ["admin@x.com"])).toBe(false);
    expect(isEmailAllowlisted(null, ["admin@x.com"])).toBe(false);
  });
});

describe("deriveNextLevel", () => {
  it("reports aal2 when any factor is verified", () => {
    expect(deriveNextLevel([{ status: "verified" }])).toBe("aal2");
    expect(deriveNextLevel([{ status: "unverified" }, { status: "verified" }])).toBe("aal2");
  });

  it("reports aal1 for an empty list or only-unverified factors", () => {
    expect(deriveNextLevel([])).toBe("aal1");
    expect(deriveNextLevel([{ status: "unverified" }])).toBe("aal1");
  });

  it("returns null when the lookup itself failed, so the policy fails safe", () => {
    expect(deriveNextLevel(null)).toBeNull();
    expect(deriveNextLevel(undefined)).toBeNull();
  });
});

describe("evaluateAdminAccess", () => {
  it("allows an enrolled admin on an AAL2 (MFA-verified) session", () => {
    expect(evaluateAdminAccess(base())).toEqual({ allow: true });
  });

  it("refuses non-admin roles", () => {
    expect(evaluateAdminAccess(base({ role: "user" }))).toEqual({
      allow: false,
      reason: "not-admin",
    });
    expect(evaluateAdminAccess(base({ role: null }))).toEqual({
      allow: false,
      reason: "not-admin",
    });
  });

  it("refuses a non-admin even on an AAL2 session — MFA never substitutes for role", () => {
    expect(
      evaluateAdminAccess(base({ role: "user", currentLevel: "aal2", nextLevel: "aal2" })),
    ).toEqual({ allow: false, reason: "not-admin" });
  });

  it("refuses an admin whose email is not on a configured allowlist", () => {
    expect(evaluateAdminAccess(base({ allowlist: ["someone@else.com"] }))).toEqual({
      allow: false,
      reason: "not-admin",
    });
  });

  it("allows an allowlisted admin on an AAL2 session", () => {
    expect(
      evaluateAdminAccess(base({ email: "admin@homi.com", allowlist: ["admin@homi.com"] })),
    ).toEqual({ allow: true });
  });

  it("denies an enrolled admin on an AAL1 session with a step-up (reauth) path", () => {
    expect(
      evaluateAdminAccess(base({ currentLevel: "aal1", nextLevel: "aal2" })),
    ).toEqual({ allow: false, reason: "needs-stepup" });
  });

  it("routes an admin with no enrolled factor to guided setup, not a silent denial", () => {
    expect(
      evaluateAdminAccess(base({ currentLevel: "aal1", nextLevel: "aal1" })),
    ).toEqual({ allow: false, reason: "needs-enrollment" });
  });

  it("fails closed when the AAL lookups fail (nulls never mint access)", () => {
    expect(
      evaluateAdminAccess(base({ currentLevel: null, nextLevel: null })),
    ).toEqual({ allow: false, reason: "needs-enrollment" });
    expect(
      evaluateAdminAccess(base({ currentLevel: null, nextLevel: "aal2" })),
    ).toEqual({ allow: false, reason: "needs-stepup" });
  });

  it("trusts an AAL2 session even when the factor lookup failed", () => {
    // currentLevel is the session's own claim — authoritative for the request.
    expect(
      evaluateAdminAccess(base({ currentLevel: "aal2", nextLevel: null })),
    ).toEqual({ allow: true });
  });
});
