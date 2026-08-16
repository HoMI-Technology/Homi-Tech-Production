/**
 * Decision Rehearsal — buy now vs wait 12/24 months.
 * Ported from HōMI production lib/decisions/simulate.ts.
 * Educational modeling only — not financial advice.
 */

export interface SimulationInputs {
  homePrice: number;
  downPaymentSaved: number;
  monthlySavings: number;
  rent: number;
  rate: number;
  appreciation: number;
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
  netPositionAt60: number;
  series: MonthPoint[];
}

const LOAN_TERM_MONTHS = 360;
const CLOSING_COST_RATE = 0.03;
const MAINTENANCE_RATE_ANNUAL = 0.01;

function monthlyPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

function remainingBalance(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  monthsElapsed: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) {
    return Math.max(principal - (principal / termMonths) * monthsElapsed, 0);
  }
  const payment = monthlyPayment(principal, annualRatePct, termMonths);
  const balance =
    principal * Math.pow(1 + r, monthsElapsed) -
    payment * ((Math.pow(1 + r, monthsElapsed) - 1) / r);
  return Math.max(balance, 0);
}

function simulateBuyNow(inputs: SimulationInputs, months: number): MonthPoint[] {
  const { homePrice, downPaymentSaved, rate, appreciation } = inputs;
  const closingCosts = homePrice * CLOSING_COST_RATE;
  const loanPrincipal = Math.max(homePrice - downPaymentSaved, 0);
  const monthlyAppreciation = appreciation / 100 / 12;
  const monthlyMaintenance = (homePrice * MAINTENANCE_RATE_ANNUAL) / 12;

  const series: MonthPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const homeValue = homePrice * Math.pow(1 + monthlyAppreciation, m);
    const balance = remainingBalance(
      loanPrincipal,
      rate,
      LOAN_TERM_MONTHS,
      m,
    );
    const equity = homeValue - balance;
    const cumulativeMaintenance = monthlyMaintenance * m;
    const netPosition = equity - closingCosts - cumulativeMaintenance;
    series.push({ month: m, netPosition: Math.round(netPosition) });
  }
  return series;
}

function simulateWait(
  inputs: SimulationInputs,
  waitMonths: number,
  totalMonths: number,
): MonthPoint[] {
  const {
    homePrice,
    downPaymentSaved,
    monthlySavings,
    rent,
    rate,
    appreciation,
    rentIncrease,
  } = inputs;
  const monthlyAppreciation = appreciation / 100 / 12;
  const monthlyRentIncrease = rentIncrease / 100 / 12;

  const series: MonthPoint[] = [];
  let cumulativeRent = 0;
  let currentRent = rent;

  const priceAtPurchase =
    homePrice * Math.pow(1 + monthlyAppreciation, waitMonths);
  const savingsAtPurchase = downPaymentSaved + monthlySavings * waitMonths;
  const downPaymentAtPurchase = Math.min(savingsAtPurchase, priceAtPurchase);
  const closingCostsAtPurchase = priceAtPurchase * CLOSING_COST_RATE;
  const loanPrincipalAtPurchase = Math.max(
    priceAtPurchase - downPaymentAtPurchase,
    0,
  );
  const monthlyMaintenance =
    (priceAtPurchase * MAINTENANCE_RATE_ANNUAL) / 12;

  for (let m = 0; m <= totalMonths; m++) {
    if (m > 0) {
      cumulativeRent += currentRent;
      currentRent = currentRent * (1 + monthlyRentIncrease);
    }

    if (m < waitMonths) {
      const savingsSoFar = downPaymentSaved + monthlySavings * m;
      series.push({
        month: m,
        netPosition: Math.round(savingsSoFar - cumulativeRent),
      });
    } else {
      const monthsSincePurchase = m - waitMonths;
      const homeValue =
        priceAtPurchase *
        Math.pow(1 + monthlyAppreciation, monthsSincePurchase);
      const balance = remainingBalance(
        loanPrincipalAtPurchase,
        rate,
        LOAN_TERM_MONTHS,
        monthsSincePurchase,
      );
      const equity = homeValue - balance;
      const cumulativeMaintenance = monthlyMaintenance * monthsSincePurchase;
      series.push({
        month: m,
        netPosition: Math.round(
          equity - closingCostsAtPurchase - cumulativeMaintenance - cumulativeRent,
        ),
      });
    }
  }
  return series;
}

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  "buy-now": "Buy now",
  "wait-12": "Wait 12 months",
  "wait-24": "Wait 24 months",
};

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

export function simulateAllScenarios(
  inputs: SimulationInputs,
  months = 60,
): ScenarioOutcome[] {
  return (["buy-now", "wait-12", "wait-24"] as ScenarioKey[]).map((key) =>
    simulateScenario(key, inputs, months),
  );
}

export const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  homePrice: 400_000,
  downPaymentSaved: 40_000,
  monthlySavings: 1_500,
  rent: 1_850,
  rate: 6.5,
  appreciation: 3.5,
  rentIncrease: 4,
};
