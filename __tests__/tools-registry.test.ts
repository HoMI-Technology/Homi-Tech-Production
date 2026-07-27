/**
 * Registry contract: ids and paths are unique, chain targets always
 * resolve to real lenses (no dead hand-offs), input CFM paths use valid
 * prefixes, fallbacks stay in bounds, and CFM seed resolution honors
 * the honesty rules (missing data never seeds a slider).
 */

import { describe, expect, it } from "vitest";
import { LENSES, RING_ORDER, getLens, lensCoveragePaths, resolveLensSeeds } from "@/lib/tools/registry";
import { deriveCfm } from "@/lib/tools/cfm";
import { DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

const VALID_CFM_PREFIXES = ["core.", "housing.", "horizon."];

describe("lens registry", () => {
  it("has unique ids and paths", () => {
    const ids = LENSES.map((l) => l.id);
    const paths = LENSES.map((l) => l.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every lens sits on a known ring", () => {
    for (const lens of LENSES) {
      expect(RING_ORDER).toContain(lens.ring);
    }
  });

  it("chain targets always resolve — no dead hand-offs", () => {
    for (const lens of LENSES) {
      for (const chain of lens.chains ?? []) {
        expect(getLens(chain.lensId), `${lens.id} chains to missing ${chain.lensId}`).toBeDefined();
        expect(chain.lensId).not.toBe(lens.id);
      }
    }
  });

  it("input CFM paths use valid prefixes and have fallbacks", () => {
    for (const lens of LENSES) {
      for (const input of lens.inputs ?? []) {
        if (input.cfmPath) {
          expect(
            VALID_CFM_PREFIXES.some((p) => input.cfmPath!.startsWith(p)),
            `${lens.id}.${input.key} has invalid cfmPath ${input.cfmPath}`,
          ).toBe(true);
        }
        expect(Number.isFinite(input.fallback)).toBe(true);
        expect(input.min).toBeLessThan(input.max);
        expect(input.fallback).toBeGreaterThanOrEqual(input.min);
        expect(input.fallback).toBeLessThanOrEqual(input.max);
      }
    }
  });

  it("lensCoveragePaths collects only declared cfmPaths", () => {
    const mortgage = getLens("mortgage")!;
    const paths = lensCoveragePaths(mortgage);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain("housing.targetPrice");
    // The simulator declares no inputs yet — coverage is empty, not broken.
    expect(lensCoveragePaths(getLens("simulator")!)).toEqual([]);
  });
});

describe("resolveLensSeeds", () => {
  it("seeds from real CFM values, clamped to slider bounds", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000, liquidSavings: 50000 },
      { targetPrice: 99999999 }, // beyond slider max — must clamp
      null,
    );
    const mortgageSeeds = resolveLensSeeds(getLens("mortgage")!, cfm);
    expect(mortgageSeeds.price).toBe(1500000); // clamped to max

    const runwaySeeds = resolveLensSeeds(getLens("runway")!, cfm);
    expect(runwaySeeds.savings).toBe(50000);
    // expenses derives from outflow = expenses + debt payments.
    expect(runwaySeeds.expenses).toBe(
      DEFAULT_FINANCE_STATE.monthlyExpenses + DEFAULT_FINANCE_STATE.monthlyDebtPayments,
    );
  });

  it("derives computed seeds (annual income, loan from overlay)", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 },
      { targetPrice: 420000, downPaymentSaved: 84000 },
      null,
    );
    const affordability = resolveLensSeeds(getLens("affordability")!, cfm);
    expect(affordability.income).toBe(96000);
    expect(affordability.downPayment).toBe(84000);

    const apr = resolveLensSeeds(getLens("apr-compare")!, cfm);
    expect(apr.loan).toBe(336000); // 420000 - 84000
  });

  it("never seeds from missing data — fallbacks stay illustrative", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, {}, null); // no overlay
    const seeds = resolveLensSeeds(getLens("heloc")!, cfm);
    expect(seeds.homeValue).toBeUndefined();
    expect(seeds.mortgageBalance).toBeUndefined();
  });

  it("blind-budget ranges center on saved numbers", () => {
    const cfm = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 10000, liquidSavings: 20000 },
      {},
      null,
    );
    const seeds = resolveLensSeeds(getLens("blind-budget")!, cfm);
    expect(seeds.incomeLow).toBe(8500);
    expect(seeds.incomeHigh).toBe(11500);
    expect(seeds.savingsLow).toBe(17000);
  });
});
