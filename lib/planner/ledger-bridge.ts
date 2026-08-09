/**
 * Money Reality — continuous ledger ↔ planner bridge.
 *
 * Design law: budget ledger is the cash-flow SoT (transactions + goal liquid).
 * The planner store is the Track workspace view. We never leave two writable
 * cash-flow truths without a sync pass.
 *
 * Contract:
 * 1. On hydrate / re-sync: if ledger has active txs → planner.transactions
 *    is replaced by the ledger projection (ledger wins by id).
 * 2. If ledger is empty and planner has txs → seed ledger from planner, then
 *    re-import (one adoption pass).
 * 3. Dual-write on planner add/delete keeps ledger current.
 * 4. When ledger reports liquid (goal), inject a synthetic checking account so
 *    Track runway (cash / outflow) matches Stand runway intent.
 */

import {
  addManualTransaction,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
  softDeleteTransaction,
  todayDateOnly,
  emptyBudgetLedger,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { dollarsToCents, centsToDollars } from "@/lib/finance/money";
import type { FinanceTransaction, TransactionType } from "@/lib/finance/ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";
import type { BankAccount, Transaction } from "@/lib/planner/types";
import { usePlannerStore } from "@/lib/planner/store";

const CATEGORY_TO_SLUG: Record<string, string> = {
  housing: "housing",
  food: "food",
  transport: "transport",
  utilities: "utilities",
  health: "health",
  entertainment: "entertainment",
  shopping: "shopping",
  debt: "debt",
  other: "other",
  salary: "salary",
  freelance: "freelance",
  investments: "investments",
};

const SLUG_TO_CATEGORY: Record<string, Transaction["category"]> = {
  housing: "housing",
  food: "food",
  transport: "transport",
  utilities: "utilities",
  health: "health",
  entertainment: "entertainment",
  shopping: "shopping",
  debt: "debt",
  other: "other",
  salary: "salary",
  freelance: "freelance",
  investments: "investments",
};

/** Synthetic account so Track runway uses ledger liquid when no bank accounts. */
export const LEDGER_LIQUID_ACCOUNT_ID = "acct_ledger_liquid";

function categoryIdForSlug(ledger: BudgetLedgerState, slug: string): string | null {
  const cat = ledger.categories.find(
    (c) =>
      c.slug === slug ||
      c.slug === `cat-${slug}` ||
      c.id === `cat-${slug}` ||
      c.name.toLowerCase() === slug,
  );
  return cat?.id ?? null;
}

function slugForCategoryId(ledger: BudgetLedgerState, categoryId: string | null): string | null {
  if (!categoryId) return null;
  const cat = ledger.categories.find((c) => c.id === categoryId);
  return cat?.slug ?? null;
}

export function ledgerTxToPlanner(
  tx: FinanceTransaction,
  ledger: BudgetLedgerState,
): Transaction | null {
  if (tx.deletedAt) return null;
  if (tx.status === "voided") return null;
  if (tx.type !== "income" && tx.type !== "expense") return null;
  const slug = slugForCategoryId(ledger, tx.categoryId);
  let category: Transaction["category"] = tx.type === "income" ? "salary" : "other";
  if (slug) {
    const key = slug.replace(/^cat-/, "");
    category = SLUG_TO_CATEGORY[key] ?? category;
  }
  return {
    id: tx.id.startsWith("tx_") ? tx.id : `tx_${tx.id}`,
    type: tx.type,
    amount: centsToDollars(Number(tx.amountCents)),
    category,
    note: tx.description || undefined,
    date: tx.transactionDate,
    source: tx.source === "plaid" ? "bank" : "manual",
  };
}

function plannerTxToLedgerInput(tx: Transaction, ledger: BudgetLedgerState, now: string) {
  const slug = CATEGORY_TO_SLUG[tx.category] ?? "other";
  let categoryId = categoryIdForSlug(ledger, slug);
  // Never drop expenses silently — fall back to system "other" / first expense cat.
  if (tx.type === "expense" && !categoryId) {
    categoryId =
      categoryIdForSlug(ledger, "other") ??
      ledger.categories.find((c) => c.categoryType === "expense")?.id ??
      null;
  }
  if (tx.type === "income" && !categoryId) {
    categoryId =
      categoryIdForSlug(ledger, "salary") ??
      ledger.categories.find((c) => c.categoryType === "income")?.id ??
      null;
  }
  return {
    type: tx.type as TransactionType,
    amountCents: dollarsToCents(tx.amount),
    description: tx.note ?? tx.category,
    transactionDate: tx.date || now,
    categoryId,
  };
}

function activeLedgerTxs(ledger: BudgetLedgerState): FinanceTransaction[] {
  return ledger.transactions.filter(
    (t) => !t.deletedAt && t.status !== "voided" && (t.type === "income" || t.type === "expense"),
  );
}

function seedLedgerFromPlanner(plannerTxs: Transaction[]): BudgetLedgerState {
  const now = todayDateOnly();
  const nowIso = new Date().toISOString();
  let ledger = hasSavedBudgetLedger() ? loadBudgetLedger(now) : emptyBudgetLedger(nowIso);
  const existingIds = new Set(ledger.transactions.map((t) => t.id));
  for (const tx of plannerTxs) {
    const bare = tx.id.replace(/^tx_/, "");
    if (existingIds.has(bare) || existingIds.has(tx.id)) continue;
    const input = plannerTxToLedgerInput(tx, ledger, now);
    if (tx.type === "expense" && !input.categoryId) continue;
    ledger = addManualTransaction(ledger, input, nowIso);
    // Preserve planner id on last-added when possible — addManualTransaction generates ids;
    // we still get content parity even if ids differ until next full re-import.
  }
  saveBudgetLedger(ledger);
  return loadBudgetLedger(now);
}

function liquidAccountFromLedger(ledger: BudgetLedgerState): BankAccount | null {
  const metrics = metricsFromLedger(ledger, new Date().toISOString(), null);
  const liquid = metrics.runway.liquidDollars;
  if (liquid == null || liquid <= 0) return null;
  return {
    id: LEDGER_LIQUID_ACCOUNT_ID,
    institution: "other",
    name:
      metrics.runway.liquidSource === "emergency_goal"
        ? "Emergency reserve (ledger)"
        : "Liquid proxy (ledger goal)",
    type: "checking",
    mask: "ledg",
    balance: liquid,
    available: liquid,
    currency: "USD",
    lastSyncedAt: new Date().toISOString(),
    status: "linked",
  };
}

/**
 * Continuous sync: ledger wins for transactions; liquid account mirrors ledger goal.
 * Safe to call on every Track hydrate and after dual-writes.
 */
export function syncPlannerWithLedger(): void {
  if (typeof window === "undefined") return;

  const state = usePlannerStore.getState();
  const now = todayDateOnly();

  let ledger: BudgetLedgerState | null = null;
  if (hasSavedBudgetLedger()) {
    ledger = loadBudgetLedger(now);
  }

  const ledgerActive = ledger ? activeLedgerTxs(ledger) : [];

  // Adoption: planner has cash-flow history, ledger does not yet.
  if (ledgerActive.length === 0 && state.transactions.length > 0) {
    ledger = seedLedgerFromPlanner(state.transactions);
  }

  if (!ledger && !hasSavedBudgetLedger()) {
    return;
  }
  if (!ledger) ledger = loadBudgetLedger(now);

  const imported = activeLedgerTxs(ledger)
    .map((t) => ledgerTxToPlanner(t, ledger!))
    .filter((t): t is Transaction => t !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Ledger SoT for cash-flow txs when it has data; otherwise leave planner txs.
  const nextTxs = imported.length > 0 ? imported : state.transactions;

  // Liquid account: replace synthetic only; keep real bank accounts.
  const withoutSynthetic = state.accounts.filter((a) => a.id !== LEDGER_LIQUID_ACCOUNT_ID);
  const liquidAcct = liquidAccountFromLedger(ledger);
  const nextAccounts = liquidAcct ? [...withoutSynthetic, liquidAcct] : withoutSynthetic;

  const txChanged =
    nextTxs.length !== state.transactions.length ||
    nextTxs.some((t, i) => t.id !== state.transactions[i]?.id || t.amount !== state.transactions[i]?.amount);
  const acctChanged =
    nextAccounts.length !== state.accounts.length ||
    nextAccounts.some((a) => {
      const prev = state.accounts.find((p) => p.id === a.id);
      return !prev || prev.balance !== a.balance;
    });

  if (txChanged || acctChanged) {
    usePlannerStore.setState({
      transactions: nextTxs,
      accounts: nextAccounts,
    });
  }
}

/** @deprecated name — continuous sync; kept for call-site compatibility. */
export function hydratePlannerFromLedger(): void {
  syncPlannerWithLedger();
}

export function dualWriteAddTransaction(tx: Transaction): void {
  try {
    const now = todayDateOnly();
    const nowIso = new Date().toISOString();
    let ledger = hasSavedBudgetLedger() ? loadBudgetLedger(now) : emptyBudgetLedger(nowIso);
    const input = plannerTxToLedgerInput(tx, ledger, now);
    if (tx.type === "expense" && !input.categoryId) {
      // Absolute last resort — should be rare after other fallback.
      return;
    }
    ledger = addManualTransaction(ledger, input, nowIso);
    // Prefer stable ids: rewrite last transaction id to planner bare id when unique.
    const bare = tx.id.replace(/^tx_/, "");
    const last = ledger.transactions[ledger.transactions.length - 1];
    if (last && !ledger.transactions.some((t) => t.id === bare && t.id !== last.id)) {
      ledger = {
        ...ledger,
        transactions: ledger.transactions.map((t) =>
          t.id === last.id ? { ...t, id: bare } : t,
        ),
      };
    }
    saveBudgetLedger(ledger);
    syncPlannerWithLedger();
  } catch {
    // best-effort dual-write
  }
}

export function dualWriteDeleteTransaction(plannerTxId: string): void {
  try {
    if (!hasSavedBudgetLedger()) return;
    const now = todayDateOnly();
    const nowIso = new Date().toISOString();
    let ledger = loadBudgetLedger(now);
    const id = plannerTxId.replace(/^tx_/, "");
    const existing = ledger.transactions.find(
      (t) => t.id === id || t.id === plannerTxId || `tx_${t.id}` === plannerTxId,
    );
    if (!existing || existing.deletedAt) return;
    ledger = softDeleteTransaction(ledger, existing.id, nowIso);
    saveBudgetLedger(ledger);
    syncPlannerWithLedger();
  } catch {
    // best-effort
  }
}
