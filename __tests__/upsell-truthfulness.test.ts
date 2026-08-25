import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getEntitlements, nextTierWithMore } from "@/lib/entitlements";

/**
 * "Upgrade for more" must never render when no higher tier grants more.
 *
 * This defect was found three separate times in one codebase sweep, each written by
 * hand in a different file:
 *
 *   1. lib/advisor/quota.ts — told a Family subscriber at the message cap to upgrade.
 *   2. app/api/shares/route.ts — pro and family both allow 100 active share links,
 *      so a pro user who upgraded would gain exactly zero.
 *   3. components/household/FamilyModePanel.tsx — the seat-cap branch is reachable
 *      only on family, so that sentence was false 100% of the time it rendered.
 *
 * Three independent authors reached for the same false sentence, which means the next
 * one will too. nextTierWithMore() is the single source of truth; this pins its
 * behaviour and the shipped copy that depends on it.
 */

const TIERS = ["free", "plus", "pro", "family"] as const;

describe("nextTierWithMore", () => {
  it("walks up to a tier that genuinely grants more", () => {
    expect(nextTierWithMore("free", (e) => e.maxActiveShares)).toBe("plus");
    expect(nextTierWithMore("plus", (e) => e.maxActiveShares)).toBe("pro");
  });

  it("returns null when the caps are equal above you", () => {
    // pro = 100, family = 100. Upgrading buys nothing.
    expect(getEntitlements("pro").maxActiveShares).toBe(
      getEntitlements("family").maxActiveShares,
    );
    expect(nextTierWithMore("pro", (e) => e.maxActiveShares)).toBeNull();
  });

  it("returns null at the top of the ladder for every capability", () => {
    for (const amount of [
      (e: ReturnType<typeof getEntitlements>) => e.maxActiveShares,
      (e: ReturnType<typeof getEntitlements>) => e.advisorMessagesPerDay,
      (e: ReturnType<typeof getEntitlements>) => e.advisorMessagesPerMonth,
    ]) {
      expect(nextTierWithMore("family", amount)).toBeNull();
    }
  });

  it("never proposes a tier that grants the same or less", () => {
    for (const tier of TIERS) {
      const next = nextTierWithMore(tier, (e) => e.maxActiveShares);
      if (!next) continue;
      expect(getEntitlements(next).maxActiveShares).toBeGreaterThan(
        getEntitlements(tier).maxActiveShares,
      );
    }
  });
});

describe("shipped upsell copy", () => {
  it("the share-cap message only offers an upgrade when one exists", () => {
    const src = readFileSync("app/api/shares/route.ts", "utf8");
    expect(src).toMatch(/nextTierWithMore/);
    // The unconditional phrasing must be gone.
    expect(src).not.toMatch(/Revoke one or upgrade for more/);
  });

  it("the household seat-cap message makes no upgrade claim at top tier", () => {
    const src = readFileSync("components/household/FamilyModePanel.tsx", "utf8");
    expect(src).not.toMatch(/household seats\. Upgrade for more/);
  });

  it("no surface hard-codes an unconditional upgrade-for-more sentence", () => {
    for (const file of [
      "app/api/shares/route.ts",
      "components/household/FamilyModePanel.tsx",
      "lib/advisor/quota-copy.ts",
    ]) {
      const src = readFileSync(file, "utf8");
      // Strip comments — these files document the defect they fixed.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
      expect(code).not.toMatch(/[Uu]pgrade for more/);
    }
  });
});
