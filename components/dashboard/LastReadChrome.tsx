"use client";

import { useEffect, useState } from "react";
import {
  compactScoreAgeLine,
  lastReadAgeCompact,
  moneyPictureDirection,
  moneyPictureDirectionLine,
  type LastReadMoneyInputs,
} from "@/lib/dashboard/last-read-chrome";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";

/**
 * Existing scored-fold chrome only — not a second card.
 * Compact last-read: "{score} · from {Mon D}" + optional same-way direction.
 * Never prints the verdict word. Never a next-band proximity claim.
 * Never a live score.
 */
export function LastReadChrome({
  score,
  lastReadAt,
  showAge,
  lastMoney,
}: {
  score: number;
  lastReadAt: string | null;
  showAge: boolean;
  lastMoney: LastReadMoneyInputs | null;
}) {
  const [directionLine, setDirectionLine] = useState<string | null>(null);

  useEffect(() => {
    if (!lastMoney || !hasSavedBudgetLedger()) {
      setDirectionLine(null);
      return;
    }
    const nowIso = new Date().toISOString();
    const metrics = metricsFromLedger(loadBudgetLedger(nowIso), nowIso, budgetLedgerSavedAt());
    const direction = moneyPictureDirection({
      lastDtiRatio: lastMoney.debtToIncomeRatio,
      lastEmergencyFundMonths: lastMoney.emergencyFundMonths,
      lastSavingsRateRatio: lastMoney.savingsRate,
      currentDtiPercent: metrics.dti.pct,
      currentEmergencyFundMonths: metrics.runway.months,
      currentSavingsRatePercent: metrics.savingsRatePct,
    });
    setDirectionLine(moneyPictureDirectionLine(direction));
  }, [lastMoney]);

  const age = showAge ? lastReadAgeCompact(lastReadAt) : null;
  const line = compactScoreAgeLine(score, age);

  return (
    <div data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      <p
        data-last-read-score-age=""
        className="score-numeral"
        aria-label={line}
      >
        <span className="text-cyan">{score}</span>
        {age ? <span className="text-dim"> · {age}</span> : null}
      </p>
      {directionLine ? <p data-last-read-direction="">{directionLine}</p> : null}
    </div>
  );
}
