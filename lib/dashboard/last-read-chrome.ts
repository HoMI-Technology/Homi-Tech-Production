/**
 * Home last-read chrome — existing scored fold only.
 * Last verdict word + calendar age. Optional same-way money direction.
 * Never a next-band proximity claim. Never a live number. Never points.
 * Do not run a new score to decide direction.
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

/** Public Brand names only. Never print NOT_YET or Not yet. */
export const PUBLIC_VERDICT_LABELS = [
  "READY",
  "ALMOST THERE",
  "BUILD FIRST",
  "DO NOT PROCEED",
] as const;

export function publicVerdictLabel(verdict: VerdictKey): string {
  switch (verdict) {
    case "READY":
    case "ALMOST_THERE":
    case "BUILD_FIRST":
    case "NOT_YET":
      return VERDICT_META[verdict].label;
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

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

/**
 * Compact Home age: "from Aug 29" — short month, no trailing period.
 * Shape is {Mon D} from last-read date, never a hardcoded ship date.
 */
export function lastReadAgeCompact(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return null;
  const month = SHORT_MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (!month) return null;
  return `from ${month} ${day}`;
}

/**
 * Compact last-read on Home: "{score} · from {Mon D}".
 * Score is the last assessment integer. Never restates the verdict word.
 */
export function compactScoreAgeLine(score: number, age: string | null): string {
  return age ? `${score} · ${age}` : String(score);
}

/** Last public verdict + optional age. Never a closer-to band. */
export function lastReadHeadline(verdict: VerdictKey, age: string | null): string {
  const label = publicVerdictLabel(verdict);
  return age ? `Last read: ${label} ${age}` : `Last read: ${label}`;
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
 * Direction only when DTI, EF months, and savings-rate all moved the same way
 * vs last assessment stored values. Missing, mixed, or unchanged → omit.
 * Does not compute a score. Not a verdict claim.
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
  switch (direction) {
    case "stronger":
      return LAST_READ_STRONGER;
    case "weaker":
      return LAST_READ_WEAKER;
    case null:
      return null;
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
}
