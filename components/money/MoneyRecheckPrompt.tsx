"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadLocalResult } from "@/lib/assessment/storage";
import {
  bandsFromAssessmentInputs,
  bandsFromMoneyPicture,
  dismissBandCrossing,
  shouldPromptRecheck,
  MONEY_RECHECK_DISMISS_LABEL,
  MONEY_RECHECK_PROMPT,
  MONEY_RECHECK_RETAKE_HREF,
  MONEY_RECHECK_RETAKE_LABEL,
  type RecheckCrossing,
} from "@/lib/finance/recheck-prompt";
import type { NamedMoneyMetrics } from "@/lib/finance/metrics";

/**
 * Band-cross prompt only. Never writes the ledger or the score.
 */
export function MoneyRecheckPrompt({ metrics }: { metrics: NamedMoneyMetrics | null }) {
  const [crossing, setCrossing] = useState<RecheckCrossing | null>(null);

  useEffect(() => {
    if (!metrics) {
      setCrossing(null);
      return;
    }
    const stored = loadLocalResult();
    if (!stored?.inputs) {
      setCrossing(null);
      return;
    }
    const from = bandsFromAssessmentInputs({
      debtToIncomeRatio: stored.inputs.debtToIncomeRatio,
      emergencyFundMonths: stored.inputs.emergencyFundMonths,
      savingsRate: stored.inputs.savingsRate,
    });
    const to = bandsFromMoneyPicture({
      dtiPercent: metrics.dti.pct,
      emergencyFundMonths: metrics.runway.months,
      savingsRatePercent: metrics.savingsRatePct,
    });
    setCrossing(shouldPromptRecheck(from, to));
  }, [metrics]);

  if (!crossing) return null;

  return (
    <div
      data-money-recheck-prompt=""
      className="rounded-xl border border-cyan/25 bg-cyan/[0.04] px-4 py-3"
      role="status"
    >
      <p className="text-sm text-light">{MONEY_RECHECK_PROMPT}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={MONEY_RECHECK_RETAKE_HREF} className="btn btn-primary">
          {MONEY_RECHECK_RETAKE_LABEL}
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            dismissBandCrossing(crossing);
            setCrossing(null);
          }}
        >
          {MONEY_RECHECK_DISMISS_LABEL}
        </button>
      </div>
    </div>
  );
}
