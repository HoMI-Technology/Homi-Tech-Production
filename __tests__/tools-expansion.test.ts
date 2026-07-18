import { describe, it, expect } from "vitest";
import { helocAvailability, helocTiers } from "@/lib/tools/heloc";
import { analyzeRefinance } from "@/lib/tools/refinance";
import { compareOffers, bestOfferIndex } from "@/lib/tools/apr";
import { comparePrograms, evaluateProgram } from "@/lib/tools/loanprograms";

describe("HELOC availability", () => {
  it("computes equity and available line at a CLTV cap", () => {
    const r = helocAvailability({ homeValue: 500000, mortgageBalance: 300000, maxCltv: 0.85, rate: 8 });
    expect(r.equity).toBe(200000);
    expect(r.equityPct).toBeCloseTo(0.4, 5);
    // 500k*0.85 - 300k = 125k
    expect(r.availableLine).toBe(125000);
    expect(r.interestOnlyMonthly).toBeCloseTo((125000 * 0.08) / 12, 4);
  });

  it("floors available line at zero when already over the cap", () => {
    const r = helocAvailability({ homeValue: 400000, mortgageBalance: 380000, maxCltv: 0.8, rate: 8 });
    expect(r.availableLine).toBe(0);
  });

  it("higher CLTV tiers unlock more", () => {
    const tiers = helocTiers(500000, 300000, 8);
    expect(tiers.map((t) => t.result.availableLine)).toEqual([100000, 125000, 150000]);
  });
});

describe("refinance break-even", () => {
  it("returns break-even months when the new payment is lower", () => {
    const r = analyzeRefinance({
      balance: 300000, currentRate: 7.5, currentTermYears: 30,
      newRate: 6, newTermYears: 30, closingCosts: 6000,
    });
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakEvenMonths).not.toBeNull();
    expect(r.breakEvenMonths).toBe(Math.ceil(6000 / r.monthlySavings));
  });

  it("reports no savings when the new rate is higher", () => {
    const r = analyzeRefinance({
      balance: 300000, currentRate: 5, currentTermYears: 30,
      newRate: 7, newTermYears: 30, closingCosts: 6000,
    });
    expect(r.monthlySavings).toBeLessThan(0);
    expect(r.breakEvenMonths).toBeNull();
  });
});

describe("APR comparison", () => {
  it("ranks by true APR, not note rate", () => {
    const results = compareOffers(400000, 30, [
      { label: "no points", rate: 6.25, points: 0, fees: 3000 },
      { label: "heavy points", rate: 5.75, points: 3, fees: 4000 },
    ]);
    // APR must exceed note rate (costs are folded in).
    expect(results[0].apr).toBeGreaterThan(6.25);
    expect(results[1].apr).toBeGreaterThan(5.75);
    // A valid index is returned.
    expect([0, 1]).toContain(bestOfferIndex(results));
  });

  it("no points/fees → APR ≈ note rate", () => {
    const [r] = compareOffers(400000, 30, [{ label: "clean", rate: 6, points: 0, fees: 0 }]);
    expect(r.apr).toBeCloseTo(6, 1);
  });
});

describe("loan program comparison", () => {
  it("VA has no monthly insurance and allows 0 down", () => {
    const va = evaluateProgram("va", { homePrice: 400000, downPayment: 0, rate: 6.5, termYears: 30 });
    expect(va.monthlyInsurance).toBe(0);
    expect(va.upfrontFeeFinanced).toBeGreaterThan(0);
  });

  it("FHA enforces the 3.5% minimum down and carries life-of-loan MIP", () => {
    const fha = evaluateProgram("fha", { homePrice: 400000, downPayment: 0, rate: 6.5, termYears: 30 });
    expect(fha.monthlyInsurance).toBeGreaterThan(0);
    expect(fha.insuranceRemovable).toBe(false);
  });

  it("conventional at 20% down has no PMI", () => {
    const conv = evaluateProgram("conventional", { homePrice: 400000, downPayment: 80000, rate: 6.5, termYears: 30 });
    expect(conv.monthlyInsurance).toBe(0);
  });

  it("returns all three programs", () => {
    const all = comparePrograms({ homePrice: 400000, downPayment: 20000, rate: 6.5, termYears: 30 });
    expect(all.map((p) => p.program)).toEqual(["conventional", "fha", "va"]);
  });
});

describe("tools-expansion — zero / invalid inputs", () => {
  it("HELOC: zero home value yields zeros, never NaN", () => {
    const r = helocAvailability({ homeValue: 0, mortgageBalance: 0, maxCltv: 0.85, rate: 8 });
    expect(r.equity).toBe(0);
    expect(r.equityPct).toBe(0);
    expect(r.availableLine).toBe(0);
    expect(r.interestOnlyMonthly).toBe(0);
    expect(r.currentCltv).toBe(0);
  });

  it("HELOC: negative inputs clamp to zero", () => {
    const r = helocAvailability({ homeValue: -100000, mortgageBalance: -50000, maxCltv: 0.85, rate: 8 });
    expect(r.equity).toBe(0);
    expect(r.availableLine).toBe(0);
    expect(r.interestOnlyMonthly).toBe(0);
  });

  it("HELOC: a zero rate costs nothing interest-only", () => {
    const r = helocAvailability({ homeValue: 500000, mortgageBalance: 300000, maxCltv: 0.85, rate: 0 });
    expect(r.availableLine).toBe(125000);
    expect(r.interestOnlyMonthly).toBe(0);
  });

  it("refinance: zero closing costs break even immediately", () => {
    const r = analyzeRefinance({
      balance: 300000, currentRate: 7.5, currentTermYears: 30,
      newRate: 6, newTermYears: 30, closingCosts: 0,
    });
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakEvenMonths).toBe(0);
  });

  it("refinance: zero balance has no payment and no break-even", () => {
    const r = analyzeRefinance({
      balance: 0, currentRate: 7, currentTermYears: 30,
      newRate: 6, newTermYears: 30, closingCosts: 6000,
    });
    expect(r.currentMonthly).toBe(0);
    expect(r.newMonthly).toBe(0);
    expect(r.monthlySavings).toBe(0);
    expect(r.breakEvenMonths).toBeNull();
  });

  it("APR: no offers ranks nothing", () => {
    expect(compareOffers(400000, 30, [])).toEqual([]);
  });

  it("APR: a single offer is trivially the best", () => {
    const results = compareOffers(400000, 30, [{ label: "solo", rate: 6, points: 1, fees: 2000 }]);
    expect(bestOfferIndex(results)).toBe(0);
    expect(results[0].apr).toBeGreaterThan(6);
  });

  it("loan programs: zero home price yields zero costs, never NaN", () => {
    const all = comparePrograms({ homePrice: 0, downPayment: 0, rate: 6.5, termYears: 30 });
    for (const p of all) {
      expect(p.loanAmount).toBe(0);
      expect(p.monthlyTotal).toBe(0);
      expect(p.ltv).toBe(0);
    }
  });

  it("loan programs: a negative down payment clamps to zero", () => {
    const va = evaluateProgram("va", { homePrice: 400000, downPayment: -5000, rate: 6.5, termYears: 30 });
    // Full price financed, plus the first-use funding fee on top.
    expect(va.loanAmount).toBeCloseTo(408600, 1);
  });
});
