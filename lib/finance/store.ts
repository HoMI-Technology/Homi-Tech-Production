/**
 * @deprecated LEGACY monthly-snapshot store — retired as the money source of
 * truth (docs/ops/MONEY-LEDGER-MIGRATION.md, kill date 2026-09-15).
 *
 * The budget ledger (lib/finance/local-ledger.ts + lib/finance/ledger.ts,
 * `homi:budget-ledger` + server `finance_*` tables) is the SSOT. This module
 * remains ONLY as:
 *   - a read fallback for clients that never touched the ledger
 *     (buildCfm / advisor / readiness check `hasSavedBudgetLedger()` first), and
 *   - the input shape for the one-time legacy → ledger import
 *     (lib/finance/migrate-from-legacy.ts).
 *
 * No app code may write through saveFinanceState() anymore — the Phase-1
 * dual-write helper was removed at the Phase-3 kill, and PUT
 * /api/finance-state now answers 410. New money features read the ledger.
 *
 * localStorage stays the synchronous source the UI reads (an edit
 * can never be lost to a network blip). SSR-safe: all reads/writes are
 * guarded behind `typeof window` checks.
 */

import { createSyncedResource, type Stamped } from "@/lib/persistence";

const STORAGE_KEY = "homi:finance";
/** ms-epoch stamp of the last local write — the LWW tiebreaker. */
const STAMP_KEY = "homi:finance:updated-at";
/** ISO timestamp of the same write — the freshness signal financeSavedAt()
 * exposes to the Companion. */
const SAVED_AT_KEY = "homi:finance:saved-at";

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
}

export interface FinanceAsset {
  id: string;
  name: string;
  amount: number;
}

export interface FinanceLiability {
  id: string;
  name: string;
  amount: number;
}

export interface FinanceState {
  /** Overview inputs */
  monthlyIncome: number;
  monthlyExpenses: number;
  liquidSavings: number;
  totalDebt: number;
  monthlyDebtPayments: number;

  /** Cash Flow tab */
  expenseCategories: ExpenseCategory[];

  /** Monte Carlo tab */
  downPaymentTarget: number;
  monteCarloYears: number;
  expectedReturnPct: number;
  volatilityPct: number;

  /** Net Worth tab */
  assets: FinanceAsset[];
  liabilities: FinanceLiability[];
}

export const DEFAULT_FINANCE_STATE: FinanceState = {
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  liquidSavings: 18000,
  totalDebt: 22000,
  monthlyDebtPayments: 650,

  expenseCategories: [
    { id: "cat-rent", name: "Rent / mortgage", amount: 1800 },
    { id: "cat-food", name: "Food", amount: 650 },
    { id: "cat-transport", name: "Transportation", amount: 350 },
    { id: "cat-utilities", name: "Utilities", amount: 280 },
    { id: "cat-other", name: "Everything else", amount: 1120 },
  ],

  downPaymentTarget: 60000,
  monteCarloYears: 5,
  expectedReturnPct: 5,
  volatilityPct: 8,

  assets: [
    { id: "asset-cash", name: "Cash & savings", amount: 18000 },
    { id: "asset-retirement", name: "Retirement accounts", amount: 32000 },
  ],
  liabilities: [{ id: "liability-debt", name: "Credit cards & loans", amount: 22000 }],
};

/**
 * Whether the user has actually saved finance data, as opposed to the
 * defaults `loadFinanceState` falls back to. Consumers that speak in the
 * user's voice (the Companion context builder) must check this first —
 * quoting the placeholder numbers back to a user as "your numbers" would
 * be a lie.
 */
export function hasSavedFinanceState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Loads finance state from localStorage, merged over defaults. SSR-safe. */
export function loadFinanceState(): FinanceState {
  if (typeof window === "undefined") return DEFAULT_FINANCE_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINANCE_STATE;
    const parsed = JSON.parse(raw) as Partial<FinanceState>;
    return { ...DEFAULT_FINANCE_STATE, ...parsed };
  } catch {
    return DEFAULT_FINANCE_STATE;
  }
}

/** Local write WITHOUT a sync push — the sync layer itself uses this. */
function writeLocal(stamped: Stamped<FinanceState>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped.value));
    window.localStorage.setItem(STAMP_KEY, String(stamped.updatedAt));
    if (stamped.updatedAt > 0) {
      window.localStorage.setItem(SAVED_AT_KEY, new Date(stamped.updatedAt).toISOString());
    }
  } catch {
    // Storage may be unavailable (private browsing quota, etc). Fail silently.
  }
}

/** The local copy with its LWW stamp; legacy data without a stamp reads 0. */
function loadStampedFinanceState(): Stamped<FinanceState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinanceState>;
    const stampRaw = window.localStorage.getItem(STAMP_KEY);
    const updatedAt = stampRaw ? Number.parseInt(stampRaw, 10) : 0;
    return {
      value: { ...DEFAULT_FINANCE_STATE, ...parsed },
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * When the user last saved finance data, as an ISO timestamp — the freshness
 * signal the Companion discloses ("your numbers are N days old").
 */
export function financeSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SAVED_AT_KEY);
  } catch {
    return null;
  }
}

const financeSync = createSyncedResource<FinanceState>({
  endpoint: "/api/finance-state",
  loadLocal: loadStampedFinanceState,
  saveLocal: writeLocal,
});

/**
 * @deprecated Phase-3 kill (docs/ops/MONEY-LEDGER-MIGRATION.md): no app code
 * may call this — the ledger is the only writable money store and PUT
 * /api/finance-state is gone (410). Retained solely so existing tests can
 * fixture a legacy snapshot for the read-fallback paths. The background sync
 * push now fails harmlessly against the retired endpoint.
 */
export function saveFinanceState(state: FinanceState): void {
  const stamped: Stamped<FinanceState> = { value: state, updatedAt: Date.now() };
  writeLocal(stamped);
  financeSync.push(stamped);
}

/**
 * Read-side reconcile with the server copy (last-write-wins). Kept during
 * the transition window so old cross-device snapshots can still hydrate the
 * one-time legacy → ledger import; the server route is read-only now.
 */
export async function pullFinanceState(): Promise<FinanceState | null> {
  const result = await financeSync.pull();
  return result?.value ?? null;
}

/** Derived read: net cash flow (income - expenses - debt payments). */
export function netCashFlow(state: FinanceState): number {
  return state.monthlyIncome - state.monthlyExpenses - state.monthlyDebtPayments;
}

/** Derived read: savings rate as a percentage of gross monthly income. */
export function savingsRate(state: FinanceState): number {
  if (state.monthlyIncome <= 0) return 0;
  return (netCashFlow(state) / state.monthlyIncome) * 100;
}

/** Derived read: runway in months = liquid savings / total monthly outflow. */
export function runwayMonths(state: FinanceState): number {
  const outflow = state.monthlyExpenses + state.monthlyDebtPayments;
  if (outflow <= 0) return Infinity;
  return state.liquidSavings / outflow;
}

/** Derived read: debt-to-income ratio as a percentage. */
export function debtToIncome(state: FinanceState): number {
  if (state.monthlyIncome <= 0) return 0;
  return (state.monthlyDebtPayments / state.monthlyIncome) * 100;
}

export type { Temperature } from "./temperature";
export {
  dtiTemperature,
  savingsRateTemperature,
  runwayTemperature,
  cashFlowTemperature,
} from "./temperature";

export function totalNetWorth(state: FinanceState): number {
  const assets = state.assets.reduce((s, a) => s + a.amount, 0);
  const liabilities = state.liabilities.reduce((s, l) => s + l.amount, 0);
  return assets - liabilities;
}
