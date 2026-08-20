"use client";

import { useEffect, useState } from "react";
import type { VerdictKey } from "@/lib/brand";
import {
  lastReadAgeFrom,
  lastReadHeadline,
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
 * Last verdict + calendar age + optional same-way direction.
 * Never a next-band proximity claim. Never a live score.
 */
export function LastReadChrome({
  verdict,
  lastReadAt,
  showAge,
  lastMoney,
}: {
  verdict: VerdictKey;
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

  const headline = lastReadHeadline(verdict, showAge ? lastReadAgeFrom(lastReadAt) : null);

  return (
    <div data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      <p data-last-read-verdict="">{headline}</p>
      {directionLine ? <p data-last-read-direction="">{directionLine}</p> : null}
    </div>
  );
}
