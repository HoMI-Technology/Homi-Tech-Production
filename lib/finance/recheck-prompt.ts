/**
 * Money re-check prompt — band-cross only. Prompt, never a score or ledger write.
 *
 * Cutoffs mirror lib/scoring/engine.ts (scoreDTI / scoreEmergencyFund /
 * scoreSavingsRate + hard-stops). They stay internal: UI copy never prints
 * them. Intra-band moves do not prompt.
 */

export const MONEY_RECHECK_PROMPT = "Your money picture changed. Re-check readiness?";
export const MONEY_RECHECK_RETAKE_LABEL = "Retake";
export const MONEY_RECHECK_DISMISS_LABEL = "Not now";
export const MONEY_RECHECK_RETAKE_HREF = "/assessment";

const DISMISS_STORAGE_KEY = "homi:money-recheck-dismissed";

export interface DismissedMoneyCycle {
  lastAssessmentAt: string;
  moneyBandsKey: string;
}

/** Opaque scoring-band keys. Never render these in UI. */
export type DtiScoreBand = "dti_lte28" | "dti_lte36" | "dti_lte43" | "dti_else" | "dti_hard";
export type EfScoreBand = "ef_gte6" | "ef_gte3" | "ef_gte1" | "ef_else";
export type SavingsScoreBand = "sr_gte20" | "sr_gte10" | "sr_gte5" | "sr_else";

export interface ScoreRelevantBands {
  dti: DtiScoreBand | null;
  emergencyFund: EfScoreBand | null;
  savingsRate: SavingsScoreBand | null;
}

export interface RecheckCrossing {
  from: ScoreRelevantBands;
  to: ScoreRelevantBands;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function asRatio(value: number, unit: "ratio" | "percent"): number {
  return unit === "percent" ? clampRatio(value / 100) : clampRatio(value);
}

/**
 * DTI scoring bands from engine.ts: ≤28 / ≤36 / ≤43 / else, hard stop >50%.
 * `unit` lets Money % and assessment 0–1 share one classifier.
 */
export function classifyDtiBand(
  value: number | null,
  unit: "ratio" | "percent" = "ratio",
): DtiScoreBand | null {
  if (value == null || !Number.isFinite(value)) return null;
  const pct = asRatio(value, unit) * 100;
  if (pct > 50) return "dti_hard";
  if (pct <= 28) return "dti_lte28";
  if (pct <= 36) return "dti_lte36";
  if (pct <= 43) return "dti_lte43";
  return "dti_else";
}

/** EF months: ≥6 / ≥3 / ≥1 / else (hard stop runway <1 lives in else). */
export function classifyEmergencyFundBand(months: number | null): EfScoreBand | null {
  if (months == null || !Number.isFinite(months)) return null;
  if (months >= 6) return "ef_gte6";
  if (months >= 3) return "ef_gte3";
  if (months >= 1) return "ef_gte1";
  return "ef_else";
}

/** Savings rate: ≥20 / ≥10 / ≥5 / else. */
export function classifySavingsRateBand(
  value: number | null,
  unit: "ratio" | "percent" = "ratio",
): SavingsScoreBand | null {
  if (value == null || !Number.isFinite(value)) return null;
  const pct = asRatio(value, unit) * 100;
  if (pct >= 20) return "sr_gte20";
  if (pct >= 10) return "sr_gte10";
  if (pct >= 5) return "sr_gte5";
  return "sr_else";
}

export function bandsFromAssessmentInputs(input: {
  debtToIncomeRatio?: number | null;
  emergencyFundMonths?: number | null;
  savingsRate?: number | null;
}): ScoreRelevantBands {
  return {
    dti: classifyDtiBand(input.debtToIncomeRatio ?? null, "ratio"),
    emergencyFund: classifyEmergencyFundBand(input.emergencyFundMonths ?? null),
    savingsRate: classifySavingsRateBand(input.savingsRate ?? null, "ratio"),
  };
}

export function bandsFromMoneyPicture(input: {
  dtiPercent?: number | null;
  emergencyFundMonths?: number | null;
  savingsRatePercent?: number | null;
}): ScoreRelevantBands {
  return {
    dti: classifyDtiBand(input.dtiPercent ?? null, "percent"),
    emergencyFund: classifyEmergencyFundBand(input.emergencyFundMonths ?? null),
    savingsRate: classifySavingsRateBand(input.savingsRatePercent ?? null, "percent"),
  };
}

function comparableChanged(from: ScoreRelevantBands, to: ScoreRelevantBands): boolean {
  const keys: Array<keyof ScoreRelevantBands> = ["dti", "emergencyFund", "savingsRate"];
  return keys.some((key) => from[key] != null && to[key] != null && from[key] !== to[key]);
}

export function crossingKey(crossing: RecheckCrossing): string {
  return [
    fromBandKey(crossing.from),
    fromBandKey(crossing.to),
  ].join("→");
}

function fromBandKey(bands: ScoreRelevantBands): string {
  return [bands.dti ?? "—", bands.emergencyFund ?? "—", bands.savingsRate ?? "—"].join("|");
}

export function detectBandCrossing(
  from: ScoreRelevantBands,
  to: ScoreRelevantBands,
): RecheckCrossing | null {
  if (!comparableChanged(from, to)) return null;
  return { from, to };
}

function isDismissedCycle(value: unknown): value is DismissedMoneyCycle {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.lastAssessmentAt === "string" && typeof row.moneyBandsKey === "string";
}

function readDismissedCycle(): DismissedMoneyCycle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isDismissedCycle(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function moneyBandsKey(bands: ScoreRelevantBands): string {
  return fromBandKey(bands);
}

/**
 * Not now hides this cycle until a score-relevant Money save (new bands)
 * or a finished 45-q (new lastAssessmentAt). Same numbers stay hidden.
 * Sign-out does not clear this key.
 */
export function dismissBandCrossing(
  crossing: RecheckCrossing,
  lastAssessmentAt: string,
): void {
  if (typeof window === "undefined") return;
  const cycle: DismissedMoneyCycle = {
    lastAssessmentAt,
    moneyBandsKey: moneyBandsKey(crossing.to),
  };
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(cycle));
  } catch {
    // private mode — in-memory dismiss still happens via the caller
  }
}

export function isDismissedCycleActive(
  lastAssessmentAt: string,
  to: ScoreRelevantBands,
): boolean {
  const dismissed = readDismissedCycle();
  if (!dismissed) return false;
  return (
    dismissed.lastAssessmentAt === lastAssessmentAt &&
    dismissed.moneyBandsKey === moneyBandsKey(to)
  );
}

export function shouldPromptRecheck(
  from: ScoreRelevantBands,
  to: ScoreRelevantBands,
  lastAssessmentAt: string | null,
): RecheckCrossing | null {
  if (!lastAssessmentAt) return null;
  const crossing = detectBandCrossing(from, to);
  if (!crossing) return null;
  if (isDismissedCycleActive(lastAssessmentAt, to)) return null;
  return crossing;
}

