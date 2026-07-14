/**
 * Loan program comparison — Conventional vs FHA vs VA. Pure functions.
 *
 * The three differ in minimum down payment, mortgage insurance, and upfront
 * fees, which changes the real monthly cost and cash-to-close well beyond the
 * note rate. Figures are the standard 2026 program rules; treat as educational,
 * not a lender quote.
 */

import { monthlyPayment } from "./mortgage";

export type Program = "conventional" | "fha" | "va";

export interface ProgramInputs {
  homePrice: number;
  /** Down payment in dollars (VA allows 0). */
  downPayment: number;
  /** Note rate, annual %. */
  rate: number;
  termYears: number;
  /** For conventional PMI and VA funding fee tiers; VA funding fee is lower for subsequent use. */
  firstTimeUse?: boolean;
}

export interface ProgramResult {
  program: Program;
  label: string;
  loanAmount: number;
  ltv: number;
  /** Financed upfront fee (FHA UFMIP / VA funding fee) added to the loan. */
  upfrontFeeFinanced: number;
  principalAndInterest: number;
  /** Monthly mortgage insurance (FHA MIP / conventional PMI); VA has none. */
  monthlyInsurance: number;
  monthlyTotal: number;
  /** Whether the mortgage insurance ever falls off. */
  insuranceRemovable: boolean;
  note: string;
}

// Conventional PMI annual rate by LTV band (approx, credit-720 tier).
function conventionalPmiRate(ltv: number): number {
  if (ltv <= 0.8) return 0;
  if (ltv <= 0.85) return 0.005;
  if (ltv <= 0.9) return 0.007;
  if (ltv <= 0.95) return 0.009;
  return 0.011;
}

export function evaluateProgram(program: Program, inputs: ProgramInputs): ProgramResult {
  const { homePrice, rate, termYears } = inputs;
  let down = Math.max(0, inputs.downPayment);
  let baseLoan = Math.max(0, homePrice - down);
  let upfrontFeeFinanced = 0;
  let monthlyInsurance = 0;
  let insuranceRemovable = false;
  let label = "";
  let note = "";

  if (program === "conventional") {
    label = "Conventional";
    const ltv = homePrice > 0 ? baseLoan / homePrice : 0;
    const pmiRate = conventionalPmiRate(ltv);
    monthlyInsurance = (baseLoan * pmiRate) / 12;
    insuranceRemovable = pmiRate > 0; // PMI cancels at 78–80% LTV.
    note =
      pmiRate > 0
        ? "PMI applies until you reach ~20% equity, then it cancels — the cheapest long-run option once you're there."
        : "20%+ down means no PMI at all.";
  } else if (program === "fha") {
    label = "FHA";
    // 3.5% minimum down; 1.75% UFMIP financed; annual MIP ~0.55% (>90% LTV, 30yr).
    const minDown = homePrice * 0.035;
    if (down < minDown) down = minDown;
    baseLoan = Math.max(0, homePrice - down);
    upfrontFeeFinanced = baseLoan * 0.0175;
    const loanWithUfmip = baseLoan + upfrontFeeFinanced;
    monthlyInsurance = (loanWithUfmip * 0.0055) / 12;
    insuranceRemovable = false; // MIP is life-of-loan at low down payments.
    note =
      "Lowest barrier to entry (3.5% down), but MIP is life-of-loan at low down payments — you'd refinance out to drop it.";
  } else {
    label = "VA";
    // 0% down allowed; no monthly MI; funding fee 2.15% first use / 3.3% subsequent (financed).
    const fundingFeeRate = inputs.firstTimeUse === false ? 0.033 : 0.0215;
    upfrontFeeFinanced = baseLoan * fundingFeeRate;
    monthlyInsurance = 0;
    insuranceRemovable = true;
    note =
      "No down payment and no monthly mortgage insurance — the strongest option if you're eligible. The one-time funding fee is financed.";
  }

  const financedLoan = baseLoan + upfrontFeeFinanced;
  const principalAndInterest = monthlyPayment(financedLoan, rate, termYears);

  return {
    program,
    label,
    loanAmount: financedLoan,
    ltv: homePrice > 0 ? baseLoan / homePrice : 0,
    upfrontFeeFinanced,
    principalAndInterest,
    monthlyInsurance,
    monthlyTotal: principalAndInterest + monthlyInsurance,
    insuranceRemovable,
    note,
  };
}

export function comparePrograms(inputs: ProgramInputs): ProgramResult[] {
  return (["conventional", "fha", "va"] as Program[]).map((p) => evaluateProgram(p, inputs));
}
