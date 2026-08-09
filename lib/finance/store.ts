/**
 * Finance Command Dashboard — shared local-first state (audit T2.6).
 *
 * localStorage stays the synchronous source the UI reads and writes (an edit
 * can never be lost to a network blip), and a background sync layer
 * (lib/persistence.ts) mirrors it to the database for signed-in users so the
 * numbers follow them across devices. Anonymous visitors get exactly the old
 * localStorage-only behavior.
 *
 * SSR-safe: all reads/writes are guarded behind `typeof window` checks,
 * so importing this module on the server (or during the SSR render pass
 * of a client component) never throws.
 */

import { createSyncedResource, type Stamped } from "@/lib/persistence";

const STORAGE_KEY = "homi:finance";
/** ms-epoch stamp of the last local write — the LWW tiebreaker. Kept in a
 * separate key so the legacy `homi:finance` format (read directly by the
 * simulator and the Companion context) never changes shape. */
const STAMP_KEY = "homi:finance:updated-at";
/** ISO timestamp of the same write — the freshness signal financeSavedAt()
 * exposes to the Companion. Always derived from the LWW stamp so the two
 * keys can never disagree about when the numbers were saved. */
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
    // Stamp 0 means "legacy data of unknown age" — writing it as 1970 would
    // make the Companion claim the numbers are decades old.
    if (stamped.updatedAt > 0) {
      window.localStorage.setItem(SAVED_AT_KEY, new Date(stamped.updatedAt).toISOString());
    }
  } catch {
    // Storage may be unavailable (private browsing quota, etc). Fail silently —
    // the in-memory state still works for the current session.
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
 * signal the Companion discloses ("your numbers are N days old"). Null when
 * nothing has been saved or the timestamp predates this feature.
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
 * Persists finance state locally (synchronous) and queues a background sync
 * to the database for signed-in users. SSR-safe no-op on the server.
 */
export function saveFinanceState(state: FinanceState): void {
  const stamped: Stamped<FinanceState> = { value: state, updatedAt: Date.now() };
  writeLocal(stamped);
  financeSync.push(stamped);
}

/**
 * Reconcile with the server copy (last-write-wins) and return the freshest
 * state, hydrating localStorage with the winner. Anonymous and offline
 * sessions reconcile to the local copy (null only when nothing is stored
 * anywhere) — callers fall back to loadFinanceState() / defaults either way.
 * Call BEFORE the first saveFinanceState of a session: hydrating defaults
 * first and pulling second would push defaults over a user's real
 * cross-device numbers.
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

/**
 * Temperature gauges now live in lib/finance/temperature.ts — they are pure
 * threshold functions and belong to neither store. Re-exported here so this
 * module's public surface is unchanged for existing importers.
 */
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
