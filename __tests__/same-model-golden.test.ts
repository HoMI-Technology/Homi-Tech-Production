/**
 * Wave 1 same-model golden fixture.
 *
 * One ledger, one seed. Tools Monte Carlo and Money · Decide Monte Carlo
 * must agree inside SAME_MODEL_*_TOLERANCE. Rehearse housing P&I must
 * match Affordability's P&I for that ledger — no second income, no
 * second house price.
 *
 * Remaining model gap (documented, not closed in this PR): Rehearse is a
 * 5-year buy-vs-wait net-position illustration. It does not share the
 * Monte Carlo engine. It still applies 3% closing + 1%/yr maintenance
 * rather than Affordability's tax/insurance PITI total. Only P&I is
 * identity-locked.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import type { AssessmentInputs } from "@/lib/scoring/public";
import { deriveAnchors, simulate } from "@/lib/simulator";
import { MONTE_CARLO_ENGINE } from "@/lib/tools/montecarlo";
import { getLens } from "@/lib/tools/registry";
import {
  SAME_MODEL_DOLLAR_TOLERANCE,
  SAME_MODEL_GOLDEN_LEDGER,
  SAME_MODEL_RATE_TOLERANCE,
  affordabilityHousingPaymentFromLedger,
  affordabilityInputsFromLedger,
  monteCarloInputsFromLedger,
  monthlyContributionFromLedger,
  rehearseHousingPaymentFromLedger,
  rehearseInputsFromLedger,
  runDecideMonteCarlo,
  runToolsMonteCarlo,
} from "@/lib/tools/same-model";
import { scenarioInputsFromFinance } from "@/lib/readiness/scenario";
import { DEFAULT_SIMULATION_INPUTS } from "@/lib/decisions/simulate";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const GOLDEN = SAME_MODEL_GOLDEN_LEDGER;

describe("Wave 1 same-model golden — Monte Carlo", () => {
  it("documents the engine config and the numeric tolerance", () => {
    expect(MONTE_CARLO_ENGINE.runs).toBe(10_000);
    expect(MONTE_CARLO_ENGINE.seed).toBe(1337);
    expect(SAME_MODEL_DOLLAR_TOLERANCE).toBe(0.01);
    expect(SAME_MODEL_RATE_TOLERANCE).toBe(1e-6);
  });

  it("Tools MC and Decide MC agree on the golden ledger within tolerance", () => {
    const tools = runToolsMonteCarlo(GOLDEN);
    const decide = runDecideMonteCarlo(GOLDEN);
    const inputs = monteCarloInputsFromLedger(GOLDEN);

    expect(inputs.seed).toBe(MONTE_CARLO_ENGINE.seed);
    expect(inputs.runs).toBe(MONTE_CARLO_ENGINE.runs);
    expect(inputs.currentSavings).toBe(GOLDEN.investedAssets);
    expect(inputs.monthlyContribution).toBe(monthlyContributionFromLedger(GOLDEN));

    expect(decide.finalP10).toBeCloseTo(tools.finalP10, 2);
    expect(decide.finalP50).toBeCloseTo(tools.finalP50, 2);
    expect(decide.finalP90).toBeCloseTo(tools.finalP90, 2);
    expect(Math.abs(decide.finalP10 - tools.finalP10)).toBeLessThanOrEqual(
      SAME_MODEL_DOLLAR_TOLERANCE,
    );
    expect(Math.abs(decide.finalP50 - tools.finalP50)).toBeLessThanOrEqual(
      SAME_MODEL_DOLLAR_TOLERANCE,
    );
    expect(Math.abs(decide.finalP90 - tools.finalP90)).toBeLessThanOrEqual(
      SAME_MODEL_DOLLAR_TOLERANCE,
    );
    expect(Math.abs(decide.survivalRate - tools.survivalRate)).toBeLessThanOrEqual(
      SAME_MODEL_RATE_TOLERANCE,
    );
    expect(Math.abs(decide.distressRate - tools.distressRate)).toBeLessThanOrEqual(
      SAME_MODEL_RATE_TOLERANCE,
    );
    expect(decide.bands).toHaveLength(tools.bands.length);
    for (let i = 0; i < tools.bands.length; i++) {
      expect(decide.bands[i]!.p50).toBeCloseTo(tools.bands[i]!.p50, 2);
    }
  });

  it("Decide panel and Tools page both pass MONTE_CARLO_ENGINE and print no run count", () => {
    const decideSrc = read("components/tools/TimingPanels.tsx");
    const toolsSrc = read("app/(product)/tools/monte-carlo/page.tsx");
    const planSrc = read("components/planner/plan/PlanModels.tsx");

    expect(decideSrc).toMatch(/MONTE_CARLO_ENGINE/);
    expect(toolsSrc).toMatch(/MONTE_CARLO_ENGINE/);
    expect(decideSrc).not.toMatch(/const MC_RUNS\s*=\s*1000/);
    expect(decideSrc).not.toMatch(/runs:\s*1000\b/);
    expect(toolsSrc).not.toMatch(/runs:\s*10000\b/);
    expect(decideSrc).not.toMatch(/of \{.*\} simulated futures/);
    expect(decideSrc).not.toMatch(/1,000 seeded|10,000 seeded/);
    expect(planSrc).not.toMatch(/\$\{MC_RUNS\.toLocaleString/);
    expect(planSrc).not.toMatch(/10,000 seeded runs|1,000 seeded/);
  });

  it("hub/registry copy stays Simulated paths. Not a forecast.", () => {
    expect(getLens("monte-carlo")!.desc).toBe("Simulated paths. Not a forecast.");
  });
});

describe("Wave 1 same-model golden — Rehearse housing identity", () => {
  it("does not invent a second house price or a second income versus the ledger", () => {
    const rehearse = rehearseInputsFromLedger(GOLDEN);
    expect(rehearse.homePrice).toBe(GOLDEN.targetPrice);
    expect(rehearse.homePrice).not.toBe(DEFAULT_SIMULATION_INPUTS.homePrice);
    expect(rehearse.downPaymentSaved).toBe(GOLDEN.downPaymentSaved);
    expect(rehearse.monthlySavings).toBe(monthlyContributionFromLedger(GOLDEN));
    expect(rehearse.monthlySavings).not.toBe(DEFAULT_SIMULATION_INPUTS.monthlySavings);
    expect(rehearse.rent).toBe(GOLDEN.currentRent);
    expect(rehearse.rate).toBe(GOLDEN.assumedRatePct);
  });

  it("uses Affordability's income and price from the same ledger", () => {
    const afford = affordabilityInputsFromLedger(GOLDEN);
    expect(afford.annualIncome).toBe(GOLDEN.monthlyIncome * 12);
    expect(afford.monthlyDebts).toBe(GOLDEN.monthlyDebtPayments);
    expect(afford.downPayment).toBe(GOLDEN.downPaymentSaved);
    expect(afford.rate).toBe(GOLDEN.assumedRatePct);
    expect(afford.termYears).toBe(GOLDEN.termYears);
  });

  it("Rehearse housing P&I matches Affordability P&I on the golden ledger", () => {
    const rehearsePiti = rehearseHousingPaymentFromLedger(GOLDEN);
    const affordPiti = affordabilityHousingPaymentFromLedger(GOLDEN);
    expect(Math.abs(rehearsePiti - affordPiti)).toBeLessThanOrEqual(SAME_MODEL_DOLLAR_TOLERANCE);
    expect(rehearsePiti).toBeGreaterThan(0);
  });

  it("never invents homePrice from downPaymentTarget × 5", () => {
    const invented = scenarioInputsFromFinance({
      liquidSavings: 20_000,
      monthlyIncome: 8_000,
      monthlyExpenses: 5_000,
      monthlyDebtPayments: 500,
      downPaymentTarget: 60_000,
    });
    expect(invented.homePrice).toBe(0);
    expect(invented.homePrice).not.toBe(400_000);
    expect(invented.homePrice).not.toBe(300_000);
    expect(invented.monthlySavings).toBe(2_500);
    expect(read("lib/readiness/scenario.ts")).not.toMatch(/\*\s*5/);
  });

  it("keeps illustrative defaults only when no ledger is present", () => {
    expect(scenarioInputsFromFinance({})).toEqual(DEFAULT_SIMULATION_INPUTS);
  });

  it("does not promote Rehearse into header or More", () => {
    const chrome = [...APP_PRIMARY_NAV, ...APP_MORE_NAV].map((i) => i.href);
    expect(chrome).not.toContain("/decisions");
    expect(chrome).not.toContain("/labs");
  });
});

describe("Wave 1 same-model golden — Financial Reality only", () => {
  it("hard stops still win; levers do not invent a READY downgrade", () => {
    const inputs: AssessmentInputs = {
      debtToIncomeRatio: 0.25,
      downPaymentPercent: 0.2,
      emergencyFundMonths: 6,
      creditScore: 750,
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 9,
      fomoLevel: 3,
      timeHorizonMonths: 18,
      savingsRate: 0.22,
      downPaymentProgress: 0.85,
    };
    const anchors = deriveAnchors({
      emotional_score: 20,
      timing_score: 15,
      inputs: inputs as unknown as Record<string, unknown>,
    });
    const thin = {
      monthlyIncome: 6_000,
      monthlyExpenses: 4_000,
      liquidSavings: 4_000,
      totalDebt: 30_000,
      monthlyDebtPayments: null,
      source: "plaid_sync" as const,
    };
    const blocked = simulate(thin, thin, anchors);
    expect(blocked.hardStops.length).toBeGreaterThan(0);
    expect(blocked.verdict).toBe("NOT_YET");
    expect(blocked.verdict).not.toBe("READY");
  });
});
