"use client";

import { useEffect, useState } from "react";
import type { VerdictKey } from "@/lib/brand";
import {
  lastReadAgeDays,
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
 * Stale age (≥30d) + optional same-way direction.
 * Does not reprint the verdict. Never a next-band proximity claim.
 */
export function LastReadChrome({
  verdict,
  lastReadAt,
  lastMoney,
}: {
  verdict: VerdictKey;
  lastReadAt: string | null;
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

  const ageDays = lastReadAgeDays(lastReadAt);
  const headline = lastReadHeadline(verdict, ageDays, lastReadAgeFrom(lastReadAt));

  if (!headline && !directionLine) return null;

  return (
    <div data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      {headline ? <p data-last-read-age="">{headline}</p> : null}
      {directionLine ? <p data-last-read-direction="">{directionLine}</p> : null}
    </div>
  );
}
