/**
 * Debt payoff simulation — avalanche vs snowball.
 * Ported from production lib/tools/debt.ts.
 */

export interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number;
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

function simulate(
  debts: Debt[],
  extraMonthly: number,
  order: (d: Debt[]) => Debt[],
): PayoffResult {
  const working = debts.map((d) => ({ ...d }));
  const curve: PayoffPoint[] = [];
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const maxMonths = 1200;

  curve.push({
    month: 0,
    totalBalance: working.reduce((s, d) => s + d.balance, 0),
  });

  while (working.some((d) => d.balance > 0.005) && month < maxMonths) {
    month++;

    for (const d of working) {
      if (d.balance <= 0) continue;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.balance * monthlyRate;
      d.balance += interest;
      totalInterest += interest;
    }

    const active = working.filter((d) => d.balance > 0.005);
    const ordered = order(active);
    let pool = extraMonthly;

    for (const d of working) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
      totalPaid += pay;
    }

    const freedMinimums = debts
      .filter((orig) => {
        const cur = working.find((w) => w.id === orig.id);
        return cur && cur.balance <= 0.005;
      })
      .reduce((s, d) => s + d.minPayment, 0);
    pool += freedMinimums;

    for (const target of ordered) {
      if (pool <= 0) break;
      const cur = working.find((w) => w.id === target.id);
      if (!cur || cur.balance <= 0) continue;
      const pay = Math.min(pool, cur.balance);
      cur.balance -= pay;
      totalPaid += pay;
      pool -= pay;
    }

    curve.push({
      month,
      totalBalance: Math.max(
        0,
        working.reduce((s, d) => s + d.balance, 0),
      ),
    });
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    curve,
  };
}

export function simulateAvalanche(debts: Debt[], extraMonthly: number): PayoffResult {
  return simulate(debts, extraMonthly, (d) => [...d].sort((a, b) => b.apr - a.apr));
}

export function simulateSnowball(debts: Debt[], extraMonthly: number): PayoffResult {
  return simulate(debts, extraMonthly, (d) =>
    [...d].sort((a, b) => a.balance - b.balance),
  );
}

export interface DebtComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  interestSaved: number;
}

export function compareStrategies(
  debts: Debt[],
  extraMonthly: number,
): DebtComparison {
  const avalanche = simulateAvalanche(debts, extraMonthly);
  const snowball = simulateSnowball(debts, extraMonthly);
  return {
    avalanche,
    snowball,
    interestSaved:
      Math.round((snowball.totalInterest - avalanche.totalInterest) * 100) / 100,
  };
}
