/**
 * Lens Registry — Decision Lab Phase 1.
 *
 * The single declarative contract for every decision tool. Before this,
 * tool metadata lived in two places (the hub's hardcoded GROUPS array and
 * each page's own copy) and tool inputs lived nowhere — each page invented
 * its own slider defaults. The registry drives four things from one
 * definition:
 *
 *   1. The /tools hub (ring grouping, cards, counts)
 *   2. CFM prefill (inputs[].cfmPath / inputs[].derive → slider seeds +
 *      "your numbers" tags)
 *   3. Decision chains (typed next-lens hand-offs on result panels)
 *   4. The Companion's lens digest (Phase 3 — ids, paths, coverage paths)
 *
 * Pure TS — no storage, no React. Safe to import anywhere.
 */

import { resolveCfmValue, type CanonicalFinancialModel } from "@/lib/tools/cfm";

export type LensRing = "readiness" | "reality" | "stability" | "timing";

export interface RingMeta {
  title: string;
  subtitle: string;
  /** Canonical brand accent for the ring. */
  accent: string;
}

export const RING_META: Record<LensRing, RingMeta> = {
  readiness: {
    title: "Readiness",
    subtitle: "Same engine as the assessment — explore levers without a full retest.",
    accent: "#22d3ee",
  },
  reality: {
    title: "Financial Reality",
    subtitle: "What you can carry — not just what a lender will approve.",
    accent: "#22d3ee",
  },
  stability: {
    title: "Stability",
    subtitle: "Shock absorption before the leap.",
    accent: "#34d399",
  },
  timing: {
    title: "Perfect Timing",
    subtitle: "Independence and path risk — educational, not advice.",
    accent: "#facc15",
  },
};

export const RING_ORDER: LensRing[] = ["readiness", "reality", "stability", "timing"];

export interface LensInputSpec {
  key: string;
  label: string;
  /** Dot path into the CFM ("housing.targetPrice"). When set and the CFM
   * has a real value, the slider seeds from it and renders a "your
   * numbers" tag. When absent, the illustrative fallback is used — and
   * never presented as the user's. */
  cfmPath?: string;
  /** Derived seed for values that aren't a direct CFM field (e.g. annual
   * income = monthly × 12). Takes precedence over cfmPath. Return
   * undefined to leave the illustrative fallback in place. */
  derive?: (cfm: CanonicalFinancialModel) => number | undefined;
  /** Overlay field written back when the user hits "update my numbers".
   * Finance-owned fields (income, savings) never write back here — the
   * finance dashboard is their only editor. */
  writeBack?:
    | "targetPrice"
    | "downPaymentSaved"
    | "currentRent"
    | "assumedRatePct"
    | "termYears"
    | "taxInsuranceRatePct"
    | "hoaMonthly"
    | "homeValue"
    | "currentMortgageBalance"
    | "currentMortgageRatePct"
    | "investedAssets"
    | "annualContribution";
  fallback: number;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years";
}

export interface LensChain {
  lensId: string;
  /** Why this hand-off matters, in product voice. */
  pitch: string;
  /** Input keys carried into the next lens's prefill. */
  carry: string[];
}

export interface LensDefinition {
  id: string;
  path: string;
  name: string;
  desc: string;
  ring: LensRing;
  accent: string;
  gate: "free" | "plus";
  inputs?: LensInputSpec[];
  chains?: LensChain[];
}

/** Shared derivations used by several lenses. */
const annualIncome = (cfm: CanonicalFinancialModel) =>
  cfm.core.monthlyIncome.value > 0 ? cfm.core.monthlyIncome.value * 12 : undefined;

const monthlyOutflow = (cfm: CanonicalFinancialModel) =>
  cfm.core.monthlyExpenses.value + cfm.core.monthlyDebtPayments.value;

const downPaymentOrSavings = (cfm: CanonicalFinancialModel) =>
  cfm.housing.downPaymentSaved.source !== "missing"
    ? cfm.housing.downPaymentSaved.value
    : cfm.core.liquidSavings.value > 0
      ? cfm.core.liquidSavings.value
      : undefined;

