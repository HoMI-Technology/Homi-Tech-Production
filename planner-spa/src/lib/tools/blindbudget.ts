/**
 * Blind Budget math — plan without knowing your exact numbers. Every input
 * is a range, not a point estimate; every output is a range too. Precision
 * isn't required for honesty: a wide band you actually believe is more
 * useful than a false-precise number you don't.
 */

export interface BlindBudgetInputs {
  incomeLow: number;
  incomeHigh: number;
  fixedCostsLow: number;
  fixedCostsHigh: number;
  savingsLow: number;
  savingsHigh: number;
}

export interface BlindBudgetResult {
  /** Worst case: least income, most fixed costs. */
  safeToSpendLow: number;
  /** Best case: most income, least fixed costs. */
  safeToSpendHigh: number;
  /** Worst case: least savings stretched against the highest fixed costs. */
  runwayLowMonths: number;
  /** Best case: most savings stretched against the lowest fixed costs. */
  runwayHighMonths: number;
}

export function computeBlindBudget(inputs: BlindBudgetInputs): BlindBudgetResult {
  const safeToSpendLow = Math.max(0, inputs.incomeLow - inputs.fixedCostsHigh);
  const safeToSpendHigh = Math.max(0, inputs.incomeHigh - inputs.fixedCostsLow);

  const runwayLowMonths = inputs.fixedCostsHigh > 0 ? Math.max(0, inputs.savingsLow) / inputs.fixedCostsHigh : 0;
  const runwayHighMonths = inputs.fixedCostsLow > 0 ? Math.max(0, inputs.savingsHigh) / inputs.fixedCostsLow : 0;

  return { safeToSpendLow, safeToSpendHigh, runwayLowMonths, runwayHighMonths };
}
