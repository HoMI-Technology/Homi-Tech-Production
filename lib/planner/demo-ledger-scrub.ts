/**
 * Wipe leftover first-visit demo money from planner persist and the local ledger.
 * Sample numbers must not stay as live cash after #418.
 */

import {
  emptyBudgetLedger,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
  todayDateOnly,
} from "@/lib/finance/local-ledger";
import { centsToDollars } from "@/lib/finance/money";
import type { FinanceTransaction } from "@/lib/finance/ledger";
import { plannerWorkspaceIsDemo } from "@/lib/planner/derived";
import { usePlannerStore } from "@/lib/planner/store";

/** Amount + note from `buildDemoSeed` — dates are relative, so they are not part of the key. */
export const DEMO_TX_FINGERPRINTS: readonly { note: string; amount: number }[] = [
  { note: "Coffee runs", amount: 42 },
  { note: "Groceries midweek", amount: 178 },
  { note: "Student loan", amount: 220 },
  { note: "Rent", amount: 1850 },
  { note: "Groceries", amount: 312 },
  { note: "Biweekly paycheck", amount: 6200 },
  { note: "Fuel + transit", amount: 86 },
  { note: "Electric + internet", amount: 148 },
  { note: "Consulting weekend", amount: 450 },
  { note: "Streaming + dinner out", amount: 64 },
  { note: "Household essentials", amount: 119 },
  { note: "Pharmacy", amount: 48 },
  { note: "Groceries prior", amount: 248 },
  { note: "Amazon haul", amount: 210 },
  { note: "Concert tickets", amount: 92 },
] as const;

const DEMO_FP = new Set(DEMO_TX_FINGERPRINTS.map((row) => `${row.note}:${row.amount}`));

export function ledgerLooksLikeDemo(
  txs: Pick<FinanceTransaction, "description" | "amountCents" | "deletedAt">[],
): boolean {
  const live = txs.filter((tx) => tx.deletedAt == null);
  if (live.length === 0) return false;
  const hits = live.filter((tx) => DEMO_FP.has(`${tx.description}:${centsToDollars(tx.amountCents)}`));
  return hits.length >= 8;
}

/** Returns true when leftover sample data was removed. */
export function scrubPersistedDemoWorkspace(): boolean {
  if (typeof window === "undefined") return false;

  const state = usePlannerStore.getState();
  const plannerDemo = plannerWorkspaceIsDemo(state);
  const now = todayDateOnly();
  const ledger = hasSavedBudgetLedger() ? loadBudgetLedger(now) : null;
  const ledgerDemo = ledger ? ledgerLooksLikeDemo(ledger.transactions) : false;

  if (!plannerDemo && !ledgerDemo) return false;

  if (plannerDemo) {
    state.clearWorkspace();
  }
  if (ledgerDemo) {
    saveBudgetLedger(emptyBudgetLedger(new Date().toISOString()));
  }
  return true;
}
