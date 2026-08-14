import { describe, it, expect } from "vitest";
import { companionTierCopy } from "@/lib/advisor/companion-tier-copy";
import { getEntitlements } from "@/lib/entitlements";

const SKU_BANNED = [
  /hōmi companion/i,
  /full ai companion/i,
  /get companion/i,
  /daily companion limits/i,
];

describe("companionTierCopy (honest free vs paid labeling)", () => {
  it("labels free tier as Clarity voice with daily limit + voice-picker upgrade", () => {
    const free = getEntitlements("free");
    const copy = companionTierCopy({
      advisorRealModel: free.advisorRealModel,
      advisorMessagesPerDay: free.advisorMessagesPerDay,
    });

    expect(free.advisorRealModel).toBe(false);
    expect(copy.kind).toBe("free");
    expect(copy.summary).toBe("Clarity voice");
    expect(copy.detail).toContain(`${free.advisorMessagesPerDay} messages/day`);
    expect(copy.detail?.toLowerCase()).toContain("voice picker");
    expect(copy.upgradeHref).toBe("/pricing");
    expect(copy.upgradeLabel).toBeTruthy();
    for (const banned of SKU_BANNED) {
      expect(copy.summary).not.toMatch(banned);
      expect(copy.detail ?? "").not.toMatch(banned);
    }
  });

  it("labels paid tiers as Decision Companion without inventing a model or SKU name", () => {
    for (const tier of ["plus", "pro", "family"] as const) {
      const paid = getEntitlements(tier);
      const copy = companionTierCopy({
        advisorRealModel: paid.advisorRealModel,
        advisorMessagesPerDay: paid.advisorMessagesPerDay,
      });

      expect(paid.advisorRealModel, `${tier} should grant real model`).toBe(true);
      expect(copy.kind).toBe("paid");
      expect(copy.summary).toBe("Decision Companion");
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
    expect(copy.detail).toMatch(/5 messages\/day/);
  });
});
