/**
 * Partner dashboard access is role-gated; client rows never carry email.
 * Invite URL mint-on-failure lock is T3 policy (partner-invite-empty).
 */
import { describe, it, expect } from "vitest";
import { canAccessPartnerDashboard } from "@/lib/dashboard/partner-access";

describe("partner dashboard access control", () => {
  it("denies non-partners", () => {
    expect(canAccessPartnerDashboard({ role: "user" })).toBe(false);
    expect(canAccessPartnerDashboard({ role: "employee" })).toBe(false);
    expect(canAccessPartnerDashboard(null)).toBe(false);
  });

  it("allows partners and admins", () => {
    expect(canAccessPartnerDashboard({ role: "partner" })).toBe(true);
    expect(canAccessPartnerDashboard({ role: "admin" })).toBe(true);
  });
});
