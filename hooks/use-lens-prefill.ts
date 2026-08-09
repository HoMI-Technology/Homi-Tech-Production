/**
 * useLensPrefill — the mount-only CFM seed for lens pages.
 *
 * Seeds come from buildCfm() (ledger-first). The `finance` object exposed for
 * impact deltas is a projection from the CFM so ledger and legacy paths share
 * one numeric spine — never a second ad-hoc localStorage read when ledger wins.
 */

"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { buildCfm, type CanonicalFinancialModel } from "@/lib/tools/cfm";
import { getLens, resolveLensSeeds } from "@/lib/tools/registry";
import { useCfm } from "@/hooks/use-cfm";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";

export interface LensPrefillState {
  /** Input keys seeded from the CFM — pass to fields as source="yours". */
  prefilled: Set<string>;
  /** Projection of CFM core for delta math, or null when no real picture. */
  finance: FinanceState | null;
  /** Lens overlay fields regardless of finance-save state. */
  overlay: ReturnType<typeof useCfm>["overlay"];
  /** False during SSR and first paint. */
  hydrated: boolean;
  /** Mark keys as user-confirmed after an explicit write-back. */
  markAll: (keys: string[]) => void;
}

/** Maps CFM core → legacy FinanceState shape for computeHousingDeltas etc. */
export function financeStateFromCfm(cfm: CanonicalFinancialModel): FinanceState {
  const num = (field: { value: number; source: string }) =>
    field.source === "missing" ? 0 : field.value;

  return {
    ...DEFAULT_FINANCE_STATE,
    monthlyIncome: num(cfm.core.monthlyIncome),
    monthlyExpenses: num(cfm.core.monthlyExpenses),
    monthlyDebtPayments: num(cfm.core.monthlyDebtPayments),
    liquidSavings: num(cfm.core.liquidSavings),
    totalDebt: num(cfm.core.totalDebt),
  };
}

export function useLensPrefill(
  lensId: string,
  apply: (key: string, value: number) => void,
): LensPrefillState {
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const { overlay, hydrated } = useCfm();

  useEffect(() => {
    const lens = getLens(lensId);
    if (!lens) return;
    const cfm = buildCfm();
    if (!cfm) return;

    setFinance(financeStateFromCfm(cfm));

    // Housing / DTI safety: do not prefill debt-related keys when debt is unknown.
    const seeds = resolveLensSeeds(lens, cfm);
    const keys = Object.keys(seeds).filter((key) => {
      if (
        (key === "debts" || key === "monthlyDebt" || key === "debtPayments") &&
        cfm.meta.hasDebtSignal === false
      ) {
        return false;
      }
      return true;
    });
    if (keys.length === 0) {
      track("lens_prefilled", {
        lens: lensId,
        count: 0,
        completeness: cfm.meta.completeness ?? "low",
        source: cfm.meta.source ?? "unknown",
      });
      return;
    }
    for (const key of keys) apply(key, seeds[key]);
    setPrefilled(new Set(keys));
    track("lens_prefilled", {
      lens: lensId,
      count: keys.length,
      completeness: cfm.meta.completeness ?? "low",
      source: cfm.meta.source ?? "unknown",
      hasDebtSignal: cfm.meta.hasDebtSignal ? 1 : 0,
    });
    // apply is a per-page dispatcher over stable setState functions; it
    // intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prefilled,
    finance,
    overlay,
    hydrated,
    markAll: (keys: string[]) => setPrefilled(new Set(keys)),
  };
}
