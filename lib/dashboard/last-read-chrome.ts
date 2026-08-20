/**
 * Home last-read chrome — one sentence on the existing scored fold.
 * Distance in Brand words only. Never a live number. Never points.
 * Do not run a new score to decide closer-to.
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

export function nextPublicVerdict(verdict: VerdictKey): VerdictKey | null {
  switch (verdict) {
    case "NOT_YET":
      return "BUILD_FIRST";
    case "BUILD_FIRST":
      return "ALMOST_THERE";
    case "ALMOST_THERE":
      return "READY";
    case "READY":
      return null;
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

export function closerToLine(verdict: VerdictKey): string | null {
  if (verdict === "READY") return null;
  const next = nextPublicVerdict(verdict);
  if (!next) return null;
  return `closer to ${publicVerdictLabel(next)}.`;
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

export type LastReadMoneyInputs = {
  debtToIncomeRatio: number | null;
  emergencyFundMonths: number | null;
  savingsRate: number | null;
};

function moveSign(delta: number): "better" | "worse" | "unchanged" {
  if (delta > 0) return "better";
  if (delta < 0) return "worse";
  return "unchanged";
}

/**
 * True when comparable Money DTI / EF / savings-rate moved improving vs the
 * last assessment. Mixed or unchanged → false. Does not compute a score.
 */
export function moneyPictureImproved(input: {
  lastDtiRatio: number | null;
  lastEmergencyFundMonths: number | null;
  lastSavingsRateRatio: number | null;
  currentDtiPercent: number | null;
  currentEmergencyFundMonths: number | null;
  currentSavingsRatePercent: number | null;
}): boolean {
  const lastDti = classifyDtiBand(input.lastDtiRatio, "ratio");
  const lastEf = classifyEmergencyFundBand(input.lastEmergencyFundMonths);
  const lastSr = classifySavingsRateBand(input.lastSavingsRateRatio, "ratio");
  const nowDti = classifyDtiBand(input.currentDtiPercent, "percent");
  const nowEf = classifyEmergencyFundBand(input.currentEmergencyFundMonths);
  const nowSr = classifySavingsRateBand(input.currentSavingsRatePercent, "percent");

  const moves: Array<"better" | "worse" | "unchanged"> = [];
  if (lastDti != null && nowDti != null) {
    moves.push(moveSign(DTI_STRENGTH[nowDti] - DTI_STRENGTH[lastDti]));
  }
  if (lastEf != null && nowEf != null) {
    moves.push(moveSign(EF_STRENGTH[nowEf] - EF_STRENGTH[lastEf]));
  }
  if (lastSr != null && nowSr != null) {
    moves.push(moveSign(SR_STRENGTH[nowSr] - SR_STRENGTH[lastSr]));
  }
  if (moves.length === 0) return false;
  if (moves.some((move) => move === "worse")) return false;
  return moves.some((move) => move === "better");
}

/** One fold sentence: age and/or closer-to. Progress chrome yields on hard stop. */
export function lastReadSentence(input: {
  verdict: VerdictKey;
  age: string | null;
  improving: boolean;
  hardStop: boolean;
}): string | null {
  const age = input.age;
  const closer =
    !input.hardStop && input.improving ? closerToLine(input.verdict) : null;
  if (age && closer) return `${age} ${closer}`;
  return age ?? closer;
}
