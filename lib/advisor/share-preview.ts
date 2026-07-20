/**
 * Institutional share preview — "here is what a lender or agent would see if
 * you shared your readiness." A trust feature first, B2B groundwork second
 * (blueprint Phase 4): nothing is shared and nothing can be shared yet; this
 * is the user seeing their own consented summary before sharing ever exists.
 *
 * Pure derivation from client-held state. Rules inherited from the canon:
 * confidence travels with the claim; data quality is stated per source;
 * self-reported is labeled self-reported; and the disclaimer is not fine
 * print — it is part of the product ("not a credit decision").
 */

import type { CompanionContext } from "@/lib/advisor/context";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";

export type PreviewConfidence = "low" | "medium" | "high";

export interface SharePreview {
  /** Verdict band label, e.g. "ALMOST THERE". */
  band: string;
  score: number;
  verdict: VerdictKey;
  confidence: PreviewConfidence;
  /** Why confidence is what it is — shown, never hidden. */
  confidenceReasons: string[];
  /** One line per data source with its quality/freshness. */
  dataQuality: string[];
  /** Active protective hard stops, verbatim. */
  hardStops: string[];
  /** Always present, always shown. */
  disclaimer: string;
}

export const SHARE_PREVIEW_DISCLAIMER =
  "Not a credit decision. Not underwriting. Not financial advice. A readiness summary the user chose to share, from self-reported data unless marked verified.";

/**
 * Builds the preview from the companion context. Null when there is no
 * assessment — there is nothing truthful to preview without a score.
 */
export function buildSharePreview(context: CompanionContext): SharePreview | null {
  const { assessment, finance, credit } = context;
  if (!assessment) return null;

  const confidenceReasons: string[] = [];
  const dataQuality: string[] = [];

  const assessmentAge =
    typeof assessment.ageDays === "number"
      ? assessment.ageDays === 0
        ? "completed today"
        : `${assessment.ageDays} days old`
      : "age unknown";
  dataQuality.push(`Assessment: complete, self-reported, ${assessmentAge}.`);
  const assessmentStale = typeof assessment.ageDays === "number" && assessment.ageDays >= 90;
  const assessmentAgeUnknown = typeof assessment.ageDays !== "number";
  if (assessmentStale) confidenceReasons.push("the assessment is more than 90 days old");
  if (assessmentAgeUnknown) confidenceReasons.push("the assessment's age is unknown");

  if (finance) {
    const financeAge =
      typeof finance.ageDays === "number"
        ? finance.ageDays === 0
          ? "saved today"
          : `saved ${finance.ageDays} days ago`
        : "save date unknown";
    dataQuality.push(`Money picture: self-reported, ${financeAge}.`);
    if (typeof finance.ageDays === "number" && finance.ageDays >= 30) {
      confidenceReasons.push("the money picture is more than 30 days old");
    }
  } else {
    dataQuality.push("Money picture: not provided.");
    confidenceReasons.push("no money picture has been entered");
  }

  if (credit) {
    dataQuality.push(`Credit: self-reported, score ${credit.score}.`);
  } else {
    dataQuality.push("Credit: not provided.");
  }

  // Confidence bands: high needs a fresh assessment plus a money picture with
  // nothing degrading it; each degradation drops one band.
  const confidence: PreviewConfidence =
    confidenceReasons.length === 0 ? "high" : confidenceReasons.length === 1 ? "medium" : "low";
  if (confidenceReasons.length === 0) {
    confidenceReasons.push("assessment is current and a money picture is present");
  }

  return {
    band: VERDICT_META[assessment.verdict].label,
    score: assessment.score,
    verdict: assessment.verdict,
    confidence,
    confidenceReasons,
    dataQuality,
    hardStops: assessment.hardStops,
    disclaimer: SHARE_PREVIEW_DISCLAIMER,
  };
}
