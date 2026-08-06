import { describe, expect, it } from "vitest";
import {
  amortizedPayment,
  compareStrategies,
  recommendPayoff,
  simulateConsolidation,
  totalBalance,
  weightedAverageApr,
  type ConsolidationLoan,
  type Debt,
} from "@/lib/tools/debt";

const CARD: Debt = { id: "card", name: "Credit card", balance: 8000, apr: 24, minPayment: 200 };
const AUTO: Debt = { id: "auto", name: "Auto loan", balance: 6000, apr: 7, minPayment: 200 };
const STUDENT: Debt = { id: "student", name: "Student", balance: 18000, apr: 5.5, minPayment: 220 };
const DEBTS = [CARD, AUTO, STUDENT];

describe("tools/debt — helpers", () => {
  it("sums balances and ignores negatives", () => {
    expect(totalBalance(DEBTS)).toBe(32000);
    expect(totalBalance([{ ...CARD, balance: -5 }])).toBe(0);
  });

  it("weights average APR by balance", () => {
    // (8000*24 + 6000*7 + 18000*5.5) / 32000 = (192000 + 42000 + 99000)/32000
    expect(weightedAverageApr(DEBTS)).toBeCloseTo(10.41, 1);
    expect(weightedAverageApr([])).toBe(0);
  });

  it("computes a standard amortizing payment", () => {
    // $10k at 12% over 12 months ≈ $888.49/mo
    expect(amortizedPayment(10000, 12, 12)).toBeCloseTo(888.49, 1);
    // Zero-rate loan is just principal / term
    expect(amortizedPayment(1200, 0, 12)).toBe(100);
    expect(amortizedPayment(0, 12, 12)).toBe(0);
    expect(amortizedPayment(1000, 12, 0)).toBe(0);
  });
});

describe("tools/debt — simulateConsolidation", () => {
  const loan: ConsolidationLoan = { apr: 12, termMonths: 48, feePct: 2 };

  it("finances the balances plus the origination fee", () => {
    const r = simulateConsolidation(DEBTS, loan, 0);
    expect(r.originationFee).toBeCloseTo(640, 0); // 2% of 32000
    expect(r.financedAmount).toBeCloseTo(32640, 0);
    expect(r.monthlyPayment).toBeGreaterThan(0);
  });

  it("pays off within the term when no extra is applied", () => {
    const r = simulateConsolidation(DEBTS, loan, 0);
    expect(r.months).toBeLessThanOrEqual(loan.termMonths);
    expect(r.months).toBeGreaterThan(loan.termMonths - 2);
    // Total paid must cover principal + fee at minimum.
    expect(r.totalPaid).toBeGreaterThan(r.financedAmount);
  });

  it("shortens payoff and cuts interest when extra is applied", () => {
    const base = simulateConsolidation(DEBTS, loan, 0);
    const withExtra = simulateConsolidation(DEBTS, loan, 300);
    expect(withExtra.months).toBeLessThan(base.months);
    expect(withExtra.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("returns an empty result for no balances", () => {
    const r = simulateConsolidation([], loan, 0);
    expect(r.months).toBe(0);
    expect(r.totalPaid).toBe(0);
    expect(r.financedAmount).toBe(0);
  });
});

describe("tools/debt — recommendPayoff", () => {
  it("prefers a cheap consolidation loan over high-APR debts", () => {
    // Low-rate, no-fee loan against a 24% card should win on total cash.
    const loan: ConsolidationLoan = { apr: 6, termMonths: 48, feePct: 0 };
    const rec = recommendPayoff([CARD], 0, loan);
    expect(rec.best).toBe("consolidation");
    expect(rec.consolidationEligible).toBe(true);
    expect(rec.ranked[0].method).toBe("consolidation");
  });

  it("rejects a consolidation loan that costs more than paying it down", () => {
    // A pricey long loan against a cheap debt should not be recommended.
    const loan: ConsolidationLoan = { apr: 15, termMonths: 84, feePct: 5 };
    const rec = recommendPayoff([STUDENT], 200, loan);
    expect(rec.consolidationEligible).toBe(false);
    expect(rec.best).not.toBe("consolidation");
    expect(rec.reason).toMatch(/cost more/i);
  });

  it("ranks by total cash paid, cheapest first", () => {
    const loan: ConsolidationLoan = { apr: 9, termMonths: 60, feePct: 1 };
    const rec = recommendPayoff(DEBTS, 150, loan);
    for (let i = 1; i < rec.ranked.length; i++) {
      expect(rec.ranked[i].totalPaid).toBeGreaterThanOrEqual(rec.ranked[i - 1].totalPaid);
    }
    expect(rec.best).toBe(rec.ranked[0].method);
    expect(rec.savingsVsWorst).toBeGreaterThanOrEqual(0);
  });

  it("works with no loan supplied (avalanche vs snowball only)", () => {
    const rec = recommendPayoff(DEBTS, 100);
    expect(rec.ranked).toHaveLength(2);
    expect(rec.ranked.some((m) => m.method === "consolidation")).toBe(false);
    // Avalanche never pays more interest than snowball on the same inputs.
    const cmp = compareStrategies(DEBTS, 100);
    expect(cmp.avalanche.totalInterest).toBeLessThanOrEqual(cmp.snowball.totalInterest);
  });
});
