/**
 * Admin-access policy contract (lib/auth/admin). What matters:
 * - role-only gating is the default; the allowlist and MFA flags are opt-in
 *   and never loosen access, only tighten it
 * - a step-up (verified factor present, session still AAL1) is ALWAYS blocked
 * - the checks fail safe: missing AAL data never grants entry it shouldn't
 */

import { describe, it, expect } from "vitest";
import {
  evaluateAdminAccess,
  isEmailAllowlisted,
  parseAdminEmails,
  type AdminAccessInput,
} from "@/lib/auth/admin";

/** A baseline admin with MFA off, no allowlist — the historical happy path. */
function base(overrides: Partial<AdminAccessInput> = {}): AdminAccessInput {
  return {
    role: "admin",
    email: "admin@homi.com",
    allowlist: [],
    requireMfa: false,
    currentLevel: "aal1",
    nextLevel: "aal1",
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

describe("evaluateAdminAccess", () => {
  it("allows a plain admin with no allowlist and MFA off (default behaviour)", () => {
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

  it("refuses an admin whose email is not on a configured allowlist", () => {
    expect(evaluateAdminAccess(base({ allowlist: ["someone@else.com"] }))).toEqual({
      allow: false,
      reason: "not-admin",
    });
  });

  it("allows an admin who is on the allowlist", () => {
    expect(
      evaluateAdminAccess(base({ email: "admin@homi.com", allowlist: ["admin@homi.com"] })),
    ).toEqual({ allow: true });
  });

  it("ALWAYS blocks step-up when a factor exists but the session is AAL1 (even with MFA flag off)", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: false, currentLevel: "aal1", nextLevel: "aal2" })),
    ).toEqual({ allow: false, reason: "needs-stepup" });
  });

  it("allows an admin who has stepped up to AAL2", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: "aal2", nextLevel: "aal2" })),
    ).toEqual({ allow: true });
  });

  it("requires enrollment when MFA is mandated and no factor exists", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: "aal1", nextLevel: "aal1" })),
    ).toEqual({ allow: false, reason: "needs-enrollment" });
  });

  it("does not require enrollment when the MFA flag is off", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: false, currentLevel: "aal1", nextLevel: "aal1" })),
    ).toEqual({ allow: true });
  });

  it("treats missing AAL data as no factor (fails safe, never a phantom step-up)", () => {
    // requireMfa off → allowed; requireMfa on → must enroll. Never 'allow' under MFA with unknown AAL.
    expect(
      evaluateAdminAccess(base({ requireMfa: false, currentLevel: null, nextLevel: null })),
    ).toEqual({ allow: true });
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: null, nextLevel: null })),
    ).toEqual({ allow: false, reason: "needs-enrollment" });
  });
});
