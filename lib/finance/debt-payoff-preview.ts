/**
 * Directional debt-payoff preview. Locked shapes only — no points, no 0–100,
 * no leaked cutoffs. This is not a score write.
 */

import {
  classifyDtiBand,
  classifyEmergencyFundBand,
  type DtiScoreBand,
  type EfScoreBand,
} from "@/lib/finance/recheck-prompt";

export const DEBT_PAYOFF_NOT_SCORE = "This is not your HōMI Score.";
export const DTI_BETTER_BAND = "DTI may move into a better band.";
export const DTI_WORSE_BAND = "DTI may move into a worse band.";
export const HARD_STOP_REMAINS = "Still above the line we treat as a hard stop.";
export const RUNWAY_BETTER_BAND = "Runway may move into a better band.";
export const RUNWAY_WORSE_BAND = "Runway may move into a worse band.";

const DTI_RANK: Record<DtiScoreBand, number> = {
  dti_lte28: 0,
  dti_lte36: 1,
  dti_lte43: 2,
  dti_else: 3,
  dti_hard: 4,
};

const EF_RANK: Record<EfScoreBand, number> = {
  ef_gte6: 3,
  ef_gte3: 2,
  ef_gte1: 1,
  ef_else: 0,
};

function dtiFromDollars(income: number | null, debt: number | null): DtiScoreBand | null {
  if (income == null || income <= 0 || debt == null || !Number.isFinite(debt)) return null;
  return classifyDtiBand((debt / income) * 100, "percent");
}

export function debtPayoffPreviewLines(input: {
  monthlyIncome: number | null;
  currentMonthlyDebt: number | null;
  remainingMonthlyDebt: number | null;
  currentRunwayMonths: number | null;
  projectedRunwayMonths: number | null;
}): string[] {
  const lines: string[] = [DEBT_PAYOFF_NOT_SCORE];
  const currentDti = dtiFromDollars(input.monthlyIncome, input.currentMonthlyDebt);
  const nextDti = dtiFromDollars(input.monthlyIncome, input.remainingMonthlyDebt);

  if (currentDti === "dti_hard" && nextDti === "dti_hard") {
    lines.push(HARD_STOP_REMAINS);
  } else if (currentDti != null && nextDti != null && currentDti !== nextDti) {
    if (DTI_RANK[nextDti] < DTI_RANK[currentDti]) lines.push(DTI_BETTER_BAND);
    if (DTI_RANK[nextDti] > DTI_RANK[currentDti]) {
      lines.push(nextDti === "dti_hard" ? HARD_STOP_REMAINS : DTI_WORSE_BAND);
    }
  }

  const currentEf = classifyEmergencyFundBand(input.currentRunwayMonths);
  const nextEf = classifyEmergencyFundBand(input.projectedRunwayMonths);
  if (currentEf != null && nextEf != null && currentEf !== nextEf) {
    if (EF_RANK[nextEf] > EF_RANK[currentEf]) lines.push(RUNWAY_BETTER_BAND);
    if (EF_RANK[nextEf] < EF_RANK[currentEf]) lines.push(RUNWAY_WORSE_BAND);
  }

  return lines;
}
