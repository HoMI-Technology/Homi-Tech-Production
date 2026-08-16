/**
 * Recurring capacity — fixed monthly obligations as readiness drag.
 * Separate store from finance cockpit so schema LWW stays stable.
 * Not a subscription-cancel product — capacity awareness only.
 */

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  /** Optional category label */
  category: string;
}

export interface RecurringCapacityState {
  items: RecurringItem[];
  updatedAt: string;
}

const STORAGE_KEY = "homi:recurring-capacity";

export function loadRecurringCapacity(): RecurringCapacityState {
  if (typeof window === "undefined") {
    return { items: [], updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], updatedAt: new Date(0).toISOString() };
    const parsed = JSON.parse(raw) as RecurringCapacityState;
    if (!parsed || !Array.isArray(parsed.items)) {
      return { items: [], updatedAt: new Date(0).toISOString() };
    }
    return {
      items: parsed.items.filter(
        (i) =>
          i &&
          typeof i.id === "string" &&
          typeof i.name === "string" &&
          typeof i.amount === "number" &&
          Number.isFinite(i.amount),
      ),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return { items: [], updatedAt: new Date(0).toISOString() };
  }
}

export function saveRecurringCapacity(state: RecurringCapacityState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}

export function totalRecurringMonthly(state: RecurringCapacityState): number {
  return state.items.reduce((s, i) => s + Math.max(0, i.amount), 0);
}

/**
 * Capacity after fixed recurring obligations.
 * remaining = income - expenses - debtPayments - recurring
 * (expenses may already include some recurring — user honesty required)
 */
export function capacityAfterRecurring(
  monthlyIncome: number,
  monthlyExpenses: number,
  monthlyDebtPayments: number,
  recurringTotal: number,
): number {
  return monthlyIncome - monthlyExpenses - monthlyDebtPayments - recurringTotal;
}

export function recurringDragRatio(
  monthlyIncome: number,
  recurringTotal: number,
): number | null {
  if (monthlyIncome <= 0) return null;
  return Math.min(1, Math.max(0, recurringTotal / monthlyIncome));
}
