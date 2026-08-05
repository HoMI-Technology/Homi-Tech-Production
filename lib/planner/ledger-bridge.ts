/**
 * Bridge planner transactions ↔ budget ledger (PR4).
 * Prefer ledger as SoT when it has data and planner txs are empty.
 * Dual-write on planner add/delete keeps both in sync.
 */

import {
  addManualTransaction,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
  softDeleteTransaction,
  todayDateOnly,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { dollarsToCents, centsToDollars } from "@/lib/finance/money";
import type { FinanceTransaction, TransactionType } from "@/lib/finance/ledger";
import type { Transaction } from "@/lib/planner/types";
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

function categoryIdForSlug(
  ledger: BudgetLedgerState,
  slug: string,
): string | null {
  const cat = ledger.categories.find(
    (c) => c.slug === slug || c.slug === `cat-${slug}` || c.name.toLowerCase() === slug,
  );
  return cat?.id ?? null;
}

function slugForCategoryId(
  ledger: BudgetLedgerState,
  categoryId: string | null,
): string | null {
  if (!categoryId) return null;
  const cat = ledger.categories.find((c) => c.id === categoryId);
  return cat?.slug ?? null;
}

export function ledgerTxToPlanner(
  tx: FinanceTransaction,
  ledger: BudgetLedgerState,
): Transaction | null {
  if (tx.deletedAt) return null;
  if (tx.type !== "income" && tx.type !== "expense") return null;
  const slug = slugForCategoryId(ledger, tx.categoryId);
  let category: Transaction["category"] =
    tx.type === "income" ? "salary" : "other";
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

export function hydratePlannerFromLedger(): void {
  if (typeof window === "undefined") return;
  if (!hasSavedBudgetLedger()) return;
  const state = usePlannerStore.getState();
  if (state.transactions.length > 0) return;

  const now = todayDateOnly();
  const ledger = loadBudgetLedger(now);
  const imported = ledger.transactions
    .map((t) => ledgerTxToPlanner(t, ledger))
    .filter((t): t is Transaction => t !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (imported.length === 0) return;
  usePlannerStore.setState({ transactions: imported });
}

export function dualWriteAddTransaction(tx: Transaction): void {
  try {
    const now = todayDateOnly();
    const nowIso = new Date().toISOString();
    let ledger = loadBudgetLedger(now);
    const slug = CATEGORY_TO_SLUG[tx.category] ?? "other";
    const categoryId = categoryIdForSlug(ledger, slug);
    if (tx.type === "expense" && !categoryId) {
      // Skip dual-write rather than throw — ledger requires category for expenses.
      return;
    }
    ledger = addManualTransaction(
      ledger,
      {
        type: tx.type as TransactionType,
        amountCents: dollarsToCents(tx.amount),
        description: tx.note ?? tx.category,
        transactionDate: tx.date || now,
        categoryId,
      },
      nowIso,
    );
    saveBudgetLedger(ledger);
  } catch {
    // best-effort dual-write
  }
}

export function dualWriteDeleteTransaction(plannerTxId: string): void {
  try {
    const now = todayDateOnly();
    const nowIso = new Date().toISOString();
    let ledger = loadBudgetLedger(now);
    const id = plannerTxId.replace(/^tx_/, "");
    const existing = ledger.transactions.find(
      (t) =>
        t.id === id || t.id === plannerTxId || `tx_${t.id}` === plannerTxId,
    );
    if (!existing || existing.deletedAt) return;
    ledger = softDeleteTransaction(ledger, existing.id, nowIso);
    saveBudgetLedger(ledger);
  } catch {
    // best-effort
  }
}
