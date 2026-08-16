/**
 * Bridges live planner numbers → AssessmentInputs → HōMI-Score.
 */

import { estimateHousingPayment } from "./cfm";
import {
  computeScore,
  type AssessmentInputs,
  type AssessmentResult,
} from "./scoring";
import type {
  Bill,
  BankAccount,
  DebtItem,
  Holding,
  HouseholdPartner,
  NetWorthItem,
  ReadinessProfile,
  SavingsGoal,
  Transaction,
} from "./types";
import {
  DEFAULT_READINESS_PROFILE,
  financialReality,
  summarizePortfolio,
  totalNetWorth,
} from "./store";

export interface ScoreBridgeInput {
  transactions: Transaction[];
  accounts: BankAccount[];
  bills: Bill[];
  holdings: Holding[];
  netWorthItems: NetWorthItem[];
  savingsGoal: SavingsGoal;
  readinessProfile: ReadinessProfile;
  debts?: DebtItem[];
}

function safeProfile(p?: Partial<ReadinessProfile> | null): ReadinessProfile {
  return { ...DEFAULT_READINESS_PROFILE, ...(p && typeof p === "object" ? p : {}) };
}

export function buildAssessmentInputs(
  input: ScoreBridgeInput,
  overrides?: Partial<AssessmentInputs> & {
    incomeMultiplier?: number;
  },
): AssessmentInputs {
  const reality = financialReality(
    input.transactions ?? [],
    input.accounts ?? [],
    input.bills ?? [],
  );
  const p = safeProfile(input.readinessProfile);
  const income = reality.income * (overrides?.incomeMultiplier ?? 1);
  const dtiRatio =
    income > 0 ? reality.debtPayments / income : reality.dti / 100;

  const downNeeded = p.targetHomePrice * 0.2;
  const dpProgress =
    downNeeded > 0
      ? Math.min(1, p.downPaymentSaved / downNeeded)
      : p.downPaymentSaved > 0
        ? 1
        : 0;
  const downPaymentPercent =
    p.targetHomePrice > 0 ? p.downPaymentSaved / p.targetHomePrice : 0;

  const housingPayment = estimateHousingPayment({
    targetPrice: p.targetHomePrice,
    downPaymentSaved: p.downPaymentSaved,
    ratePct: p.assumedRatePct,
    termYears: p.termYears,
    taxInsuranceRatePct: p.taxInsuranceRatePct,
    hoaMonthly: p.hoaMonthly,
  });
  const monthlyHousingRatio =
    income > 0 ? housingPayment / income : undefined;

  const runway = Number.isFinite(reality.runwayMonths)
    ? reality.runwayMonths
    : 12;

  return {
    debtToIncomeRatio: overrides?.debtToIncomeRatio ?? dtiRatio,
    downPaymentPercent: overrides?.downPaymentPercent ?? downPaymentPercent,
    emergencyFundMonths: overrides?.emergencyFundMonths ?? runway,
    creditScore: overrides?.creditScore ?? p.creditScore,
    lifeStability: overrides?.lifeStability ?? p.lifeStability,
    confidenceLevel: overrides?.confidenceLevel ?? p.confidenceLevel,
    partnerAlignment:
      overrides?.partnerAlignment !== undefined
        ? overrides.partnerAlignment
        : p.partnerAlignment,
    fomoLevel: overrides?.fomoLevel ?? p.fomoLevel,
    timeHorizonMonths: overrides?.timeHorizonMonths ?? p.timeHorizonMonths,
    savingsRate: overrides?.savingsRate ?? reality.savingsRate / 100,
    downPaymentProgress: overrides?.downPaymentProgress ?? dpProgress,
    monthlyHousingRatio:
      overrides?.monthlyHousingRatio ?? monthlyHousingRatio,
  };
}

export function scoreFromBudget(input: ScoreBridgeInput): AssessmentResult {
  try {
    return computeScore(buildAssessmentInputs(input));
  } catch {
    // Never blank the whole app if a score input is bad
    return computeScore(
      buildAssessmentInputs({
        ...input,
        readinessProfile: DEFAULT_READINESS_PROFILE,
        transactions: input.transactions ?? [],
        accounts: input.accounts ?? [],
        bills: input.bills ?? [],
        holdings: input.holdings ?? [],
        netWorthItems: input.netWorthItems ?? [],
        savingsGoal: input.savingsGoal ?? {
          name: "Emergency fund",
          target: 12000,
          current: 0,
        },
      }),
    );
  }
}

export function scoreHouseholdMember(
  input: ScoreBridgeInput,
  partner: HouseholdPartner,
  role: "primary" | "partner",
): AssessmentResult {
  if (role === "primary") {
    return computeScore(
      buildAssessmentInputs(input, {
        partnerAlignment: partner.enabled
          ? partner.partnerAlignment
          : safeProfile(input.readinessProfile).partnerAlignment,
      }),
    );
  }

  const share = Math.min(0.9, Math.max(0.1, partner.incomeShare || 0.4));
  const primaryShare = 1 - share;
  return computeScore(
    buildAssessmentInputs(input, {
      incomeMultiplier: share / Math.max(primaryShare, 0.15),
      creditScore: partner.creditScore,
      lifeStability: partner.lifeStability,
      confidenceLevel: partner.confidenceLevel,
      fomoLevel: partner.fomoLevel,
      timeHorizonMonths: partner.timeHorizonMonths,
      partnerAlignment: partner.partnerAlignment,
    }),
  );
}

export function wealthSnapshot(input: ScoreBridgeInput) {
  const portfolio = summarizePortfolio(input.holdings ?? []);
  const nw = totalNetWorth(
    input.accounts ?? [],
    input.holdings ?? [],
    input.netWorthItems ?? [],
  );
  return { portfolio, nw };
}
