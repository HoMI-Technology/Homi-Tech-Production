/**
 * Roth conversion education math — pure functions. Educational framing
 * only: this compares a tax cost paid today against a tax avoided at a
 * future horizon, in nominal (undiscounted) dollars. It does not model
 * marginal-bracket compounding, state taxes, IRMAA, or any individual
 * circumstance, and it never recommends a conversion.
 */

export interface RothConversionInputs {
  /** Traditional balance being considered for conversion — informational context only. */
  currentBalance: number;
  /** Dollar amount being converted from traditional to Roth. */
  convertAmount: number;
  /** Marginal tax rate applied to the conversion today, e.g. 24. */
  marginalRateNowPercent: number;
  /** Expected marginal tax rate at the point of retirement withdrawal, e.g. 22. */
  expectedRateRetirementPercent: number;
  /** Years between the conversion and the retirement horizon being modeled. */
  yearsToHorizon: number;
  /** Expected annual growth rate applied to the converted balance, e.g. 7. */
  expectedGrowthPercent: number;
}

export interface RothConversionResult {
  /** Tax owed today as a result of the conversion. */
  taxCostToday: number;
  /** The converted amount grown to the horizon, tax-free in a Roth. */
  futureValueAtHorizon: number;
  /** The tax that would have been owed at the horizon had the balance stayed traditional. */
  taxAvoidedAtHorizon: number;
  /** Undiscounted, nominal-dollar comparison: tax avoided later minus tax paid now. */
  netEducationalBenefit: number;
}

export function computeRothConversion(inputs: RothConversionInputs): RothConversionResult {
  const taxCostToday = Math.max(0, inputs.convertAmount) * (inputs.marginalRateNowPercent / 100);
  const growthFactor = Math.pow(
    1 + inputs.expectedGrowthPercent / 100,
    Math.max(0, inputs.yearsToHorizon),
  );
  const futureValueAtHorizon = Math.max(0, inputs.convertAmount) * growthFactor;
  const taxAvoidedAtHorizon = futureValueAtHorizon * (inputs.expectedRateRetirementPercent / 100);
  const netEducationalBenefit = taxAvoidedAtHorizon - taxCostToday;

  return { taxCostToday, futureValueAtHorizon, taxAvoidedAtHorizon, netEducationalBenefit };
}