const loanFromOverlay = (cfm: CanonicalFinancialModel) =>
  cfm.housing.targetPrice.source !== "missing"
    ? Math.max(
        0,
        cfm.housing.targetPrice.value -
          (cfm.housing.downPaymentSaved.source !== "missing" ? cfm.housing.downPaymentSaved.value : 0),
      )
    : undefined;

const investedOrMissing = (cfm: CanonicalFinancialModel) =>
  cfm.horizon.investedAssets.source !== "missing" ? cfm.horizon.investedAssets.value : undefined;

const positiveCashFlow = (cfm: CanonicalFinancialModel) =>
  cfm.derived.netCashFlow > 0 ? Math.round(cfm.derived.netCashFlow) : undefined;

export const LENSES: LensDefinition[] = [
  // --- Readiness ---
  {
    id: "simulator",
    path: "/simulator",
    name: "Score Simulator",
    desc: "Move income, savings, and debt levers and watch readiness respond.",
    ring: "readiness",
    accent: "#22d3ee",
    gate: "free",
  },

  // --- Financial Reality (housing) ---
  {
    id: "affordability",
    path: "/tools/affordability",
    name: "Affordability",
    desc: "Three honest comfort tiers — protected, stretch, and red line.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
    inputs: [
      { key: "income", label: "Gross annual income", derive: annualIncome, fallback: 95000, min: 0, max: 500000, step: 1000, format: "currency" },
      { key: "debts", label: "Other monthly debts", cfmPath: "core.monthlyDebtPayments", fallback: 400, min: 0, max: 10000, step: 25, format: "currency" },
      { key: "rate", label: "Interest rate", cfmPath: "housing.assumedRatePct", writeBack: "assumedRatePct", fallback: 6.5, min: 2, max: 12, step: 0.125, format: "percent" },
      { key: "term", label: "Loan term (years)", cfmPath: "housing.termYears", writeBack: "termYears", fallback: 30, min: 10, max: 30, step: 5, format: "years" },
      { key: "taxInsRate", label: "Taxes + insurance (% of price / yr)", cfmPath: "housing.taxInsuranceRatePct", writeBack: "taxInsuranceRatePct", fallback: 1.5, min: 0.5, max: 3, step: 0.1, format: "percent" },
      { key: "downPayment", label: "Down payment", derive: downPaymentOrSavings, writeBack: "downPaymentSaved", fallback: 40000, min: 0, max: 500000, step: 1000, format: "currency" },
    ],
    chains: [
      { lensId: "mortgage", pitch: "See a real payment at this price", carry: ["price"] },
      { lensId: "down-payment", pitch: "How long the down payment actually takes", carry: ["price"] },
    ],
  },
  {
    id: "mortgage",
    path: "/tools/mortgage",
    name: "Mortgage Payment",
    desc: "Full monthly payment parts plus true cost over the life of the loan.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
    inputs: [
      { key: "price", label: "Home price", cfmPath: "housing.targetPrice", writeBack: "targetPrice", fallback: 400000, min: 100000, max: 1500000, step: 5000, format: "currency" },
      { key: "downPayment", label: "Down payment", cfmPath: "housing.downPaymentSaved", writeBack: "downPaymentSaved", fallback: 80000, min: 0, max: 1500000, step: 1000, format: "currency" },
      { key: "rate", label: "Interest rate", cfmPath: "housing.assumedRatePct", writeBack: "assumedRatePct", fallback: 6.5, min: 2, max: 12, step: 0.125, format: "percent" },
      { key: "termYears", label: "Loan term (years)", cfmPath: "housing.termYears", writeBack: "termYears", fallback: 30, min: 10, max: 30, step: 5, format: "years" },
      { key: "taxInsRate", label: "Taxes + insurance (% of price / yr)", cfmPath: "housing.taxInsuranceRatePct", writeBack: "taxInsuranceRatePct", fallback: 1.5, min: 0.5, max: 3, step: 0.1, format: "percent" },
      { key: "hoaMonthly", label: "HOA (monthly)", cfmPath: "housing.hoaMonthly", writeBack: "hoaMonthly", fallback: 0, min: 0, max: 1500, step: 25, format: "currency" },
    ],
    chains: [
      { lensId: "rent-vs-buy", pitch: "Compare buying at this price against staying put", carry: ["price", "rate", "termYears", "hoaMonthly"] },
      { lensId: "affordability", pitch: "Check this payment against your comfort tiers", carry: ["price"] },
    ],
  },
  {
    id: "rent-vs-buy",
    path: "/tools/rent-vs-buy",
    name: "Rent vs. Buy",
    desc: "Five-year cost comparison where timing matters as much as math.",
    ring: "reality",
    accent: "#facc15",
    gate: "plus",
    inputs: [
      { key: "rent", label: "Monthly rent", cfmPath: "housing.currentRent", writeBack: "currentRent", fallback: 2200, min: 500, max: 8000, step: 50, format: "currency" },
      { key: "price", label: "Home price", cfmPath: "housing.targetPrice", writeBack: "targetPrice", fallback: 400000, min: 100000, max: 1500000, step: 5000, format: "currency" },
      { key: "rate", label: "Mortgage rate", cfmPath: "housing.assumedRatePct", writeBack: "assumedRatePct", fallback: 6.5, min: 2, max: 12, step: 0.125, format: "percent" },
    ],
    chains: [
      { lensId: "down-payment", pitch: "Map the savings path to get there", carry: ["price"] },
    ],
  },
  {
    id: "down-payment",
    path: "/tools/down-payment",
    name: "Down Payment Goal",
    desc: "How long it really takes at your actual savings rate.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
    inputs: [
      { key: "price", label: "Target home price", cfmPath: "housing.targetPrice", writeBack: "targetPrice", fallback: 400000, min: 100000, max: 1500000, step: 5000, format: "currency" },
      { key: "saved", label: "Already saved", derive: downPaymentOrSavings, writeBack: "downPaymentSaved", fallback: 15000, min: 0, max: 200000, step: 500, format: "currency" },
      { key: "monthly", label: "Monthly contribution", derive: positiveCashFlow, fallback: 800, min: 0, max: 10000, step: 50, format: "currency" },
    ],
    chains: [
      { lensId: "simulator", pitch: "See what reaching this goal does to readiness", carry: [] },
    ],
  },
  {
    id: "heloc",
    path: "/tools/heloc",
    name: "Home Equity Line",
    desc: "Borrowable equity after combined loan-to-value caps — not paper equity.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
    inputs: [
      { key: "homeValue", label: "Home value", cfmPath: "housing.homeValue", writeBack: "homeValue", fallback: 500000, min: 100000, max: 2000000, step: 5000, format: "currency" },
      { key: "mortgageBalance", label: "Mortgage balance", cfmPath: "housing.currentMortgageBalance", writeBack: "currentMortgageBalance", fallback: 280000, min: 0, max: 2000000, step: 5000, format: "currency" },
    ],
    chains: [
      { lensId: "refinance", pitch: "Check whether a new first loan beats this one", carry: [] },
    ],
  },
  {
    id: "refinance",
    path: "/tools/refinance",
    name: "Refinance Break-Even",
    desc: "When payment savings repay closing costs — and if you’ll still be there.",
    ring: "reality",
    accent: "#facc15",
    gate: "plus",
    inputs: [
      { key: "balance", label: "Loan balance", cfmPath: "housing.currentMortgageBalance", writeBack: "currentMortgageBalance", fallback: 320000, min: 50000, max: 1500000, step: 5000, format: "currency" },
      { key: "currentRate", label: "Current rate", cfmPath: "housing.currentMortgageRatePct", writeBack: "currentMortgageRatePct", fallback: 7.5, min: 2, max: 12, step: 0.125, format: "percent" },
      { key: "newRate", label: "New rate", cfmPath: "housing.assumedRatePct", writeBack: "assumedRatePct", fallback: 6.0, min: 2, max: 12, step: 0.125, format: "percent" },
    ],
    chains: [
      { lensId: "heloc", pitch: "See what equity the new loan leaves available", carry: [] },
    ],
  },
  {
    id: "apr-compare",
    path: "/tools/apr-compare",
    name: "APR Comparison",
    desc: "Three offers ranked by cost-inclusive APR, not just the teaser rate.",
    ring: "reality",
    accent: "#22d3ee",
    gate: "plus",
    inputs: [
      { key: "loan", label: "Loan amount", derive: loanFromOverlay, fallback: 400000, min: 50000, max: 1500000, step: 5000, format: "currency" },
      { key: "termYears", label: "Loan term", cfmPath: "housing.termYears", writeBack: "termYears", fallback: 30, min: 10, max: 30, step: 5, format: "years" },
    ],
    chains: [
      { lensId: "loan-programs", pitch: "Check which loan program fits this amount", carry: [] },
    ],
  },
  {
    id: "loan-programs",
    path: "/tools/loan-programs",
    name: "Loan Programs",
    desc: "Conventional vs FHA vs VA after down payment, MI, and upfront fees.",
    ring: "reality",
    accent: "#34d399",
    gate: "plus",
    inputs: [
      { key: "homePrice", label: "Home price", cfmPath: "housing.targetPrice", writeBack: "targetPrice", fallback: 400000, min: 100000, max: 1500000, step: 5000, format: "currency" },
      { key: "rate", label: "Interest rate", cfmPath: "housing.assumedRatePct", writeBack: "assumedRatePct", fallback: 6.5, min: 3, max: 10, step: 0.125, format: "percent" },
      { key: "termYears", label: "Loan term", cfmPath: "housing.termYears", writeBack: "termYears", fallback: 30, min: 15, max: 30, step: 5, format: "years" },
    ],
    chains: [
      { lensId: "apr-compare", pitch: "Rank real offers for this program by true APR", carry: [] },
    ],
  },

  // --- Stability ---
  {
    id: "runway",
    path: "/tools/runway",
    name: "Emergency Runway",
    desc: "Months of essentials your liquid savings actually cover.",
    ring: "stability",
    accent: "#34d399",
    gate: "free",
    inputs: [
      { key: "expenses", label: "Monthly essential expenses", derive: monthlyOutflow, fallback: 3200, min: 0, max: 20000, step: 50, format: "currency" },
      { key: "savings", label: "Liquid savings", cfmPath: "core.liquidSavings", fallback: 9600, min: 0, max: 200000, step: 500, format: "currency" },
    ],
    chains: [
      { lensId: "debt-payoff", pitch: "Free up outflow by killing a balance", carry: [] },
    ],
  },
  {
    id: "debt-payoff",
    path: "/tools/debt-payoff",
    name: "Debt Payoff",
    desc: "Avalanche vs snowball side by side — interest cost, not slogans.",
    ring: "stability",
    accent: "#fab633",
    gate: "plus",
    chains: [
      { lensId: "runway", pitch: "Watch runway grow as payments disappear", carry: [] },
    ],
  },
  {
    id: "blind-budget",
    path: "/tools/blind-budget",
    name: "Blind Budget",
    desc: "Plan honestly when exact numbers aren’t available yet.",
    ring: "stability",
    accent: "#facc15",
    gate: "plus",
    inputs: [
      { key: "incomeLow", label: "Monthly income (low)", derive: (cfm) => Math.round(cfm.core.monthlyIncome.value * 0.85), fallback: 4500, min: 0, max: 20000, step: 100, format: "currency" },
      { key: "incomeHigh", label: "Monthly income (high)", derive: (cfm) => Math.round(cfm.core.monthlyIncome.value * 1.15), fallback: 6000, min: 0, max: 20000, step: 100, format: "currency" },
      { key: "fixedCostsLow", label: "Monthly fixed costs (low)", derive: (cfm) => Math.round(monthlyOutflow(cfm) * 0.85), fallback: 2200, min: 0, max: 15000, step: 100, format: "currency" },
      { key: "fixedCostsHigh", label: "Monthly fixed costs (high)", derive: (cfm) => Math.round(monthlyOutflow(cfm) * 1.15), fallback: 3000, min: 0, max: 15000, step: 100, format: "currency" },
      { key: "savingsLow", label: "Liquid savings (low)", derive: (cfm) => Math.round(cfm.core.liquidSavings.value * 0.85), fallback: 6000, min: 0, max: 100000, step: 500, format: "currency" },
      { key: "savingsHigh", label: "Liquid savings (high)", derive: (cfm) => Math.round(cfm.core.liquidSavings.value * 1.15), fallback: 10000, min: 0, max: 100000, step: 500, format: "currency" },
    ],
  },

  // --- Perfect Timing (long horizon) ---
  {
    id: "fire",
    path: "/tools/fire",
    name: "FIRE Number",
    desc: "What you’d need invested to live on withdrawals — and coast progress.",
    ring: "timing",
    accent: "#34d399",
    gate: "plus",
    inputs: [
      { key: "annualExpenses", label: "Annual expenses", derive: (cfm) => monthlyOutflow(cfm) * 12, fallback: 48000, min: 12000, max: 200000, step: 1000, format: "currency" },
      { key: "currentSavings", label: "Current invested savings", derive: investedOrMissing, writeBack: "investedAssets", fallback: 85000, min: 0, max: 2000000, step: 1000, format: "currency" },
      { key: "expectedReturnPercent", label: "Expected annual return", cfmPath: "horizon.expectedReturnPct", fallback: 7, min: 2, max: 12, step: 0.5, format: "percent" },
    ],
    chains: [
      { lensId: "monte-carlo", pitch: "Stress-test this path against 10,000 simulated futures", carry: [] },
    ],
  },
  {
    id: "monte-carlo",
    path: "/tools/monte-carlo",
    name: "Monte Carlo Projection",
    desc: "1,000 simulated futures — markets don’t move in a straight line.",
    ring: "timing",
    accent: "#22d3ee",
    gate: "plus",
    inputs: [
      { key: "currentSavings", label: "Current savings", derive: investedOrMissing, writeBack: "investedAssets", fallback: 20000, min: 0, max: 500000, step: 1000, format: "currency" },
      { key: "monthlyContribution", label: "Monthly contribution", derive: (cfm) => { const v = positiveCashFlow(cfm); return v !== undefined ? v : undefined; }, fallback: 600, min: 0, max: 10000, step: 50, format: "currency" },
      { key: "expectedReturn", label: "Expected annual return", cfmPath: "horizon.expectedReturnPct", fallback: 7, min: 0, max: 12, step: 0.5, format: "percent" },
      { key: "volatility", label: "Volatility (annual std dev)", cfmPath: "horizon.volatilityPct", fallback: 15, min: 2, max: 30, step: 1, format: "percent" },
    ],
    chains: [
      { lensId: "fire", pitch: "See the number this path is building toward", carry: [] },
    ],
  },
  {
    id: "roth-conversion",
    path: "/tools/roth-conversion",
    name: "Roth Conversion",
    desc: "Tax cost today versus tax avoided later. Not a recommendation.",
    ring: "timing",
    accent: "#facc15",
    gate: "plus",
    inputs: [
      { key: "currentBalance", label: "Current traditional balance", derive: investedOrMissing, writeBack: "investedAssets", fallback: 120000, min: 0, max: 1000000, step: 5000, format: "currency" },
    ],
  },
];

