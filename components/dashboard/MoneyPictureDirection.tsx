"use client";

import { useEffect, useState } from "react";
import {
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
 * Optional same-way direction vs last assessment inputs.
 * Mixed / unchanged / missing any of the three → omit. Not a verdict claim.
 */
export function MoneyPictureDirection({ lastMoney }: { lastMoney: LastReadMoneyInputs }) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSavedBudgetLedger()) {
      setLine(null);
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
    setLine(moneyPictureDirectionLine(direction));
  }, [lastMoney]);

  if (!line) return null;
  return <p data-last-read-direction="">{line}</p>;
}
