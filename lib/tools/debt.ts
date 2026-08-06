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

/* ------------------------------------------------------------------ */
/* Consolidation — roll every balance into one fixed-term loan.        */
/*                                                                     */
/* One new loan pays off the old debts, so the borrower is left with a */
/* single fixed monthly payment at one APR. This only helps when the   */
/* loan APR beats the weighted-average APR of the debts it replaces —  */
/* stretching a long term can lower the payment while raising the      */
/* lifetime cost, so the honest comparison is total cash paid, not the */
/* monthly number. All estimates are educational, never a loan offer.  */
/* ------------------------------------------------------------------ */

export interface ConsolidationLoan {
  apr: number; // annual percentage on the new loan
  termMonths: number; // fixed repayment term, e.g. 36 / 48 / 60
  feePct: number; // origination fee as % of the balances financed
}

export interface ConsolidationResult extends PayoffResult {
  /** Balances rolled in + origination fee — the loan principal. */
  financedAmount: number;
  originationFee: number;
  /** Fully-amortizing base payment for the term (before any extra). */
  monthlyPayment: number;
}

/** Total of every balance on the board. */
export function totalBalance(debts: Debt[]): number {
  return debts.reduce((s, d) => s + Math.max(0, d.balance), 0);
}

/** Balance-weighted average APR of the current debts (0 when no balance). */
export function weightedAverageApr(debts: Debt[]): number {
  const total = totalBalance(debts);
  if (total <= 0) return 0;
  const weighted = debts.reduce((s, d) => s + Math.max(0, d.balance) * d.apr, 0);
  return Math.round((weighted / total) * 100) / 100;
}

/** Standard fully-amortizing monthly payment for a fixed-term loan. */
export function amortizedPayment(principal: number, aprPct: number, termMonths: number): number {
  if (termMonths <= 0 || principal <= 0) return 0;
  const r = aprPct / 100 / 12;
  if (r <= 0) return principal / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

/**
 * Simulates paying off a single consolidation loan. The old balances plus
 * the origination fee become the loan principal; the borrower pays the
 * amortizing payment (plus any extra) until the loan clears. Extra payments
 * shorten the term and cut interest, exactly like the strategy simulator.
 */
export function simulateConsolidation(
  debts: Debt[],
  loan: ConsolidationLoan,
  extraMonthly: number,
): ConsolidationResult {
  const principalDebt = totalBalance(debts);
  const originationFee = Math.max(0, (principalDebt * loan.feePct) / 100);
  const financedAmount = principalDebt + originationFee;
  const monthlyPayment = amortizedPayment(financedAmount, loan.apr, loan.termMonths);

  const curve: PayoffPoint[] = [{ month: 0, totalBalance: financedAmount }];

  if (financedAmount <= 0.005) {
    return { months: 0, totalInterest: 0, totalPaid: 0, curve, financedAmount, originationFee, monthlyPayment };
  }

  const monthlyRate = loan.apr / 100 / 12;
  const payment = monthlyPayment + Math.max(0, extraMonthly);
  let balance = financedAmount;
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const maxMonths = 1200; // 100-year safety cap, matches the strategy simulator

  while (balance > 0.005 && month < maxMonths) {
    month++;
    const interest = balance * monthlyRate;
    balance += interest;
    totalInterest += interest;
    const pay = Math.min(payment, balance);
    balance -= pay;
    totalPaid += pay;
    curve.push({ month, totalBalance: Math.max(0, balance) });
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    // The financed fee is real money the borrower repays through the loan, so
    // it is already inside totalPaid — no need to add it a second time.
    financedAmount: Math.round(financedAmount * 100) / 100,
    originationFee: Math.round(originationFee * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    curve,
  };
}

export type PayoffMethodId = "avalanche" | "snowball" | "consolidation";

export interface RankedMethod {
  method: PayoffMethodId;
  label: string;
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Fixed monthly payment for consolidation; null for the rolling strategies. */
  monthlyPayment: number | null;
  eligible: boolean;
}

export interface PayoffRecommendation {
  best: PayoffMethodId;
  reason: string;
  ranked: RankedMethod[];
  /** Loan modeled and it actually costs less total than staying put. */
  consolidationEligible: boolean;
  weightedApr: number;
  /** Total cash saved by the best method vs. the most expensive option. */
  savingsVsWorst: number;
}

/**
 * Ranks avalanche, snowball, and (when a loan is supplied) consolidation by
 * total cash paid to reach zero — the honest measure of "cheapest way out."
 * Ties break toward the faster payoff. Consolidation is only flagged eligible
 * when it beats the cheaper of the two strategies on total cost, so a
 * lower-payment-but-pricier loan never masquerades as the best move.
 */
export function recommendPayoff(
  debts: Debt[],
  extraMonthly: number,
  loan?: ConsolidationLoan,
): PayoffRecommendation {
  const comparison = compareStrategies(debts, extraMonthly);
  const ranked: RankedMethod[] = [
    {
      method: "avalanche",
      label: "Avalanche",
      months: comparison.avalanche.months,
      totalInterest: comparison.avalanche.totalInterest,
      totalPaid: comparison.avalanche.totalPaid,
      monthlyPayment: null,
      eligible: true,
    },
    {
      method: "snowball",
      label: "Snowball",
      months: comparison.snowball.months,
      totalInterest: comparison.snowball.totalInterest,
      totalPaid: comparison.snowball.totalPaid,
      monthlyPayment: null,
      eligible: true,
    },
  ];

  const bestStrategyPaid = Math.min(
    comparison.avalanche.totalPaid,
    comparison.snowball.totalPaid,
  );
  let consolidationEligible = false;

  if (loan && totalBalance(debts) > 0 && loan.termMonths > 0) {
    const con = simulateConsolidation(debts, loan, extraMonthly);
    consolidationEligible = con.totalPaid < bestStrategyPaid;
    ranked.push({
      method: "consolidation",
      label: "Consolidation loan",
      months: con.months,
      totalInterest: con.totalInterest,
      totalPaid: con.totalPaid,
      monthlyPayment: con.monthlyPayment,
      eligible: consolidationEligible,
    });
  }

  ranked.sort((a, b) =>
    a.totalPaid !== b.totalPaid ? a.totalPaid - b.totalPaid : a.months - b.months,
  );

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const savingsVsWorst = Math.round((worst.totalPaid - best.totalPaid) * 100) / 100;
  const weightedApr = weightedAverageApr(debts);

  let reason: string;
  if (best.method === "consolidation") {
    reason = `A ${loan?.apr}% consolidation loan clears the balances for the least total cash — below your ${weightedApr}% blended rate.`;
  } else if (best.method === "avalanche") {
    reason =
      "Attacking the highest APR first (avalanche) pays the least interest with your current debts.";
  } else {
    reason =
      "Clearing the smallest balance first (snowball) reaches zero for the least total cash here.";
  }
  if (loan && !consolidationEligible && best.method !== "consolidation") {
    reason += " A consolidation loan on these terms would cost more, so it isn't worth it.";
  }

  return {
    best: best.method,
    reason,
    ranked,
    consolidationEligible,
    weightedApr,
    savingsVsWorst,
  };
}
