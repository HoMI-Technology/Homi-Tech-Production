/**
 * APR comparison across loan offers. Pure functions.
 *
 * A headline note rate hides the true cost once points and fees are financed.
 * The APR spreads those upfront costs across the loan life; comparing APR (not
 * note rate) is the honest way to rank offers. We derive an effective APR by
 * finding the rate whose payment on the base loan equals the actual payment on
 * (loan + financed costs) — the standard "cost-inclusive" APR approximation.
 */

import { monthlyPayment } from "./mortgage";

export interface LoanOffer {
  label: string;
  /** Note (headline) interest rate, annual %. */
  rate: number;
  /** Discount points, % of loan (each point = 1% of loan). */
  points: number;
  /** Flat lender + third-party fees in dollars. */
  fees: number;
}

export interface OfferResult extends LoanOffer {
  monthly: number;
  /** Points + fees in dollars. */
  upfrontCost: number;
  /** Effective APR including points and fees. */
  apr: number;
  /** Total paid over the term (payments + upfront cost). */
  totalCost: number;
}

/** Solve for the APR: the rate on `loan` whose payment matches the true cost. */
function effectiveApr(loan: number, noteRate: number, upfront: number, years: number): number {
  const truePayment = monthlyPayment(loan + upfront, noteRate, years);
  // Binary search the rate on the base loan that reproduces truePayment.
  let lo = 0;
  let hi = 25;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const pmt = monthlyPayment(loan, mid, years);
    if (pmt > truePayment) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function compareOffers(loan: number, termYears: number, offers: LoanOffer[]): OfferResult[] {
  return offers.map((o) => {
    const upfrontCost = (o.points / 100) * loan + o.fees;
    const monthly = monthlyPayment(loan, o.rate, termYears);
    const apr = effectiveApr(loan, o.rate, upfrontCost, termYears);
    return {
      ...o,
      monthly,
      upfrontCost,
      apr,
      totalCost: monthly * termYears * 12 + upfrontCost,
    };
  });
}

/** Index of the lowest-APR offer (the honest winner). */
export function bestOfferIndex(results: OfferResult[]): number {
  let best = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i].apr < results[best].apr) best = i;
  }
  return best;
}
