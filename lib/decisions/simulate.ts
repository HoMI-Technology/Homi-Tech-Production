/**
 * Decision Rehearsal — pure simulation functions comparing the 5-year net
 * financial position of buying now vs. waiting 12 or 24 months. No side
 * effects, deterministic, testable in isolation. Educational modeling only
 * — not financial advice.
 */

export interface SimulationInputs {
  /** Current home price, dollars. */
  homePrice: number;
  /** Down payment already saved, dollars. */
  downPaymentSaved: number;
  /** Additional monthly savings capacity, dollars/month. */
  monthlySavings: number;
  /** Current monthly rent, dollars. */
  rent: number;
  /** Expected mortgage interest rate, percent (e.g. 6.5). */
  rate: number;
  /** Expected annual home price appreciation, percent (e.g. 3.5). */
  appreciation: number;
  /** Expected annual rent increase, percent (e.g. 4). */
  rentIncrease: number;
}

export type ScenarioKey = "buy-now" | "wait-12" | "wait-24";

export interface MonthPoint {
  month: number;
  netPosition: number;
}

export interface ScenarioOutcome {
  key: ScenarioKey;
  label: string;
  /** Net position (equity - remaining costs, or savings net of rent) at month 60 from today. */
  netPositionAt60: number;
  /** Month-by-month net position from today (month 0) through month 60. */
  series: MonthPoint[];
}

const LOAN_TERM_MONTHS = 360; // 30-year mortgage, standard assumption for amortization.
const CLOSING_COST_RATE = 0.03; // Simplified closing costs as % of home price.
const MAINTENANCE_RATE_ANNUAL = 0.01; // Simplified annual maintenance as % of home value.

/** Monthly amortizing payment for a fixed-rate loan. */
function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/** Remaining loan balance after `monthsElapsed` payments. */
function remainingBalance(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  monthsElapsed: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.max(principal - (principal / termMonths) * monthsElapsed, 0);
  const payment = monthlyPayment(principal, annualRatePct, termMonths);
  const balance =
    principal * Math.pow(1 + r, monthsElapsed) -
    payment * ((Math.pow(1 + r, monthsElapsed) - 1) / r);
  return Math.max(balance, 0);
}

/**
 * Simulates buying now: tracks home value growth (monthly-compounded
 * appreciation) minus remaining loan balance (equity), minus cumulative
 * ownership costs (maintenance) already paid out of pocket, minus the
 * upfront closing costs. Down payment capital is treated as already spent
 * (it becomes home equity, not idle savings).
 */
function simulateBuyNow(inputs: SimulationInputs, months: number): MonthPoint[] {
  const { homePrice, downPaymentSaved, rate, appreciation } = inputs;
  const closingCosts = homePrice * CLOSING_COST_RATE;
  const loanPrincipal = Math.max(homePrice - downPaymentSaved, 0);
  const monthlyAppreciation = appreciation / 100 / 12;
  const monthlyMaintenance = (homePrice * MAINTENANCE_RATE_ANNUAL) / 12;

  const series: MonthPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const homeValue = homePrice * Math.pow(1 + monthlyAppreciation, m);
    const balance = remainingBalance(loanPrincipal, rate, LOAN_TERM_MONTHS, m);
    const equity = homeValue - balance;
    const cumulativeMaintenance = monthlyMaintenance * m;
    const netPosition = equity - closingCosts - cumulativeMaintenance;
    series.push({ month: m, netPosition: Math.round(netPosition) });
  }
  return series;
}

/**
 * Simulates waiting `waitMonths` before buying: during the wait, the buyer
 * keeps renting (paying increasing rent, a sunk cost) while stacking
 * monthly savings into a larger down payment. After the wait period, they
 * buy at the (appreciated) future price with the larger down payment,
 * amortizing from that point forward. Net position at any month t is:
 *   - during the wait: -(cumulative rent paid) + (savings accumulated, since
 *     savings still belong to the buyer as liquid net worth)
 *   - after the wait: (home equity at that point) - closing costs -
 *     cumulative maintenance - cumulative rent paid during the wait
 *     (rent is a real cost already incurred, so it remains a permanent drag
 *     on net position, same as buy-now's closing costs).
 */
