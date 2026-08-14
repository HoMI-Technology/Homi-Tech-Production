/**
 * Wave 1 same-model adapters — one ledger, one seed, one engine.
 *
 * Tools Monte Carlo and Money · Decide Monte Carlo must call
 * `runMonteCarlo` with `MONTE_CARLO_ENGINE`. Rehearse does not share
 * that engine in this wave; it must still take house price and income
 * from the same ledger Affordability uses, never invent a second set.
 */

import {
  housingPrincipalAndInterest,
  type SimulationInputs,
} from "@/lib/decisions/simulate";
import { scenarioInputsFromFinance } from "@/lib/readiness/scenario";
import {
  MONTE_CARLO_ENGINE,
  runMonteCarlo,
  type MonteCarloInputs,
  type MonteCarloResult,
} from "@/lib/tools/montecarlo";
import {
  paymentBreakdown,
  type AffordabilityInputs,
} from "@/lib/tools/mortgage";

/**
 * Dollar bands (P10 / P50 / P90) must match within one cent.
 * Rate fields (survival, distress, P(target)) must match within 1e-6 pp.
 * Same engine + same seed + same ledger-derived inputs — anything wider
 * is a surface fork, not sampling noise.
 */
export const SAME_MODEL_DOLLAR_TOLERANCE = 0.01;
export const SAME_MODEL_RATE_TOLERANCE = 1e-6;

/** One fixture ledger both MC surfaces and Rehearse housing identity read. */
export interface SameModelLedger {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  liquidSavings: number;
  investedAssets: number;
  downPaymentSaved: number;
  targetPrice: number;
  currentRent: number;
  assumedRatePct: number;
  termYears: number;
  taxInsuranceRatePct: number;
  expectedReturnPct: number;
  volatilityPct: number;
  monteCarloYears: number;
}

export const SAME_MODEL_GOLDEN_LEDGER: SameModelLedger = {
  monthlyIncome: 8_500,
  monthlyExpenses: 4_200,
  monthlyDebtPayments: 400,
  liquidSavings: 28_000,
  investedAssets: 45_000,
  downPaymentSaved: 40_000,
  targetPrice: 425_000,
  currentRent: 2_100,
  assumedRatePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.5,
  expectedReturnPct: 7,
  volatilityPct: 15,
  monteCarloYears: MONTE_CARLO_ENGINE.defaultYears,
};

export function monthlyContributionFromLedger(ledger: SameModelLedger): number {
  return Math.max(
    0,
    ledger.monthlyIncome - ledger.monthlyExpenses - ledger.monthlyDebtPayments,
  );
}

/** Shared Tools / Decide MC inputs. Seed and runs come only from the engine. */
export function monteCarloInputsFromLedger(ledger: SameModelLedger): MonteCarloInputs {
  return {
    currentSavings: ledger.investedAssets,
    monthlyContribution: monthlyContributionFromLedger(ledger),
    years: ledger.monteCarloYears,
    expectedReturnPct: ledger.expectedReturnPct,
    volatilityPct: ledger.volatilityPct,
    seed: MONTE_CARLO_ENGINE.seed,
    runs: MONTE_CARLO_ENGINE.runs,
  };
}

export function runToolsMonteCarlo(ledger: SameModelLedger): MonteCarloResult {
  return runMonteCarlo(monteCarloInputsFromLedger(ledger));
}

export function runDecideMonteCarlo(ledger: SameModelLedger): MonteCarloResult {
  return runMonteCarlo(monteCarloInputsFromLedger(ledger));
}

export function affordabilityInputsFromLedger(ledger: SameModelLedger): AffordabilityInputs {
  return {
    annualIncome: ledger.monthlyIncome * 12,
    monthlyDebts: ledger.monthlyDebtPayments,
    rate: ledger.assumedRatePct,
    termYears: ledger.termYears,
    taxInsuranceRate: ledger.taxInsuranceRatePct / 100,
    downPayment: ledger.downPaymentSaved,
  };
}

export function rehearseInputsFromLedger(ledger: SameModelLedger): SimulationInputs {
  return scenarioInputsFromFinance({
    liquidSavings: ledger.liquidSavings,
    monthlyIncome: ledger.monthlyIncome,
    monthlyExpenses: ledger.monthlyExpenses,
    monthlyDebtPayments: ledger.monthlyDebtPayments,
    downPaymentSaved: ledger.downPaymentSaved,
    targetPrice: ledger.targetPrice,
    currentRent: ledger.currentRent,
    assumedRatePct: ledger.assumedRatePct,
  });
}

/**
 * P&I Rehearse amortizes for this ledger. Must equal Affordability's
 * `paymentBreakdown(...).principalAndInterest` for the same price / down / rate / term.
 */
export function rehearseHousingPaymentFromLedger(ledger: SameModelLedger): number {
  return housingPrincipalAndInterest(rehearseInputsFromLedger(ledger), ledger.termYears);
}

export function affordabilityHousingPaymentFromLedger(ledger: SameModelLedger): number {
  return paymentBreakdown(ledger.targetPrice, affordabilityInputsFromLedger(ledger))
    .principalAndInterest;
}
