/**
 * Demo-seed parity — ported from the Vite reference build's
 * planner-store.test.mjs acceptance suite.
 *
 * The numbers are the contract (screenshot canon, reference
 * audit-overview.png / wealth tab):
 *
 *   accounts Σ   $18,720.60 cash (3 linked accounts)
 *   income       $6,650  · expenses $3,617  · saved ≈ 46%
 *   holdings     MV $57,077.95 / cost $44,213.00 (6 positions)
 *   net worth    $72,098.56
 *   open bills   $2,345.88 (6 bills)
 *   runway       5.2 mo  · DTI 3%
 *   readiness    credit 750 · sliders 7/7/7 · FOMO 4 · 18-mo horizon
 *                (the profile that renders Decision Readiness Score 73 · ALMOST_THERE
 *                · pillars 74/66/80 through the server scoring seam)
 */

import { describe, it, expect } from "vitest";
import {
  addDaysISO,
  buildDemoSeed,
  daysUntil,
  financialReality,
  summarizeAccounts,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
} from "@/lib/planner/derived";
import { usePlannerStore } from "@/lib/planner/store";

// The seed dates every row relative to "today"; a local-noon anchor keeps
// this timezone-safe. Nothing below depends on the absolute calendar date.
const seed = buildDemoSeed(new Date("2031-01-02T12:00:00"));

describe("buildDemoSeed — screenshot dollar parity", () => {
  it("sums accounts to $18,720.60 cash", () => {
    const { cash, count } = summarizeAccounts(seed.accounts);
    expect(count).toBe(3);
    expect(Math.abs(cash - 18720.6)).toBeLessThan(0.01);
  });

  it("derives income $6,650 / expenses $3,617 / saved 46%", () => {
    const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
    expect(reality.income).toBe(6650);
    expect(Math.abs(reality.expenses - 3617)).toBeLessThan(0.01);
    expect(Math.round(reality.savingsRate)).toBe(46);
  });

  it("derives runway 5.2mo and DTI 3%", () => {
    const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
    expect(Math.abs(Math.round(reality.runwayMonths * 10) / 10 - 5.2)).toBeLessThan(1e-9);
    expect(Math.round(reality.dti)).toBe(3);
  });

  it("values holdings at MV $57,077.95 / cost $44,213.00", () => {
    const portfolio = summarizePortfolio(seed.holdings);
    expect(portfolio.count).toBe(6);
    expect(Math.abs(portfolio.marketValue - 57077.95)).toBeLessThan(0.01);
    expect(Math.abs(portfolio.costBasis - 44213.0)).toBeLessThan(0.01);
  });

  it("derives net worth $72,098.56", () => {
    const nw = totalNetWorth(seed.accounts, seed.holdings, seed.netWorthItems);
    expect(Math.abs(nw.netWorth - 72098.56)).toBeLessThan(0.01);
  });

  it("totals open bills at $2,345.88 across 6 bills", () => {
    expect(seed.bills).toHaveLength(6);
    expect(Math.abs(upcomingBillsTotal(seed.bills) - 2345.88)).toBeLessThan(0.01);
  });

  it("keeps the seed shape: 3 accounts / 6 bills / 6 holdings / 15 ledger rows", () => {
    expect(seed.accounts).toHaveLength(3);
    expect(seed.bills).toHaveLength(6);
    expect(seed.holdings).toHaveLength(6);
    expect(seed.transactions).toHaveLength(15);
    expect({ target: seed.savingsGoal.target, current: seed.savingsGoal.current }).toEqual({
      target: 12000,
      current: 4800,
    });
  });

  it("carries the canon readiness profile (750 / 7s / FOMO 4 / 18mo)", () => {
    // Demo parity: this profile is what renders 73 · ALMOST_THERE ·
    // 74/66/80 through the mocked server seam (see closed-loop.test.ts).
    // PlannerPage.loadSampleNumbers must not override these fields.
    expect(seed.readinessProfile.creditScore).toBe(750);
    expect(seed.readinessProfile.lifeStability).toBe(7);
    expect(seed.readinessProfile.confidenceLevel).toBe(7);
    expect(seed.readinessProfile.partnerAlignment).toBe(7);
    expect(seed.readinessProfile.fomoLevel).toBe(4);
    expect(seed.readinessProfile.timeHorizonMonths).toBe(18);
    expect(seed.readinessProfile.targetHomePrice).toBe(400000);
    expect(seed.readinessProfile.downPaymentSaved).toBe(20000);
  });

  it("paints the gauges emerald/emerald/yellow/emerald", () => {
    const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
    expect(reality.temps).toEqual({
      cashFlow: "emerald",
      savingsRate: "emerald",
      runway: "yellow",
      dti: "emerald",
    });
  });
});

describe("ISO date helpers", () => {
  it("round-trip relative to any anchor", () => {
    const anchor = seed.transactions[0]?.date ?? "2031-01-02";
    expect(daysUntil(addDaysISO(anchor, 3), anchor)).toBe(3);
    expect(daysUntil(addDaysISO(anchor, -2), anchor)).toBe(-2);
  });
});

describe("usePlannerStore.resetDemo — store restores the same canon numbers", () => {
  it("reseeds the workspace to the screenshot state", () => {
    usePlannerStore.getState().clearWorkspace();
    expect(usePlannerStore.getState().accounts).toHaveLength(0);

    usePlannerStore.getState().resetDemo();
    const s = usePlannerStore.getState();

    expect(Math.abs(summarizeAccounts(s.accounts).cash - 18720.6)).toBeLessThan(0.01);
    const reality = financialReality(s.transactions, s.accounts, s.bills);
    expect(reality.income).toBe(6650);
    expect(Math.abs(reality.expenses - 3617)).toBeLessThan(0.01);
    expect(Math.abs(upcomingBillsTotal(s.bills) - 2345.88)).toBeLessThan(0.01);
    expect(Math.abs(summarizePortfolio(s.holdings).marketValue - 57077.95)).toBeLessThan(0.01);
    expect(Math.abs(totalNetWorth(s.accounts, s.holdings, s.netWorthItems).netWorth - 72098.56)).toBeLessThan(0.01);
    expect(s.readinessProfile.creditScore).toBe(750);
    expect(s.readinessProfile.fomoLevel).toBe(4);
  });
});
