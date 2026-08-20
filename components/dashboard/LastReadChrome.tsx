"use client";

import { useEffect, useState } from "react";
import type { VerdictKey } from "@/lib/brand";
import {
  lastReadAgeFrom,
  lastReadSentence,
  moneyPictureImproved,
  type LastReadMoneyInputs,
} from "@/lib/dashboard/last-read-chrome";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";

/**
 * One sentence on the existing scored fold. Not a second card.
 * Closer-to uses last assessment inputs vs Money — never a new score.
 */
export function LastReadChrome({
  verdict,
  lastReadAt,
  showAge,
  lastMoney,
  hardStop,
}: {
  verdict: VerdictKey;
  lastReadAt: string | null;
  showAge: boolean;
  lastMoney: LastReadMoneyInputs | null;
  hardStop: boolean;
}) {
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    if (!lastMoney || !hasSavedBudgetLedger()) {
      setImproving(false);
      return;
    }
    const nowIso = new Date().toISOString();
    const metrics = metricsFromLedger(loadBudgetLedger(nowIso), nowIso, budgetLedgerSavedAt());
    setImproving(
      moneyPictureImproved({
        lastDtiRatio: lastMoney.debtToIncomeRatio,
        lastEmergencyFundMonths: lastMoney.emergencyFundMonths,
        lastSavingsRateRatio: lastMoney.savingsRate,
        currentDtiPercent: metrics.dti.pct,
        currentEmergencyFundMonths: metrics.runway.months,
        currentSavingsRatePercent: metrics.savingsRatePct,
      }),
    );
  }, [lastMoney]);

  const sentence = lastReadSentence({
    verdict,
    age: showAge ? lastReadAgeFrom(lastReadAt) : null,
    improving,
    hardStop,
  });
  if (!sentence) return null;

  return (
    <p data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      {sentence}
    </p>
  );
}
