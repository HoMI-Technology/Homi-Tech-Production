/**
 * Debt payoff simulation — avalanche (highest APR first) vs
 * snowball (smallest balance first) strategies.
 * Pure functions, deterministic, no side effects.
 */

export interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number; // annual percentage, e.g. 22.9
  minPayment: number;
}

export interface PayoffPoint {
  month: number;
  totalBalance: number;
}

export interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  curve: PayoffPoint[];
}

/**
 * Simulates payoff of a debt list under a given ordering strategy.
 * Extra monthly payment beyond the minimums is funneled to the debt
 * at the front of the order; once it's paid off, its minimum payment
 * rolls into the next debt (the classic "snowball" rolling behavior,
 * which both strategies share — they only differ in ordering).
 */
function simulate(debts: Debt[], extraMonthly: number, order: (d: Debt[]) => Debt[]): PayoffResult {
  // Deep copy working balances
  let working = debts.map((d) => ({ ...d }));
  const curve: PayoffPoint[] = [];
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const maxMonths = 1200; // 100 years safety cap

  curve.push({ month: 0, totalBalance: working.reduce((s, d) => s + d.balance, 0) });

  while (working.some((d) => d.balance > 0.005) && month < maxMonths) {
    month++;

    // Apply interest for the month
    for (const d of working) {
      if (d.balance <= 0) continue;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.balance * monthlyRate;
      d.balance += interest;
      totalInterest += interest;
    }

    // Ordered list of debts still owing, per strategy
    const active = working.filter((d) => d.balance > 0.005);
    const ordered = order(active);

    // Pool = sum of minimums for active debts + extra
    // Debts that are fully paid off contribute their old minimum to the pool
    // via extraMonthly staying constant and freed minimums accumulating below.
    let pool = extraMonthly;

    // Pay minimums first (or full balance if less than minimum)
    for (const d of working) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
      totalPaid += pay;
    }

    // Freed-up minimums from already-paid-off debts roll into the pool
    const freedMinimums = debts
      .filter((orig) => {
        const cur = working.find((w) => w.id === orig.id);
        return cur && cur.balance <= 0.005;
      })
      .reduce((s, d) => s + d.minPayment, 0);
    pool += freedMinimums;

    // Apply pool (extra + freed minimums) to the ordered target debts
    for (const target of ordered) {
      if (pool <= 0) break;
      const cur = working.find((w) => w.id === target.id);
      if (!cur || cur.balance <= 0) continue;
      const pay = Math.min(pool, cur.balance);
      cur.balance -= pay;
      totalPaid += pay;
      pool -= pay;
    }

    curve.push({ month, totalBalance: Math.max(0, working.reduce((s, d) => s + d.balance, 0)) });
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    curve,
  };
}

/** Highest APR first. */
export function simulateAvalanche(debts: Debt[], extraMonthly: number): PayoffResult {
  return simulate(debts, extraMonthly, (d) => [...d].sort((a, b) => b.apr - a.apr));
}

/** Smallest balance first. */
export function simulateSnowball(debts: Debt[], extraMonthly: number): PayoffResult {
  return simulate(debts, extraMonthly, (d) => [...d].sort((a, b) => a.balance - b.balance));
}

export interface DebtComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  interestSaved: number;
}

export function compareStrategies(debts: Debt[], extraMonthly: number): DebtComparison {
  const avalanche = simulateAvalanche(debts, extraMonthly);
  const snowball = simulateSnowball(debts, extraMonthly);
  return {
    avalanche,
    snowball,
    interestSaved: Math.round((snowball.totalInterest - avalanche.totalInterest) * 100) / 100,
  };
}
