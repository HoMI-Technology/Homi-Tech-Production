import { describe, expect, it } from "vitest";
import { runMonteCarlo } from "@/lib/tools/montecarlo";

const BASE_INPUTS = {
  currentSavings: 20000,
  monthlyContribution: 600,
  years: 10,
  expectedReturnPct: 7,
  volatilityPct: 15,
  targetAmount: 150000,
  seed: 1337,
};

describe("tools/montecarlo — backward compatibility", () => {
  it("still returns sane bands/percentiles matching the prior shape when new params are omitted", () => {
    const result = runMonteCarlo({ ...BASE_INPUTS, runs: 1000 });

    expect(result.bands.length).toBe(10);
    expect(result.bands[0]).toHaveProperty("year");
    expect(result.bands[0]).toHaveProperty("p10");
    expect(result.bands[0]).toHaveProperty("p50");
    expect(result.bands[0]).toHaveProperty("p90");
    expect(result.finalP10).toBeLessThanOrEqual(result.finalP50);
    expect(result.finalP50).toBeLessThanOrEqual(result.finalP90);
    expect(result.probabilityOfTarget).not.toBeNull();
    expect(result.probabilityOfTarget as number).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfTarget as number).toBeLessThanOrEqual(100);
  });

  it("defaults runs to 10000 when omitted (survival/distress rates still well-formed)", () => {
    const result = runMonteCarlo(BASE_INPUTS);
    expect(result.survivalRate).toBeGreaterThanOrEqual(0);
    expect(result.survivalRate).toBeLessThanOrEqual(100);
    expect(result.distressRate).toBeGreaterThanOrEqual(0);
    expect(result.distressRate).toBeLessThanOrEqual(100);
  });
});

describe("tools/montecarlo — determinism", () => {
  it("produces identical results across two calls with the same seed and inputs", () => {
    const a = runMonteCarlo({ ...BASE_INPUTS, runs: 500 });
    const b = runMonteCarlo({ ...BASE_INPUTS, runs: 500 });
    expect(a).toEqual(b);
  });

  it("stays deterministic with job-loss, maintenance shock, and income growth params set", () => {
    const inputs = {
      ...BASE_INPUTS,
      runs: 500,
      jobLossProb: 5,
      maintenanceShock: 10,
      incomeGrowth: 3,
    };
    const a = runMonteCarlo(inputs);
    const b = runMonteCarlo(inputs);
    expect(a).toEqual(b);
  });
});

describe("tools/montecarlo — survival and distress rates", () => {
  it("reports survivalRate at (or very near) 100 when there are no shocks and contributions dominate volatility", () => {
    const result = runMonteCarlo({
      currentSavings: 50000,
      monthlyContribution: 2000,
      years: 5,
      expectedReturnPct: 7,
      volatilityPct: 5,
      seed: 1337,
      runs: 500,
      jobLossProb: 0,
      maintenanceShock: 0,
    });
    expect(result.survivalRate).toBeGreaterThanOrEqual(99);
  });

  it("keeps survivalRate/distressRate within [0, 100]", () => {
    const result = runMonteCarlo({
      ...BASE_INPUTS,
      runs: 500,
      jobLossProb: 20,
      maintenanceShock: 30,
    });
    expect(result.survivalRate).toBeGreaterThanOrEqual(0);
    expect(result.survivalRate).toBeLessThanOrEqual(100);
    expect(result.distressRate).toBeGreaterThanOrEqual(0);
    expect(result.distressRate).toBeLessThanOrEqual(100);
  });

  it("does not increase survivalRate as maintenanceShock probability rises, all else equal", () => {
    const baseline = runMonteCarlo({
      ...BASE_INPUTS,
      runs: 2000,
      maintenanceShock: 0,
    });
    const shocked = runMonteCarlo({
      ...BASE_INPUTS,
      runs: 2000,
      maintenanceShock: 30,
    });
    expect(shocked.survivalRate).toBeLessThanOrEqual(baseline.survivalRate);
  });
});
