/**
 * E4 — Data-quality / confidence layer (display dampening only).
 *
 * This is NOT the emotional assessment input `confidenceLevel`. It measures
 * completeness × freshness × verification-style honesty for how much we can
 * stand behind a readiness claim.
 *
 * Rules (aligned with `lib/advisor/share-preview.ts` + Path modes):
 * - Raw Decision Readiness Score stays canonical — never rewrite `computeScore`.
 * - Displayed dampening: `displayedScore = round(raw × (0.7 + 0.3·factor))`.
 * - High band only when assessment is fresh AND a money picture is present.
 * - Each degradation drops one band (high → medium → low).
 * - Missing data is named; nothing is silently imputed as fact.
 */

import type { PathConfidence } from "./path";
import { ASSESSMENT_STALE_DAYS } from "./progress";

/** Same band vocabulary as institutional share preview. */
export type DataQualityBand = "low" | "medium" | "high";

/**
 * 0–1 factor used only for display dampening.
 * Mapped from the discrete band so high confidence never dampens the raw score.
 */
export const BAND_FACTOR: Record<DataQualityBand, number> = {
  high: 1,
  medium: 2 / 3,
  low: 1 / 3,
};

/** Money picture older than this is a freshness degradation (share-preview canon). */
export const FINANCE_STALE_DAYS = 30;

export { ASSESSMENT_STALE_DAYS };

/** Plausible age ceiling — mirrors companion context honesty. */
const MAX_PLAUSIBLE_AGE_DAYS = 3650;

export interface DataQualityInput {
  rawScore: number;
  /** Whole days since assessment; null/undefined = unknown. */
  assessmentAgeDays?: number | null;
  hasFinance: boolean;
  financeAgeDays?: number | null;
  hasCredit?: boolean;
  /** Present only when credit was saved — for data-quality lines, never invented. */
  creditScore?: number | null;
  /**
   * When true, money picture includes a verified source (e.g. bank sync).
   * Default false → labeled self-reported.
   */
  financeVerified?: boolean;
}

export interface DataQualityGap {
  id: string;
  label: string;
  href?: string;
}

export interface DataQualityConfidence {
  band: DataQualityBand;
  /** 0–1 — display dampening only. */
  factor: number;
  rawScore: number;
  displayedScore: number;
  isDampened: boolean;
  /** Why the band is what it is (shown, never hidden). */
  reasons: string[];
  /** Actionable gaps that lowered confidence (or soft completeness gaps). */
  gaps: DataQualityGap[];
  /** One line per data source with quality/freshness. */
  dataQuality: string[];
  /** Aligns with Path to Ready confidence modes. */
  pathMode: PathConfidence;
}

/**
 * Whole days between an ISO stamp and now; null when untrustworthy
 * (missing, unparseable, future, or implausibly old).
 */
export function ageDaysFromIso(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((nowMs - t) / 86_400_000);
  if (days < 0 || days > MAX_PLAUSIBLE_AGE_DAYS) return null;
  return days;
}

/** Display dampening only — raw score is never mutated by callers of this. */
export function displayedScoreFromRaw(rawScore: number, factor: number): number {
  const safeRaw = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const clamped = Number.isFinite(factor) ? Math.max(0, Math.min(1, factor)) : 0;
  return Math.round(safeRaw * (0.7 + 0.3 * clamped));
}

function bandFromDegradationCount(count: number): DataQualityBand {
  if (count <= 0) return "high";
  if (count === 1) return "medium";
  return "low";
}

/**
 * Pure data-quality confidence from assessment + optional finance/credit.
 * Same degradation rules as share-preview; adds displayedScore + gaps.
 */
export function computeDataQualityConfidence(input: DataQualityInput): DataQualityConfidence {
  const reasons: string[] = [];
  const gaps: DataQualityGap[] = [];
  const dataQuality: string[] = [];

  const assessmentAge =
    typeof input.assessmentAgeDays === "number"
      ? input.assessmentAgeDays === 0
        ? "completed today"
        : `${input.assessmentAgeDays} days old`
      : "age unknown";
  dataQuality.push(`Assessment: complete, self-reported, ${assessmentAge}.`);

  const assessmentStale =
    typeof input.assessmentAgeDays === "number" &&
    input.assessmentAgeDays >= ASSESSMENT_STALE_DAYS;
  const assessmentAgeUnknown = typeof input.assessmentAgeDays !== "number";
  if (assessmentStale) {
    reasons.push("the assessment is more than 90 days old");
    gaps.push({
      id: "assessment_stale",
      label: "Re-take the assessment — this one is more than 90 days old",
      href: "/assessment",
    });
  }
  if (assessmentAgeUnknown) {
    reasons.push("the assessment's age is unknown");
    gaps.push({
      id: "assessment_age_unknown",
      label: "Assessment age is unknown — refresh with a new run when you can",
      href: "/assessment",
    });
  }

  if (input.hasFinance) {
    const financeAge =
      typeof input.financeAgeDays === "number"
        ? input.financeAgeDays === 0
          ? "saved today"
          : `saved ${input.financeAgeDays} days ago`
        : "save date unknown";
    const sourceLabel = input.financeVerified ? "verified" : "self-reported";
    dataQuality.push(`Money picture: ${sourceLabel}, ${financeAge}.`);
    if (typeof input.financeAgeDays === "number" && input.financeAgeDays >= FINANCE_STALE_DAYS) {
      reasons.push("the money picture is more than 30 days old");
      gaps.push({
        id: "finance_stale",
        label: "Refresh your money picture — last save was more than 30 days ago",
        href: "/money",
      });
    }
  } else {
    dataQuality.push("Money picture: not provided.");
    reasons.push("no money picture has been entered");
    gaps.push({
      id: "finance_missing",
      label: "Add a money picture so readiness isn't assessment-only",
      href: "/money",
    });
  }

  if (input.hasCredit && typeof input.creditScore === "number") {
    dataQuality.push(`Credit: self-reported, score ${input.creditScore}.`);
  } else if (input.hasCredit) {
    dataQuality.push("Credit: self-reported.");
  } else {
    dataQuality.push("Credit: not provided.");
    // Soft completeness gap — does not drop the share-preview band.
    gaps.push({
      id: "credit_missing",
      label: "Add a credit picture when you have one (still self-reported)",
      href: "/credit",
    });
  }

  if (input.hasFinance && !input.financeVerified) {
    // Honesty marker, not a band degradation — verification style disclosure.
    dataQuality.push("Verification: self-reported unless a bank connection marks money verified.");
  } else if (input.hasFinance && input.financeVerified) {
    dataQuality.push("Verification: money picture includes a verified bank source.");
  } else {
    dataQuality.push("Verification: assessment-only — no verified money source yet.");
  }

  const degradationCount = reasons.length;
  const band = bandFromDegradationCount(degradationCount);
  if (degradationCount === 0) {
    reasons.push("assessment is current and a money picture is present");
  }

  const factor = BAND_FACTOR[band];
  const rawScore = Number.isFinite(input.rawScore)
    ? Math.max(0, Math.min(100, Math.round(input.rawScore)))
    : 0;
  const displayedScore = displayedScoreFromRaw(rawScore, factor);

  return {
    band,
    factor,
    rawScore,
    displayedScore,
    isDampened: displayedScore !== rawScore,
    reasons,
    gaps,
    dataQuality,
    pathMode: input.hasFinance ? "assessment_plus_finance" : "assessment_only",
  };
}
