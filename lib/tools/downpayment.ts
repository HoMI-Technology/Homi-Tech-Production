/**
 * Down-payment goal planner — pure math for the Tools lens.
 * goal = targetPrice * (percent/100); remaining = max(0, goal - current);
 * months = ceil(remaining / monthlyContribution) when contribution > 0.
 */

export type DownPaymentInput = {
  targetPrice: number;
  /** 0–100 */
  percent: number;
  currentSavings: number;
  monthlyContribution: number;
};

export type DownPaymentPlan = {
  goalAmount: number;
  remaining: number;
  /** Null when the goal is unfunded and no contribution is set. */
  months: number | null;
  funded: boolean;
};

function finiteNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function computeDownPaymentPlan(input: DownPaymentInput): DownPaymentPlan {
  const targetPrice = finiteNonNeg(input.targetPrice);
  const percent = Math.min(100, Math.max(0, finiteNonNeg(input.percent)));
  const currentSavings = finiteNonNeg(input.currentSavings);
  const monthlyContribution = finiteNonNeg(input.monthlyContribution);

  const goalAmount = (targetPrice * percent) / 100;
  const remaining = Math.max(0, goalAmount - currentSavings);
  const funded = remaining <= 0;

  if (funded) {
    return { goalAmount, remaining: 0, months: 0, funded: true };
  }
  if (monthlyContribution <= 0) {
    return { goalAmount, remaining, months: null, funded: false };
  }
  const months = Math.ceil(remaining / monthlyContribution);
  return { goalAmount, remaining, months, funded: false };
}
