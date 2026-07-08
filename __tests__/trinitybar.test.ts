import { describe, expect, it } from "vitest";
import { trinityShares } from "@/components/assessment/TrinityBar";

const MAXES = { financial: 35, emotional: 35, timing: 30 };

describe("assessment/TrinityBar — trinityShares", () => {
  it("splits three equal ratios into three ~33.33 shares", () => {
    // 17.5/35 = 0.5, 17.5/35 = 0.5, 15/30 = 0.5 — all equal.
    const shares = trinityShares(17.5, 17.5, 15, MAXES);
    expect(shares.financial).toBeCloseTo(33.33, 1);
    expect(shares.emotional).toBeCloseTo(33.33, 1);
    expect(shares.timing).toBeCloseTo(33.33, 1);
  });

  it("gives a pillar at 0 a 0% share while the others split the rest proportionally", () => {
    // financial ratio 0, emotional 0.5, timing 0.5 — remaining 100% split evenly.
    const shares = trinityShares(0, 17.5, 15, MAXES);
    expect(shares.financial).toBe(0);
    expect(shares.emotional).toBeCloseTo(50, 1);
    expect(shares.timing).toBeCloseTo(50, 1);
  });

  it("falls back to equal thirds (not NaN) when all three scores are 0", () => {
    const shares = trinityShares(0, 0, 0, MAXES);
    expect(Number.isNaN(shares.financial)).toBe(false);
    expect(Number.isNaN(shares.emotional)).toBe(false);
    expect(Number.isNaN(shares.timing)).toBe(false);
    expect(shares.financial).toBeCloseTo(33.3, 1);
    expect(shares.emotional).toBeCloseTo(33.3, 1);
    expect(shares.timing).toBeCloseTo(33.4, 1);
  });

  it("always sums to ~100 across varied input combinations", () => {
    const cases: [number, number, number][] = [
      [35, 35, 30],
      [10, 20, 5],
      [0, 35, 0],
      [5, 5, 5],
      [35, 0, 0],
      [1, 1, 1],
    ];
    for (const [f, e, t] of cases) {
      const shares = trinityShares(f, e, t, MAXES);
      expect(shares.financial + shares.emotional + shares.timing).toBeCloseTo(100, 5);
    }
  });

  it("gives the pillar sitting at its max ratio the largest share when others are low", () => {
    // financial ratio 1.0 (at max), emotional ~0.14, timing 0.1.
    const shares = trinityShares(35, 5, 3, MAXES);
    expect(shares.financial).toBeGreaterThan(shares.emotional);
    expect(shares.financial).toBeGreaterThan(shares.timing);
  });

  it("never returns negative shares, even for negative/garbage input", () => {
    const shares = trinityShares(-5, 10, 0, MAXES);
    expect(shares.financial).toBeGreaterThanOrEqual(0);
    expect(shares.emotional).toBeGreaterThanOrEqual(0);
    expect(shares.timing).toBeGreaterThanOrEqual(0);
  });
});