function simulateWait(
  inputs: SimulationInputs,
  waitMonths: number,
  totalMonths: number,
): MonthPoint[] {
  const { homePrice, downPaymentSaved, monthlySavings, rent, rate, appreciation, rentIncrease } =
    inputs;
  const monthlyAppreciation = appreciation / 100 / 12;
  const monthlyRentIncrease = rentIncrease / 100 / 12;

  const series: MonthPoint[] = [];
  let cumulativeRent = 0;
  let currentRent = rent;

  // Pre-compute price and down payment at the moment of purchase.
  const priceAtPurchase = homePrice * Math.pow(1 + monthlyAppreciation, waitMonths);
  const savingsAtPurchase = downPaymentSaved + monthlySavings * waitMonths;
  const downPaymentAtPurchase = Math.min(savingsAtPurchase, priceAtPurchase);
  const closingCostsAtPurchase = priceAtPurchase * CLOSING_COST_RATE;
  const loanPrincipalAtPurchase = Math.max(priceAtPurchase - downPaymentAtPurchase, 0);
  const monthlyMaintenance = (priceAtPurchase * MAINTENANCE_RATE_ANNUAL) / 12;

  for (let m = 0; m <= totalMonths; m++) {
    if (m > 0) {
      cumulativeRent += currentRent;
      currentRent = currentRent * (1 + monthlyRentIncrease);
    }

    if (m < waitMonths) {
      // Still renting: net worth is liquid savings accumulated so far, minus rent paid (a real cost).
      const savingsSoFar = downPaymentSaved + monthlySavings * m;
      const netPosition = savingsSoFar - cumulativeRent;
      series.push({ month: m, netPosition: Math.round(netPosition) });
    } else {
      const monthsSincePurchase = m - waitMonths;
      const homeValue = priceAtPurchase * Math.pow(1 + monthlyAppreciation, monthsSincePurchase);
      const balance = remainingBalance(
        loanPrincipalAtPurchase,
        rate,
        LOAN_TERM_MONTHS,
        monthsSincePurchase,
      );
      const equity = homeValue - balance;
      const cumulativeMaintenance = monthlyMaintenance * monthsSincePurchase;
      const netPosition = equity - closingCostsAtPurchase - cumulativeMaintenance - cumulativeRent;
      series.push({ month: m, netPosition: Math.round(netPosition) });
    }
  }
  return series;
}

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  "buy-now": "Buy the home",
  "wait-12": "Wait 12 months",
  "wait-24": "Wait 24 months",
};

/** Simulates a single scenario over `months` (default 60 = 5 years). */
export function simulateScenario(
  key: ScenarioKey,
  inputs: SimulationInputs,
  months = 60,
): ScenarioOutcome {
  const series =
    key === "buy-now"
      ? simulateBuyNow(inputs, months)
      : simulateWait(inputs, key === "wait-12" ? 12 : 24, months);
  const netPositionAt60 = series[series.length - 1]?.netPosition ?? 0;
  return { key, label: SCENARIO_LABELS[key], netPositionAt60, series };
}

/** Simulates all three scenarios at once for side-by-side comparison. */
export function simulateAllScenarios(inputs: SimulationInputs, months = 60): ScenarioOutcome[] {
  return (["buy-now", "wait-12", "wait-24"] as ScenarioKey[]).map((key) =>
    simulateScenario(key, inputs, months),
  );
}

export const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  homePrice: 400_000,
  downPaymentSaved: 40_000,
  monthlySavings: 1_500,
  rent: 2_200,
  rate: 6.5,
  appreciation: 3.5,
  rentIncrease: 4,
};
