/**
 * FIRE (Financial Independence, Retire Early) math — pure functions.
 * Chart-free by design: this tool is about two clean numbers, not a curve.
 */

/** Classic FIRE number: annual expenses divided by a safe withdrawal rate. */
export function computeFireNumber(annualExpenses: number, swrPercent: number): number {
  if (swrPercent <= 0) return 0;
  return Math.max(0, annualExpenses) / (swrPercent / 100);
}

export interface CoastFireInputs {
  annualExpenses: number;
  swrPercent: number;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  expectedReturnPercent: number;
}

export interface CoastFireResult {
  fireNumber: number;
  yearsToRetirement: number;
  /** Amount that would need to be invested today, with no further contributions, to reach the FIRE number by retirement age. */
  coastFireNumberNeededNow: number;
  /** True if current savings already meet or exceed the coast number. */
  isCoastFire: boolean;
  /** Current savings grown at the expected return, with no further contributions, to retirement age. */
  projectedAtRetirement: number;
  /**
   * Age at which current savings, growing at the expected return with no
   * further contributions, would reach the full FIRE number. Null when
   * current savings are zero or non-positive (no coast trajectory exists).
   */
  coastFireAge: number | null;
}

/** Coast-FIRE math: when do today's savings alone carry you to your number? */
export function computeCoastFire(inputs: CoastFireInputs): CoastFireResult {
  const fireNumber = computeFireNumber(inputs.annualExpenses, inputs.swrPercent);
  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const r = inputs.expectedReturnPercent / 100;
  const growthFactor = Math.pow(1 + r, yearsToRetirement);

  const coastFireNumberNeededNow = growthFactor > 0 ? fireNumber / growthFactor : fireNumber;
  const projectedAtRetirement = inputs.currentSavings * growthFactor;
  const isCoastFire = inputs.currentSavings >= coastFireNumberNeededNow;

  let coastFireAge: number | null = null;
  if (inputs.currentSavings > 0 && fireNumber > 0) {
    if (inputs.currentSavings >= fireNumber) {
      coastFireAge = inputs.currentAge;
    } else if (r > 0) {
      const yearsNeeded = Math.log(fireNumber / inputs.currentSavings) / Math.log(1 + r);
      coastFireAge = inputs.currentAge + yearsNeeded;
    }
  }

  return {
    fireNumber,
    yearsToRetirement,
    coastFireNumberNeededNow,
    isCoastFire,
    projectedAtRetirement,
    coastFireAge,
  };
}
