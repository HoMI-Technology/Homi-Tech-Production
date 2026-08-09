/**
 * Ledger seeds — pre-fill lens inputs from the user's real numbers.
 *
 * Ported from the local planner build, where these read a client-side Zustand
 * store directly. Here the same shape is adapted from the Canonical Financial
 * Model, so the panels stay identical while the money picture keeps coming from
 * the one sanctioned source (ledger first, legacy snapshot during migration).
 *
 * `hydrated` is false during SSR and first paint so panels can render the same
 * markup on both sides of hydration; `seeded` is false when the user has saved
 * no money data at all, which is the honesty gate — panels fall back to
 * illustrative defaults and must say so rather than implying these are the
 * user's figures.
 */

"use client";

import { useMemo } from "react";
import { useCfm } from "@/hooks/use-cfm";

export type LedgerSeeds = {
  /** Average monthly income from the money picture, ×12. */
  annualIncome: number;
  monthlyIncome: number;
  /** Recurring monthly debt payments. */
  monthlyDebts: number;
  /** Total outstanding debt. */
  totalDebt: number;
  /** Monthly expenses + debt payments. */
  monthlyOutflow: number;
  /** Cash on hand. */
  liquidSavings: number;
  /** Saved toward the house down-payment goal (undefined when none). */
  downPaymentSaved?: number;
  /** Net cash flow (can be negative). */
  monthlyCashFlow: number;
  /** Invested portfolio value (excludes cash). */
  invested: number;
};

export interface SeedState {
  seeds: LedgerSeeds;
  /** True once the CFM has hydrated on the client. */
  hydrated: boolean;
  /** True when these came from the user's saved money picture, not defaults. */
  seeded: boolean;
}

/**
 * Illustrative defaults for a signed-out or empty state. Deliberately round
 * numbers so they never read as somebody's real figures.
 */
const DEFAULT_SEEDS: LedgerSeeds = {
  annualIncome: 90_000,
  monthlyIncome: 7_500,
  monthlyDebts: 450,
  totalDebt: 18_000,
  monthlyOutflow: 4_200,
  liquidSavings: 18_000,
  downPaymentSaved: undefined,
  monthlyCashFlow: 900,
  invested: 25_000,
};

export function useLedgerSeeds(): SeedState {
  const { cfm, hydrated } = useCfm();

  return useMemo(() => {
    if (!cfm) {
      return { seeds: DEFAULT_SEEDS, hydrated, seeded: false };
    }

    const monthlyIncome = cfm.core.monthlyIncome.value;
    const monthlyDebts = cfm.core.monthlyDebtPayments.value;
    const downPaymentSaved = cfm.housing.downPaymentSaved.value;

    return {
      seeds: {
        annualIncome: Math.round(monthlyIncome * 12),
        monthlyIncome: Math.round(monthlyIncome),
        monthlyDebts,
        totalDebt: cfm.core.totalDebt.value,
        monthlyOutflow: cfm.core.monthlyExpenses.value + monthlyDebts,
        liquidSavings: cfm.core.liquidSavings.value,
        // Undefined rather than 0 — "no house goal" is not "saved nothing".
        downPaymentSaved: downPaymentSaved > 0 ? downPaymentSaved : undefined,
        monthlyCashFlow: cfm.derived.netCashFlow,
        invested: cfm.horizon.investedAssets.value,
      },
      hydrated,
      seeded: true,
    };
  }, [cfm, hydrated]);
}
