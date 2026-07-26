/**
 * Deltas contract: lens-impact math is deterministic, matches the
 * dashboard's own functions on the same inputs, handles rent
 * replacement correctly, and treats missing income as a signal
 * (null) rather than a zero.
 */

import { describe, expect, it } from "vitest";
import { computeHousingDeltas, worstDeltaTemperature } from "@/lib/tools/deltas";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";

const BASE: FinanceState = {
  ...DEFAULT_FINANCE_STATE,
  monthlyIncome: 6000,
  monthlyExpenses: 3000, // includes 1800 rent in the real world
  monthlyDebtPayments: 500,
  liquidSavings: 21000,
  totalDebt: 15000,
};

describe("computeHousingDeltas", () => {
  it("computes runway and DTI before/after a new obligation", () => {
    const deltas = computeHousingDeltas(BASE, 2500)!;
    const runway = deltas.find((d) => d.metric === "runway")!;
    const dti = deltas.find((d) => d.metric === "dti")!;

    // Before: 21000 / (3000 + 500) = 6 months. After: 21000 / 6000 = 3.5.
    expect(runway.from).toBe(6);
    expect(runway.to).toBe(3.5);
    expect(runway.improved).toBe(false);

    // Before: 500/6000 = 8.3%. After: 3000/6000 = 50%.
    expect(dti.from).toBe(8.3);
    expect(dti.to).toBe(50);
    expect(dti.toTemperature).toBe("crimson");
  });

  it("rent replacement removes rent from the outflow instead of stacking", () => {
    const deltas = computeHousingDeltas(BASE, 2500, { replacedRentMonthly: 1800 })!;
    const runway = deltas.find((d) => d.metric === "runway")!;
    // After outflow: 3000 - 1800 + 500 + 2500 = 4200 → 21000/4200 = 5 months.
    expect(runway.to).toBe(5);
    const dti = deltas.find((d) => d.metric === "dti")!;
    // DTI: (500 + 2500 - 1800) / 6000 = 20%.
    expect(dti.to).toBe(20);
  });

  it("returns null when income is missing — a signal, not a zero", () => {
    expect(computeHousingDeltas({ ...BASE, monthlyIncome: 0 }, 2500)).toBeNull();
  });

  it("returns null on nonsensical obligations", () => {
    expect(computeHousingDeltas(BASE, -100)).toBeNull();
    expect(computeHousingDeltas(BASE, Number.NaN)).toBeNull();
  });

  it("flags improvement honestly in both directions", () => {
    const better = computeHousingDeltas(BASE, 800, { replacedRentMonthly: 1800 })!;
    // After outflow: 3000 - 1800 + 500 + 800 = 2500 → 8.4 months (up from 6).
    expect(better.find((d) => d.metric === "runway")!.improved).toBe(true);
    // DTI: (500 + 800 - 1800) < 0 → clamped 0, improved.
    const dti = better.find((d) => d.metric === "dti")!;
    expect(dti.to).toBe(0);
    expect(dti.improved).toBe(true);
  });
});

describe("worstDeltaTemperature", () => {
  it("follows the worst resulting temperature so bad trades surface", () => {
    const deltas = computeHousingDeltas(BASE, 2500)!;
    // Runway lands yellow (3.5 mo), DTI lands crimson (50%).
    expect(worstDeltaTemperature(deltas)).toBe("crimson");
  });
});
