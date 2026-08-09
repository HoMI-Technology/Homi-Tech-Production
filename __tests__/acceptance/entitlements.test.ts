import { describe, it, expect } from "vitest";

/**
 * ACCEPTANCE — Entitlements (BUILD-BRIEF Tier 0, §9)
 *
 * Contract to implement in lib/entitlements.ts:
 *   export type Tier = "free" | "plus" | "pro" | "family";
 *   export interface Entitlements {
 *     advisorMessagesPerDay: number;   // 0 or a finite cap; Infinity allowed for unlimited
 *     fullReport: boolean;             // full report / credential export
 *     familySeats: number;             // linked household members
 *     advancedTools: boolean;
 *   }
 *   export function getEntitlements(tier: Tier): Entitlements;
 *
 * Enforcement must be server-side. This spec locks the capability matrix;
 * it is red until the module exists.
 */

async function load() {
  return import("@/lib/entitlements").catch(() => null);
}

describe("getEntitlements — capability matrix", () => {
  it("module exists (lib/entitlements.ts)", async () => {
    const mod = await load();
    expect(mod, "lib/entitlements.ts not implemented yet (BUILD-BRIEF Tier 0)").not.toBeNull();
    expect(typeof mod!.getEntitlements).toBe("function");
  });

  it("free tier is genuinely limited", async () => {
    const mod = await load();
    if (!mod) return expect.fail("lib/entitlements.ts missing");
    const free = mod.getEntitlements("free");
    expect(free.fullReport).toBe(false);
    expect(free.advancedTools).toBe(false);
    expect(free.familySeats).toBeLessThanOrEqual(1);
    expect(free.advisorMessagesPerDay).toBeGreaterThanOrEqual(0);
  });

  it("paid tiers unlock, monotonically", async () => {
    const mod = await load();
    if (!mod) return expect.fail("lib/entitlements.ts missing");
    const [free, plus, pro, family] = (["free", "plus", "pro", "family"] as const).map(
      mod.getEntitlements,
    );
    expect(pro.fullReport).toBe(true);
    expect(pro.advancedTools).toBe(true);
    expect(family.familySeats).toBeGreaterThanOrEqual(5);
    // advisor cap never decreases as tier rises
    expect(plus.advisorMessagesPerDay).toBeGreaterThanOrEqual(free.advisorMessagesPerDay);
    expect(pro.advisorMessagesPerDay).toBeGreaterThanOrEqual(plus.advisorMessagesPerDay);
    expect(family.advisorMessagesPerDay).toBeGreaterThanOrEqual(pro.advisorMessagesPerDay);
  });
});
