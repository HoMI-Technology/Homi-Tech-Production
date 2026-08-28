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
 * Empty until there is real data.
 *
 * These were illustrative figures — $90k income, $18k saved — shown whenever a
 * user had no money picture. Even labelled as illustrative, a lens pre-filled
 * with somebody else's numbers reads as a statement about *your* money, and a
 * calculator that starts from an invented salary quietly anchors every answer
 * it gives.
 *
 * Zero is the honest start. The inputs stay editable, so a signed-out visitor
 * types their own numbers and gets real math on them; nothing is ever displayed
 * as theirs that they did not enter or connect.
 */
const EMPTY_SEEDS: LedgerSeeds = {
  annualIncome: 0,
  monthlyIncome: 0,
  monthlyDebts: 0,
  totalDebt: 0,
  monthlyOutflow: 0,
  liquidSavings: 0,
  downPaymentSaved: undefined,
  monthlyCashFlow: 0,
  invested: 0,
};

/** True when the seed object carries the user's picture, not empty defaults. */
export function ledgerSeedsAreOwn(seeds: LedgerSeeds): boolean {
  return (
    seeds.annualIncome > 0 ||
    seeds.monthlyIncome > 0 ||
    seeds.monthlyDebts > 0 ||
    seeds.totalDebt > 0 ||
    seeds.monthlyOutflow > 0 ||
    seeds.liquidSavings > 0 ||
    seeds.monthlyCashFlow !== 0 ||
    seeds.invested > 0 ||
    seeds.downPaymentSaved != null
  );
}

export function useLedgerSeeds(): SeedState {
  const { cfm, hydrated } = useCfm();

  return useMemo(() => {
    if (!cfm) {
      return { seeds: EMPTY_SEEDS, hydrated, seeded: false };
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
