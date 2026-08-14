import { describe, it, expect } from "vitest";
import { companionTierCopy } from "@/lib/advisor/companion-tier-copy";
import { getEntitlements } from "@/lib/entitlements";

const SKU_BANNED = [
  /hōmi companion/i,
  /full ai companion/i,
  /get companion/i,
  /daily companion limits/i,
];

describe("companionTierCopy (Brand Use)", () => {
  it("pins free copy to rule-based notes on this verdict", () => {
    const free = getEntitlements("free");
    const copy = companionTierCopy({
      advisorRealModel: free.advisorRealModel,
      advisorMessagesPerDay: free.advisorMessagesPerDay,
    });

    expect(free.advisorRealModel).toBe(false);
    expect(copy.kind).toBe("free");
    expect(copy.summary).toBe("Rule-based notes on this verdict.");
    expect(copy.detail).toContain(`${free.advisorMessagesPerDay} messages/day`);
    expect(copy.upgradeHref).toBe("/pricing");
    expect(copy.upgradeLabel).toBeTruthy();
    for (const banned of SKU_BANNED) {
      expect(copy.summary).not.toMatch(banned);
      expect(copy.detail ?? "").not.toMatch(banned);
    }
  });

  it("pins Plus+ copy to ask about this verdict", () => {
    for (const tier of ["plus", "pro", "family"] as const) {
      const paid = getEntitlements(tier);
      const copy = companionTierCopy({
        advisorRealModel: paid.advisorRealModel,
        advisorMessagesPerDay: paid.advisorMessagesPerDay,
      });

      expect(paid.advisorRealModel, `${tier} should grant real model`).toBe(true);
      expect(copy.kind).toBe("paid");
      expect(copy.summary).toBe("Ask about this verdict.");
      expect(copy.upgradeHref).toBeUndefined();
      expect(copy.summary.toLowerCase()).not.toMatch(/claude|anthropic|gpt|haiku|sonnet/);
      for (const banned of SKU_BANNED) {
        expect(copy.summary).not.toMatch(banned);
      }
    }
  });

  it("falls back to a sane daily count when input is invalid (still free-honest)", () => {
    const copy = companionTierCopy({
      advisorRealModel: false,
      advisorMessagesPerDay: 0,
    });
    expect(copy.kind).toBe("free");
    expect(copy.summary).toBe("Rule-based notes on this verdict.");
    expect(copy.detail).toMatch(/5 messages\/day/);
  });
});
