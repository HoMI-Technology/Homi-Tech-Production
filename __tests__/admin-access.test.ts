/**
 * Admin-access policy contract (lib/auth/admin). What matters:
 * - role + optional email allowlist gate access
 * - MFA / AAL never block (password-only product policy)
 */

import { describe, it, expect } from "vitest";
import {
  deriveNextLevel,
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

  it("never blocks on MFA step-up (AAL1 with enrolled factor)", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: false, currentLevel: "aal1", nextLevel: "aal2" })),
    ).toEqual({ allow: true });
  });

  it("allows an admin at AAL2", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: "aal2", nextLevel: "aal2" })),
    ).toEqual({ allow: true });
  });

  it("ignores ADMIN_REQUIRE_MFA enrollment requirement", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: "aal1", nextLevel: "aal1" })),
    ).toEqual({ allow: true });
  });

  it("allows when AAL data is missing (MFA never gates)", () => {
    expect(
      evaluateAdminAccess(base({ requireMfa: false, currentLevel: null, nextLevel: null })),
    ).toEqual({ allow: true });
    expect(
      evaluateAdminAccess(base({ requireMfa: true, currentLevel: null, nextLevel: null })),
    ).toEqual({ allow: true });
  });
});