export function getLens(id: string): LensDefinition | undefined {
  return LENSES.find((l) => l.id === id);
}

export function lensesByRing(ring: LensRing): LensDefinition[] {
  return LENSES.filter((l) => l.ring === ring);
}

/** All CFM paths a lens can seed from — the Companion's coverage input. */
export function lensCoveragePaths(lens: LensDefinition): string[] {
  return (lens.inputs ?? [])
    .map((i) => i.cfmPath)
    .filter((p): p is string => typeof p === "string");
}

/**
 * Resolves a lens's input seeds from the CFM: every input with a cfmPath
 * (backed by real data) or a derive function returns a value clamped to
 * its slider bounds. Inputs without real data are simply absent — the
 * page keeps its illustrative fallback and shows no "your numbers" tag.
 */
export function resolveLensSeeds(
  lens: LensDefinition,
  cfm: CanonicalFinancialModel,
): Record<string, number> {
  const seeds: Record<string, number> = {};
  for (const input of lens.inputs ?? []) {
    let v: number | undefined;
    if (input.derive) {
      v = input.derive(cfm);
    } else if (input.cfmPath) {
      const field = resolveCfmValue(cfm, input.cfmPath);
      if (field.source !== "missing") v = field.value;
    }
    if (v !== undefined && Number.isFinite(v)) {
      seeds[input.key] = Math.min(input.max, Math.max(input.min, v));
    }
  }
  return seeds;
}
