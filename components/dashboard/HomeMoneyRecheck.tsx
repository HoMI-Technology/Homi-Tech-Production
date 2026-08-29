"use client";

import { useEffect, useState } from "react";
import { MoneyRecheckPrompt } from "@/components/money/MoneyRecheckPrompt";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger, type NamedMoneyMetrics } from "@/lib/finance/metrics";

/**
 * Below-fold Wave 1 island only. Does not paint the money standing strip.
 * Band-cross prompt: "Your money picture changed. Re-check readiness?"
 */
export function HomeMoneyRecheck() {
  const [metrics, setMetrics] = useState<NamedMoneyMetrics | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasSavedBudgetLedger()) {
      setMetrics(null);
      setReady(true);
      return;
    }
    const nowIso = new Date().toISOString();
    setMetrics(metricsFromLedger(loadBudgetLedger(nowIso), nowIso, budgetLedgerSavedAt()));
    setReady(true);
  }, []);

  if (!ready || !metrics) return null;
  return (
    <div className="mt-5" data-home-money-recheck="">
      <MoneyRecheckPrompt metrics={metrics} />
    </div>
  );
}
