import { describe, it, expect } from "vitest";
import {
  getEntitlements,
  normalizeTier,
  requireCapability,
  type Entitlements,
} from "@/lib/entitlements";
import { TIERS } from "@/lib/stripe/tiers";

describe("normalizeTier", () => {
  it("passes through the three paid tiers", () => {
    expect(normalizeTier("plus")).toBe("plus");
    expect(normalizeTier("pro")).toBe("pro");
    expect(normalizeTier("family")).toBe("family");
  });

  it("fails closed to 'free' for unknown, null, empty, or legacy values", () => {
    for (const v of [null, undefined, "", "none", "basic", "PLUS", "enterprise"]) {
      expect(normalizeTier(v as string | null | undefined)).toBe("free");
    }
  });
});

describe("getEntitlements", () => {
  it("gives the free tier no premium capabilities", () => {
    const free = getEntitlements("free");
    expect(free.advisorAccess).toBe(false);
    expect(free.advisorMessagesPerDay).toBe(0);
    expect(free.fullReport).toBe(false);
    expect(free.unlimitedRescoring).toBe(false);
    expect(free.couplesMode).toBe(false);
    expect(free.familySeats).toBe(1);
  });

  it("unlocks the Companion + full report at Plus (matches published Plus features)", () => {
    const plus = getEntitlements("plus");
    expect(plus.advisorAccess).toBe(true);
    expect(plus.advisorMessagesPerDay).toBeGreaterThan(0);
    expect(plus.fullReport).toBe(true);
    expect(plus.unlimitedRescoring).toBe(true);
    // Couples mode is a Pro feature, not Plus.
    expect(plus.couplesMode).toBe(false);
  });

  it("unlocks couples mode at Pro", () => {
    expect(getEntitlements("pro").couplesMode).toBe(true);
  });

  it("grants 5 household seats only on Family", () => {
    expect(getEntitlements("family").familySeats).toBe(5);
    expect(getEntitlements("pro").familySeats).toBe(1);
  });

  it("capabilities are monotonic across the ladder (paid never loses a boolean)", () => {
    const ladder: Entitlements[] = [
      getEntitlements("free"),
      getEntitlements("plus"),
      getEntitlements("pro"),
      getEntitlements("family"),
    ];
    const bools: (keyof Entitlements)[] = [
      "advisorAccess",
      "fullReport",
      "unlimitedRescoring",
      "couplesMode",
    ];
    for (const key of bools) {
      for (let i = 1; i < ladder.length; i++) {
        if (ladder[i - 1][key] === true) {
          expect(ladder[i][key], `${key} regressed at tier ${ladder[i].tier}`).toBe(true);
        }
      }
    }
  });

  it("only recognizes tiers that actually exist in the pricing table", () => {
    // Every paid entitlement tier must correspond to a real Stripe tier.
    for (const tier of ["plus", "pro", "family"] as const) {
      expect(TIERS[tier]).toBeDefined();
      expect(getEntitlements(tier).tier).toBe(tier);
    }
  });
});

describe("requireCapability (server-side gate)", () => {
  const free = getEntitlements("free");
  const plus = getEntitlements("plus");

  it("returns 401 for an anonymous request (no user id)", () => {
    const gate = requireCapability(null, free, "advisorAccess");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(401);
  });

  it("returns 402 (payment required) for an authenticated free-tier user", () => {
    const gate = requireCapability("user-123", free, "advisorAccess");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(402);
  });

  it("allows an authenticated paid user", () => {
    expect(requireCapability("user-123", plus, "advisorAccess").ok).toBe(true);
  });
});
