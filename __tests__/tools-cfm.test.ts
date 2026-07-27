// @vitest-environment jsdom
/**
 * CFM contract: the Canonical Financial Model exists only when the user
 * has actually saved finance data, every field carries an honest source
 * label, and overlay write-backs merge without disturbing other fields.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCfm,
  deriveCfm,
  resolveCfmValue,
  cfmCoverage,
  loadToolsOverlay,
  saveToolsOverlayFields,
  toolsOverlaySavedAt,
} from "@/lib/tools/cfm";
import { saveFinanceState, DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("buildCfm", () => {
  it("returns null until finance data is saved — defaults never masquerade", () => {
    expect(buildCfm()).toBeNull();
  });

  it("builds a source-labeled model once data is saved", () => {
    saveFinanceState({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 });
    const cfm = buildCfm();
    expect(cfm).not.toBeNull();
    expect(cfm!.core.monthlyIncome).toEqual({ value: 8000, source: "self-reported" });
    // No overlay yet — lens fields are honestly missing, not invented.
    expect(cfm!.housing.targetPrice.source).toBe("missing");
    expect(cfm!.meta.savedAt).not.toBeNull();
  });
});

describe("deriveCfm", () => {
  it("labels overlay fields lens-derived and leaves gaps missing", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, { targetPrice: 420000 }, null);
    expect(cfm.housing.targetPrice).toEqual({ value: 420000, source: "lens-derived" });
    expect(cfm.housing.currentRent.source).toBe("missing");
  });

  it("derives invested assets from retirement-like asset names", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, {}, null);
    // DEFAULT_FINANCE_STATE has a "Retirement accounts" asset of 32000.
    expect(cfm.horizon.investedAssets.value).toBe(32000);
  });

  it("derives annual contribution from positive net cash flow only", () => {
    const positive = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000, monthlyExpenses: 5000, monthlyDebtPayments: 1000 },
      {},
      null,
    );
    expect(positive.horizon.annualContribution.value).toBe(24000);

    const negative = deriveCfm(
      { ...DEFAULT_FINANCE_STATE, monthlyIncome: 3000, monthlyExpenses: 5000, monthlyDebtPayments: 1000 },
      {},
      null,
    );
    expect(negative.horizon.annualContribution.source).toBe("missing");
  });

  it("computes derived metrics with the same functions as the dashboard", () => {
    const finance = {
      ...DEFAULT_FINANCE_STATE,
      monthlyIncome: 6000,
      monthlyExpenses: 3000,
      monthlyDebtPayments: 1000,
      liquidSavings: 20000,
    };
    const cfm = deriveCfm(finance, {}, null);
    expect(cfm.derived.netCashFlow).toBe(2000);
    expect(cfm.derived.runwayMonths).toBe(5); // 20000 / 4000
    expect(cfm.derived.dtiPct).toBeCloseTo(16.67, 1);
  });
});

describe("resolveCfmValue + cfmCoverage", () => {
  it("resolves dot paths and reports missing honestly", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, { targetPrice: 420000 }, null);
    expect(resolveCfmValue(cfm, "housing.targetPrice").value).toBe(420000);
    expect(resolveCfmValue(cfm, "housing.currentRent").source).toBe("missing");
    expect(resolveCfmValue(cfm, "nonsense.path").source).toBe("missing");
  });

  it("coverage reflects only real (non-missing) values", () => {
    const cfm = deriveCfm(DEFAULT_FINANCE_STATE, { targetPrice: 420000 }, null);
    const coverage = cfmCoverage(cfm, [
      "core.monthlyIncome",
      "housing.targetPrice",
      "housing.currentRent",
      "housing.hoaMonthly",
    ]);
    expect(coverage).toBe(0.5);
  });
});

describe("tools overlay storage", () => {
  it("round-trips and merges fields without disturbing others", () => {
    saveToolsOverlayFields({ targetPrice: 420000 });
    saveToolsOverlayFields({ assumedRatePct: 6.5 });
    const overlay = loadToolsOverlay();
    expect(overlay.targetPrice).toBe(420000);
    expect(overlay.assumedRatePct).toBe(6.5);
    expect(toolsOverlaySavedAt()).not.toBeNull();
  });

  it("feeds the CFM as lens-derived on the next build", () => {
    saveFinanceState(DEFAULT_FINANCE_STATE);
    saveToolsOverlayFields({ currentRent: 2100 });
    const cfm = buildCfm();
    expect(cfm!.housing.currentRent).toEqual({ value: 2100, source: "lens-derived" });
  });
});
