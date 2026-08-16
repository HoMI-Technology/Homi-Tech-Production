/**
 * Home equity / HELOC math. Pure functions.
 *
 * A lender extends a line up to a maximum combined loan-to-value (CLTV):
 * (existing mortgage balance + new line) / home value ≤ maxCltv. The
 * available line is therefore value*maxCltv − balance, floored at zero.
 */

export interface HelocInputs {
  /** Current appraised home value. */
  homeValue: number;
  /** Outstanding first-mortgage balance. */
  mortgageBalance: number;
  /** Max combined loan-to-value the lender allows, as a fraction (0.80, 0.85, 0.90). */
  maxCltv: number;
  /** Line interest rate, annual % (HELOCs are typically variable). */
  rate: number;
}

export interface HelocResult {
  /** Current equity (value − balance), floored at 0. */
  equity: number;
  /** Fraction of the home you own outright. */
  equityPct: number;
  /** Max total debt the CLTV cap allows against the home. */
  maxTotalDebt: number;
  /** Available line: maxTotalDebt − balance, floored at 0. */
  availableLine: number;
  /** Interest-only monthly cost if the full line is drawn. */
  interestOnlyMonthly: number;
  /** Current CLTV of the existing mortgage alone. */
  currentCltv: number;
}

export function helocAvailability(inputs: HelocInputs): HelocResult {
  const value = Math.max(0, inputs.homeValue);
  const balance = Math.max(0, inputs.mortgageBalance);
  const equity = Math.max(0, value - balance);
  const maxTotalDebt = value * inputs.maxCltv;
  const availableLine = Math.max(0, maxTotalDebt - balance);
  const interestOnlyMonthly = (availableLine * (inputs.rate / 100)) / 12;
  return {
    equity,
    equityPct: value > 0 ? equity / value : 0,
    maxTotalDebt,
    availableLine,
    interestOnlyMonthly,
    currentCltv: value > 0 ? balance / value : 0,
  };
}

/** Availability at each standard CLTV tier, for the comparison view. */
export function helocTiers(
  homeValue: number,
  mortgageBalance: number,
  rate: number,
): { cltv: number; result: HelocResult }[] {
  return [0.8, 0.85, 0.9].map((maxCltv) => ({
    cltv: maxCltv,
    result: helocAvailability({ homeValue, mortgageBalance, maxCltv, rate }),
  }));
}
