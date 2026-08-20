/**
 * Home last-read chrome — existing scored fold only.
 * Last verdict word + calendar age. Optional same-way money direction.
 * Never a next-band proximity claim. Never a live number. Never points.
 */

import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  classifyDtiBand,
  classifyEmergencyFundBand,
  classifySavingsRateBand,
  type DtiScoreBand,
  type EfScoreBand,
  type SavingsScoreBand,
} from "@/lib/finance/recheck-prompt";

export const LAST_READ_STRONGER = "Your money picture looks stronger than last time.";
export const LAST_READ_WEAKER = "Your money picture looks weaker than last time.";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function publicVerdictLabel(verdict: VerdictKey): string {
  return VERDICT_META[verdict].label;
}

/** Calendar age: "from March 15." Never a live score. */
export function lastReadAgeFrom(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return null;
  const month = MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (!month) return null;
  return `from ${month} ${day}.`;
}

const DTI_STRENGTH: Record<DtiScoreBand, number> = {
  dti_lte28: 4,
  dti_lte36: 3,
  dti_lte43: 2,
  dti_else: 1,
  dti_hard: 0,
};

const EF_STRENGTH: Record<EfScoreBand, number> = {
  ef_gte6: 3,
  ef_gte3: 2,
  ef_gte1: 1,
  ef_else: 0,
};

const SR_STRENGTH: Record<SavingsScoreBand, number> = {
  sr_gte20: 3,
  sr_gte10: 2,
  sr_gte5: 1,
  sr_else: 0,
};

export type MoneyDirection = "stronger" | "weaker";

export type LastReadMoneyInputs = {
  debtToIncomeRatio: number | null;
  emergencyFundMonths: number | null;
  savingsRate: number | null;
};

function sign(delta: number): MoneyDirection | "unchanged" {
  if (delta > 0) return "stronger";
  if (delta < 0) return "weaker";
  return "unchanged";
}

/**
 * Direction only when DTI, EF months, and savings-rate all moved the same way.
 * Missing, mixed, or unchanged → omit. Not a verdict claim.
 */
export function moneyPictureDirection(input: {
  lastDtiRatio: number | null;
  lastEmergencyFundMonths: number | null;
  lastSavingsRateRatio: number | null;
  currentDtiPercent: number | null;
  currentEmergencyFundMonths: number | null;
  currentSavingsRatePercent: number | null;
}): MoneyDirection | null {
  const lastDti = classifyDtiBand(input.lastDtiRatio, "ratio");
  const lastEf = classifyEmergencyFundBand(input.lastEmergencyFundMonths);
  const lastSr = classifySavingsRateBand(input.lastSavingsRateRatio, "ratio");
  const nowDti = classifyDtiBand(input.currentDtiPercent, "percent");
  const nowEf = classifyEmergencyFundBand(input.currentEmergencyFundMonths);
  const nowSr = classifySavingsRateBand(input.currentSavingsRatePercent, "percent");

  if (lastDti == null || lastEf == null || lastSr == null) return null;
  if (nowDti == null || nowEf == null || nowSr == null) return null;

  const moves = [
    sign(DTI_STRENGTH[nowDti] - DTI_STRENGTH[lastDti]),
    sign(EF_STRENGTH[nowEf] - EF_STRENGTH[lastEf]),
    sign(SR_STRENGTH[nowSr] - SR_STRENGTH[lastSr]),
  ];
  if (moves.some((move) => move === "unchanged")) return null;
  if (moves.every((move) => move === "stronger")) return "stronger";
  if (moves.every((move) => move === "weaker")) return "weaker";
  return null;
}

export function moneyPictureDirectionLine(direction: MoneyDirection | null): string | null {
  if (direction === "stronger") return LAST_READ_STRONGER;
  if (direction === "weaker") return LAST_READ_WEAKER;
  return null;
}
