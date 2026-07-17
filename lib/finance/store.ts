/**
 * Finance Command Dashboard — shared localStorage-backed state.
 * SSR-safe: all reads/writes are guarded behind `typeof window` checks,
 * so importing this module on the server (or during the SSR render pass
 * of a client component) never throws.
 */

const STORAGE_KEY = "homi:finance";
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
  liabilities: [
    { id: "liability-debt", name: "Credit cards & loans", amount: 22000 },
  ],
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

/** Persists finance state to localStorage. SSR-safe no-op on the server. */
export function saveFinanceState(state: FinanceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem(SAVED_AT_KEY, new Date().toISOString());
  } catch {
    // Storage may be unavailable (private browsing quota, etc). Fail silently —
    // the in-memory state still works for the current session.
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

export type Temperature = "emerald" | "yellow" | "amber" | "crimson";

/** DTI temperature per canon: <=28% emerald, <=36% yellow, <=43% amber, >43% crimson. */
export function dtiTemperature(dti: number): Temperature {
  if (dti <= 28) return "emerald";
  if (dti <= 36) return "yellow";
  if (dti <= 43) return "amber";
  return "crimson";
}

/** Savings-rate temperature: higher is better. */
export function savingsRateTemperature(rate: number): Temperature {
  if (rate >= 20) return "emerald";
  if (rate >= 10) return "yellow";
  if (rate >= 0) return "amber";
  return "crimson";
}

/** Runway temperature: months of liquid savings covering outflow. */
export function runwayTemperature(months: number): Temperature {
  if (!Number.isFinite(months) || months >= 6) return "emerald";
  if (months >= 3) return "yellow";
  if (months >= 1) return "amber";
  return "crimson";
}

/** Net-cash-flow temperature: positive vs. negative surplus. */
export function cashFlowTemperature(flow: number, income: number): Temperature {
  if (income <= 0) return "amber";
  const ratio = flow / income;
  if (ratio >= 0.15) return "emerald";
  if (ratio >= 0.05) return "yellow";
  if (ratio >= 0) return "amber";
  return "crimson";
}

export function totalNetWorth(state: FinanceState): number {
  const assets = state.assets.reduce((s, a) => s + a.amount, 0);
  const liabilities = state.liabilities.reduce((s, l) => s + l.amount, 0);
  return assets - liabilities;
}
