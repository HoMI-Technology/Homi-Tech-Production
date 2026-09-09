/**
 * Home last-read chrome — existing scored fold only.
 * Calendar age when stale (≥30d). Optional same-way money direction.
 * Never reprints the verdict (ThresholdFold owns the public word once).
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

const STALE_AFTER_DAYS = 30;

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

/** Whole calendar days since last read. Null when the timestamp is unusable. */
export function lastReadAgeDays(iso: string | null, nowMs: number = Date.now()): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return null;
  const days = Math.floor((nowMs - then.getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  return days;
}

/** Calendar age: "from March 15." Never a live score. Never "0d". */
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
 * One stale age line, or null.
 * Age is omitted under 30 days (no 0d chrome, no “30 days later” under 30).
 * Chrome does not reprint the verdict — ThresholdFold already said it once.
 */
export function lastReadHeadline(verdict: VerdictKey, ageDays: number | null, ageFrom: string | null): string | null {
  void publicVerdictLabel(verdict);
  if (ageDays == null || ageDays < STALE_AFTER_DAYS) return null;
  return ageFrom;
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
  /** Liquid cash from last AssessmentResult only. Never a second FR score. */
  liquidDollars: number | null;
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
