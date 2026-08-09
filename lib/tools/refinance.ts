/**
 * Mortgage refinance break-even math. Pure functions.
 *
 * Refinancing trades closing costs today for a lower monthly payment. The
 * break-even is the month at which cumulative payment savings exceed the
 * closing costs. Beyond that point the refi is net-positive; before it,
 * you'd lose money if you sold or refinanced again.
 */

import { monthlyPayment } from "./mortgage";

export interface RefinanceInputs {
  /** Remaining balance on the current loan. */
  balance: number;
  /** Current loan's interest rate, annual %. */
  currentRate: number;
  /** Years remaining on the current loan. */
  currentTermYears: number;
  /** New loan's interest rate, annual %. */
  newRate: number;
  /** New loan's term in years. */
  newTermYears: number;
  /** Closing costs to refinance (points, fees, title). */
  closingCosts: number;
}

export interface RefinanceResult {
  currentMonthly: number;
  newMonthly: number;
  monthlySavings: number;
  /** Months to recover closing costs from payment savings (null if no savings). */
  breakEvenMonths: number | null;
  /** Lifetime interest on each loan, and the delta. */
  currentLifetimeInterest: number;
  newLifetimeInterest: number;
  lifetimeInterestDelta: number;
}

function lifetimeInterest(balance: number, rate: number, years: number): number {
  const pmt = monthlyPayment(balance, rate, years);
  return pmt * years * 12 - balance;
}

export function analyzeRefinance(inputs: RefinanceInputs): RefinanceResult {
  const currentMonthly = monthlyPayment(
    inputs.balance,
    inputs.currentRate,
    inputs.currentTermYears,
  );
  const newMonthly = monthlyPayment(inputs.balance, inputs.newRate, inputs.newTermYears);
  const monthlySavings = currentMonthly - newMonthly;

  const breakEvenMonths =
    monthlySavings > 0 ? Math.ceil(inputs.closingCosts / monthlySavings) : null;

  const currentLifetimeInterest = lifetimeInterest(
    inputs.balance,
    inputs.currentRate,
    inputs.currentTermYears,
  );
  const newLifetimeInterest = lifetimeInterest(inputs.balance, inputs.newRate, inputs.newTermYears);

  return {
    currentMonthly,
    newMonthly,
    monthlySavings,
    breakEvenMonths,
    currentLifetimeInterest,
    newLifetimeInterest,
    // Positive = the refi saves lifetime interest; includes closing costs.
    lifetimeInterestDelta: currentLifetimeInterest - newLifetimeInterest - inputs.closingCosts,
  };
}
