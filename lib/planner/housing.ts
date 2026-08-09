/* ------------------------------------------------------------------ */
/* Rent-vs-buy housing lens — deterministic CFM housing math.          */
/*                                                                     */
/* Ported from the reference planner housing.ts (lib audit #7: PORT,  */
/* wave 3 — the whole lens is novel; canon tools/mortgage.ts is       */
/* affordability only). Pure module: no store imports.                 */
/*                                                                     */
/* PITI comes from ./cfm estimateHousingPayment (import, never        */
/* re-implemented). The lens gates are internally consistent with      */
/* canon: the 45% housing ratio is the hard-stop line (score.ts        */
/* HOUSING_RATIO_OVER_45) and 36% is the elevated-stretch line.        */
/* ------------------------------------------------------------------ */

import { estimateHousingPayment } from "./cfm";

export interface HousingLensInput {
  targetPrice: number;
  downPaymentSaved: number;
  ratePct: number;
  termYears: number;
  taxInsuranceRatePct: number;
  hoaMonthly: number;
  currentRent: number;
  monthlyIncome: number;
  liquidSavings: number;
  netCashFlow: number;
  /** Expected home appreciation annual % (default 3) */
  appreciationPct?: number;
  /** Opportunity cost of down payment annual % (default 6) */
  opportunityPct?: number;
  /** Years to project cumulative cost (default 5) */
  horizonYears?: number;
}

export interface HousingLensResult {
  loanAmount: number;
  monthlyPi: number;
  monthlyHousing: number;
  housingRatioPct: number;
  rentMonthly: number;
  monthlyDelta: number; // buy - rent (positive = buy costs more/mo)
  fiveYearBuy: number;
  fiveYearRent: number;
  fiveYearDelta: number;
  equityAtHorizon: number;
  opportunityCost: number;
  breakEvenYears: number | null;
  downPaymentGap: number;
  canCoverDown: boolean;
  runwayHitMonths: number | null;
  verdict: "rent_clearer" | "buy_competitive" | "buy_stretch" | "blocked";
  headline: string;
  notes: string[];
}

function principalAndInterest(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r <= 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function computeHousingLens(input: HousingLensInput): HousingLensResult {
  const horizon = input.horizonYears ?? 5;
  const appr = (input.appreciationPct ?? 3) / 100;
  const opp = (input.opportunityPct ?? 6) / 100;

  const loanAmount = Math.max(0, input.targetPrice - input.downPaymentSaved);
  const monthlyPi = principalAndInterest(loanAmount, input.ratePct, input.termYears);
  const monthlyHousing = estimateHousingPayment({
    targetPrice: input.targetPrice,
    downPaymentSaved: input.downPaymentSaved,
    ratePct: input.ratePct,
    termYears: input.termYears,
    taxInsuranceRatePct: input.taxInsuranceRatePct,
    hoaMonthly: input.hoaMonthly,
  });
  const housingRatioPct =
    input.monthlyIncome > 0 ? (monthlyHousing / input.monthlyIncome) * 100 : 0;
  const rentMonthly = input.currentRent;
  const monthlyDelta = monthlyHousing - rentMonthly;

  const months = horizon * 12;
  const fiveYearBuy = monthlyHousing * months;
  const fiveYearRent = rentMonthly * months;

  // Rough equity: down payment + principal paydown approximation + appreciation
  let balance = loanAmount;
  let paidPrincipal = 0;
  const r = input.ratePct / 100 / 12;
  for (let m = 0; m < months && balance > 0; m++) {
    const interest = balance * r;
    const principal = Math.min(balance, monthlyPi - interest);
    if (principal > 0) {
      balance -= principal;
      paidPrincipal += principal;
    }
  }
  const homeValue = input.targetPrice * Math.pow(1 + appr, horizon);
  const equityAtHorizon = homeValue - balance;
  const opportunityCost = input.downPaymentSaved * (Math.pow(1 + opp, horizon) - 1);
  const fiveYearDelta = fiveYearBuy - fiveYearRent - paidPrincipal + opportunityCost;

  // Break-even: months until cumulative (rent - buy + equity build) flips.
  // Scan is capped at 30 years.
  let breakEvenYears: number | null = null;
  {
    let cum = 0;
    let bal = loanAmount;
    for (let m = 1; m <= 30 * 12; m++) {
      const interest = bal * r;
      const prin = Math.min(bal, Math.max(0, monthlyPi - interest));
      bal -= prin;
      const hv = input.targetPrice * Math.pow(1 + appr, m / 12) - bal;
      // monthly cash delta (buy more expensive is negative for buy)
      cum += rentMonthly - monthlyHousing;
      // equity credit rough
      const equityCredit = hv - input.downPaymentSaved;
      if (cum + equityCredit - opportunityCost * (m / (horizon * 12)) >= 0) {
        breakEvenYears = Math.round((m / 12) * 10) / 10;
        break;
      }
    }
  }

  const downPaymentGap = Math.max(0, input.targetPrice * 0.2 - input.downPaymentSaved);
  const canCoverDown = input.downPaymentSaved >= input.targetPrice * 0.05;
  const cashDrain = monthlyHousing - rentMonthly;
  const runwayHitMonths =
    cashDrain > 0 && input.liquidSavings > 0
      ? Math.round((input.liquidSavings / cashDrain) * 10) / 10
      : null;

  const notes: string[] = [];
  if (housingRatioPct > 45) {
    notes.push("Housing would consume >45% of income — hard-stop territory.");
  } else if (housingRatioPct > 36) {
    notes.push("Housing ratio above 36% — elevated stretch.");
  }
  if (monthlyDelta > 0) {
    notes.push(`Buy costs ${fmt(monthlyDelta)} more per month than current rent.`);
  } else {
    notes.push(
      `Buy is ${fmt(Math.abs(monthlyDelta))} cheaper per month than rent on these inputs.`,
    );
  }
  if (downPaymentGap > 0) {
    notes.push(`${fmt(downPaymentGap)} still needed to reach a 20% down payment.`);
  }
  if (input.netCashFlow < monthlyDelta && monthlyDelta > 0) {
    notes.push("Cash-flow margin may not absorb the buy premium without cuts.");
  }

  let verdict: HousingLensResult["verdict"] = "buy_competitive";
  if (housingRatioPct > 45 || !canCoverDown) verdict = "blocked";
  else if (housingRatioPct > 36 || monthlyDelta > input.netCashFlow) verdict = "buy_stretch";
  else if (monthlyDelta > 400 || (breakEvenYears != null && breakEvenYears > 8))
    verdict = "rent_clearer";
  else verdict = "buy_competitive";

  const headline =
    verdict === "blocked"
      ? "Protection first — buy is blocked on these numbers."
      : verdict === "buy_stretch"
        ? "Buy is possible but stretched. Know the monthly price of the stretch."
        : verdict === "rent_clearer"
          ? "Rent stays clearer on cash flow for now. Build down payment and margin."
          : "Buy is competitive with rent on this lens — still verify local reality.";

  return {
    loanAmount,
    monthlyPi,
    monthlyHousing,
    housingRatioPct,
    rentMonthly,
    monthlyDelta,
    fiveYearBuy,
    fiveYearRent,
    fiveYearDelta,
    equityAtHorizon,
    opportunityCost,
    breakEvenYears,
    downPaymentGap,
    canCoverDown,
    runwayHitMonths,
    verdict,
    headline,
    notes,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
