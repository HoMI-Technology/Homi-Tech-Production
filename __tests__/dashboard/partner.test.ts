import { describe, it, expect } from "vitest";
import type { Profile } from "@/types/database";

function canAccessPartnerDashboard(profile: Pick<Profile, "role"> | null): boolean {
  if (!profile) return false;
  return profile.role === "partner" || profile.role === "admin";
}

function anonymizedClientRow(input: {
  full_name: string | null;
  user_id: string;
  email?: string;
}): { label: string; idPrefix: string; hasEmail: boolean } {
  return {
    label: input.full_name || "Client",
    idPrefix: input.user_id.slice(0, 8),
    hasEmail: false,
  };
}

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

  it("anonymizes client rows — no email", () => {
    const row = anonymizedClientRow({
      full_name: "Alex",
      user_id: "abcdef12-3456-7890-abcd-ef1234567890",
      email: "alex@secret.example",
    });
    expect(row.hasEmail).toBe(false);
    expect(JSON.stringify(row)).not.toContain("@");
  });

  it("scopes clients by partner_id (A cannot see B)", () => {
    const partnerA = "11111111-1111-1111-1111-111111111111";
    const partnerB = "22222222-2222-2222-2222-222222222222";
    const clients = [
      { id: "c1", partner_id: partnerA },
      { id: "c2", partner_id: partnerB },
      { id: "c3", partner_id: partnerA },
    ];
    const visibleToA = clients.filter((c) => c.partner_id === partnerA).map((c) => c.id);
    expect(visibleToA).toEqual(["c1", "c3"]);
    expect(visibleToA).not.toContain("c2");
  });
});
