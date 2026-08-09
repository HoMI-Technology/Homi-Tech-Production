/**
 * Mortgage affordability math — PITI (Principal, Interest, Taxes, Insurance).
 * Pure functions, no side effects.
 */

/** Standard amortized monthly payment (principal + interest only). */
export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const n = years * 12;
  if (n <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export interface AffordabilityInputs {
  /** Gross annual household income. */
  annualIncome: number;
  /** Existing monthly debt payments (car, student loans, credit cards, etc). */
  monthlyDebts: number;
  /** Mortgage interest rate, annual percentage (e.g. 6.5). */
  rate: number;
  /** Loan term in years. */
  termYears: number;
  /** Estimated annual property taxes + insurance as a fraction of home price (e.g. 0.015 = 1.5%). */
  taxInsuranceRate: number;
  /** Down payment available in dollars. */
  downPayment: number;
}

export interface AffordabilityTier {
  label: string;
  ratio: number;
  maxPrice: number;
  maxMonthlyHousing: number;
  loanAmount: number;
}

/**
 * Solves for the max home price such that monthly PITI equals
 * `ratio` * gross monthly income, net of other debts pulled from the
 * front-end budget (front-end ratio applied to housing alone; debts are
 * informational context, not subtracted from the housing ratio itself —
 * lenders use back-end DTI for that, which this tool does not gate).
 *
 * Solved by binary search since taxInsuranceRate is a function of price,
 * making the closed form awkward with the amortization formula.
 */
export function maxPriceForRatio(inputs: AffordabilityInputs, ratio: number): AffordabilityTier {
  const monthlyIncome = inputs.annualIncome / 12;
  const maxMonthlyHousing = monthlyIncome * ratio;

  let lo = 0;
  let hi = 5_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const loanAmount = Math.max(0, mid - inputs.downPayment);
    const pAndI = monthlyPayment(loanAmount, inputs.rate, inputs.termYears);
    const taxIns = (mid * inputs.taxInsuranceRate) / 12;
    const total = pAndI + taxIns;
    if (total > maxMonthlyHousing) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const maxPrice = lo;
  const loanAmount = Math.max(0, maxPrice - inputs.downPayment);

  return {
    label: "",
    ratio,
    maxPrice,
    maxMonthlyHousing,
    loanAmount,
  };
}

export interface AffordabilityResult {
  protected: AffordabilityTier;
  stretch: AffordabilityTier;
  redLine: AffordabilityTier;
  monthlyIncome: number;
}

/** Computes the three affordability tiers used in the affordability calculator. */
export function computeAffordability(inputs: AffordabilityInputs): AffordabilityResult {
  const protectedTier = { ...maxPriceForRatio(inputs, 0.28), label: "Protected" };
  const stretchTier = { ...maxPriceForRatio(inputs, 0.33), label: "Stretch" };
  const redLineTier = { ...maxPriceForRatio(inputs, 0.36), label: "Red Line" };

  return {
    protected: protectedTier,
    stretch: stretchTier,
    redLine: redLineTier,
    monthlyIncome: inputs.annualIncome / 12,
  };
}

export interface PaymentBreakdown {
  principalAndInterest: number;
  taxesAndInsurance: number;
  total: number;
}

/** Breaks a given home price into its monthly PITI components. */
export function paymentBreakdown(
  price: number,
  inputs: Pick<AffordabilityInputs, "rate" | "termYears" | "taxInsuranceRate" | "downPayment">,
): PaymentBreakdown {
  const loanAmount = Math.max(0, price - inputs.downPayment);
  const pAndI = monthlyPayment(loanAmount, inputs.rate, inputs.termYears);
  const taxIns = (price * inputs.taxInsuranceRate) / 12;
  return {
    principalAndInterest: pAndI,
    taxesAndInsurance: taxIns,
    total: pAndI + taxIns,
  };
}

export interface FullPaymentBreakdown {
  principalAndInterest: number;
  taxesAndInsurance: number;
  hoa: number;
  total: number;
}

/** Breaks a home price into full PITI + HOA monthly components. */
export function fullPaymentBreakdown(
  price: number,
  inputs: Pick<AffordabilityInputs, "rate" | "termYears" | "taxInsuranceRate" | "downPayment"> & {
    hoaMonthly?: number;
  },
): FullPaymentBreakdown {
  const base = paymentBreakdown(price, inputs);
  const hoa = Math.max(0, inputs.hoaMonthly ?? 0);
  return {
    principalAndInterest: base.principalAndInterest,
    taxesAndInsurance: base.taxesAndInsurance,
    hoa,
    total: base.total + hoa,
  };
}

export interface AmortizationSummary {
  monthlyPrincipalAndInterest: number;
  totalPayments: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffDate: Date;
}

/**
 * Amortization totals for a fixed-rate loan — no month-by-month schedule,
 * just the honest summary: how much interest you'll pay in total, and when
 * the loan is actually paid off if you started today.
 */
export function amortizationSummary(
  loanAmount: number,
  annualRate: number,
  years: number,
  startDate: Date = new Date(),
): AmortizationSummary {
  const monthlyPrincipalAndInterest = monthlyPayment(loanAmount, annualRate, years);
  const totalPayments = Math.max(0, Math.round(years * 12));
  const totalPaid = monthlyPrincipalAndInterest * totalPayments;
  const totalInterestPaid = Math.max(0, totalPaid - loanAmount);
  const payoffDate = new Date(startDate.getTime());
  payoffDate.setMonth(payoffDate.getMonth() + totalPayments);

  return { monthlyPrincipalAndInterest, totalPayments, totalInterestPaid, totalPaid, payoffDate };
}
