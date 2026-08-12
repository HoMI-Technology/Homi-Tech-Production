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
 *
 * Band / reason / per-source lines come from the shared E4 helper in
 * `lib/readiness/confidence.ts` so /results and share preview cannot drift.
 * The score here is always the raw canonical HōMI-Score (never dampened).
 */

import type { CompanionContext } from "@/lib/advisor/context";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  computeDataQualityConfidence,
  type DataQualityBand,
} from "@/lib/readiness/confidence";

export type PreviewConfidence = DataQualityBand;

export interface SharePreview {
  /** Verdict band label, e.g. "ALMOST THERE". */
  band: string;
  /** Raw canonical HōMI-Score — never display-dampened. */
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

  const dq = computeDataQualityConfidence({
    rawScore: assessment.score,
    assessmentAgeDays: assessment.ageDays,
    hasFinance: Boolean(finance),
    financeAgeDays: finance?.ageDays,
    hasCredit: Boolean(credit),
    creditScore: credit?.score ?? null,
    financeVerified: false,
  });

  return {
    band: VERDICT_META[assessment.verdict].label,
    score: assessment.score,
    verdict: assessment.verdict,
    confidence: dq.band,
    confidenceReasons: dq.reasons,
    dataQuality: dq.dataQuality,
    hardStops: assessment.hardStops,
    disclaimer: SHARE_PREVIEW_DISCLAIMER,
  };
}
