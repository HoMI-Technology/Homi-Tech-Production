/* ------------------------------------------------------------------ */
/* Planner derived helpers — pure functions over BudgetState slices.   */
/*                                                                     */
/* Ported from the reference planner store's exported selectors. The   */
/* reference's format.ts was skipped per the lib audit: money display  */
/* reuses @/lib/tools/format + @/lib/money, and only the two ISO date  */
/* helpers bills actually need (daysUntil / addDaysISO, plus todayISO  */
/* for the store's mutation timestamps) are carried over.              */
/* ------------------------------------------------------------------ */

import type {
  AssetClass,
  BankAccount,
  Bill,
  BillStatus,
  BudgetState,
  CategoryId,
  ExpenseCategory,
  Holding,
  HoldingAccountKind,
  NetWorthItem,
  SavingsGoal,
  Temperature,
  Transaction,
} from '@/lib/planner/types'

/* ------------------------------------------------------------------ */
/* ISO date helpers (the only keepers from reference format.ts)        */
/* ------------------------------------------------------------------ */

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today in the user's local calendar as YYYY-MM-DD — never UTC-derived. */
export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function daysUntil(iso: string, from = todayISO()): number {
  const a = new Date(`${from}T12:00:00`).getTime()
  const b = new Date(`${iso}T12:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

/* ------------------------------------------------------------------ */
/* Ledger / account aggregates                                         */
/* ------------------------------------------------------------------ */

export function summarize(transactions: Transaction[]) {
  let income = 0
  let expenses = 0
  const byCategory = new Map<string, number>()

  for (const tx of transactions) {
    if (tx.type === 'income') {
      income += tx.amount
    } else {
      expenses += tx.amount
      byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount)
    }
  }

  const remaining = income - expenses
  const savingsRate = income > 0 ? (remaining / income) * 100 : 0

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { income, expenses, remaining, savingsRate, categoryBreakdown }
}

export function summarizeAccounts(accounts: BankAccount[]) {
  const cash = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((s, a) => s + a.balance, 0)
  const credit = accounts
    .filter((a) => a.type === 'credit')
    .reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0)
  return { cash, credit, count: accounts.length }
}

export function upcomingBillsTotal(bills: Bill[]) {
  return bills
    .filter((b) => b.status !== 'paid')
    .reduce((s, b) => s + b.amount, 0)
}

/* ------------------------------------------------------------------ */
/* Portfolio aggregates                                                */
/* ------------------------------------------------------------------ */

export function holdingMarketValue(h: Holding): number {
  return h.shares * h.price
}

export function holdingCost(h: Holding): number {
  return h.shares * h.costBasis
}

export function holdingGain(h: Holding): number {
  return holdingMarketValue(h) - holdingCost(h)
}

export function holdingGainPct(h: Holding): number {
  const cost = holdingCost(h)
  if (cost <= 0) return 0
  return (holdingGain(h) / cost) * 100
}

export function summarizePortfolio(holdings: Holding[]) {
  let marketValue = 0
  let costBasis = 0
  const byClass = new Map<AssetClass, number>()
  const byAccount = new Map<HoldingAccountKind, number>()

  for (const h of holdings) {
    const mv = holdingMarketValue(h)
    marketValue += mv
    costBasis += holdingCost(h)
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + mv)
    byAccount.set(h.accountKind, (byAccount.get(h.accountKind) ?? 0) + mv)
  }

  const gain = marketValue - costBasis
  const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0

  const allocation = [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      weight: marketValue > 0 ? (value / marketValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const byAccountKind = [...byAccount.entries()]
    .map(([accountKind, value]) => ({
      accountKind,
      value,
      weight: marketValue > 0 ? (value / marketValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    marketValue,
    costBasis,
    gain,
    gainPct,
    count: holdings.length,
    allocation,
    byAccountKind,
  }
}

export function totalNetWorth(
  accounts: BankAccount[],
  holdings: Holding[],
  items: NetWorthItem[],
) {
  const { cash, credit } = summarizeAccounts(accounts)
  const portfolio = summarizePortfolio(holdings).marketValue
  const otherAssets = items
    .filter((i) => i.kind === 'asset')
    .reduce((s, i) => s + i.amount, 0)
  const liabilities = items
    .filter((i) => i.kind === 'liability')
    .reduce((s, i) => s + i.amount, 0)

  const assets = cash + portfolio + otherAssets
  const totalLiabilities = liabilities + credit
  const netWorth = assets - totalLiabilities

  return {
    cash,
    portfolio,
    otherAssets,
    assets,
    liabilities: totalLiabilities,
    credit,
    manualLiabilities: liabilities,
    netWorth,
  }
}

/* ------------------------------------------------------------------ */
/* Temperature gauges — percent-scale inputs, canon gauge lines        */
/* ------------------------------------------------------------------ */

/** DTI: ≤28% emerald · ≤36% yellow · ≤43% amber · >43% crimson */
export function dtiTemperature(dti: number): Temperature {
  if (dti <= 28) return 'emerald'
  if (dti <= 36) return 'yellow'
  if (dti <= 43) return 'amber'
  return 'crimson'
}

/** Savings rate: ≥20% emerald · ≥10% yellow · ≥0% amber · <0% crimson */
export function savingsRateTemperature(rate: number): Temperature {
  if (rate >= 20) return 'emerald'
  if (rate >= 10) return 'yellow'
  if (rate >= 0) return 'amber'
  return 'crimson'
}

/** Runway: ≥6mo emerald · ≥3 yellow · ≥1 amber · <1 crimson */
export function runwayTemperature(months: number): Temperature {
  if (!Number.isFinite(months) || months >= 6) return 'emerald'
  if (months >= 3) return 'yellow'
  if (months >= 1) return 'amber'
  return 'crimson'
}

/** Cash-flow ratio (flow/income): ≥15% emerald · ≥5% yellow · ≥0% amber · <0 crimson */
export function cashFlowTemperature(flow: number, income: number): Temperature {
  if (income <= 0) return 'amber'
  const ratio = flow / income
  if (ratio >= 0.15) return 'emerald'
  if (ratio >= 0.05) return 'yellow'
  if (ratio >= 0) return 'amber'
  return 'crimson'
}

/* ------------------------------------------------------------------ */
/* Financial reality — the live gauge pack                             */
/* ------------------------------------------------------------------ */

export function financialReality(
  transactions: Transaction[],
  accounts: BankAccount[],
  bills: Bill[],
) {
  const { income, expenses, remaining, savingsRate } = summarize(transactions)
  const { cash } = summarizeAccounts(accounts)

  const monthlyDebtPayments = bills
    .filter((b) => b.category === 'debt' && b.status !== 'paid')
    .reduce((s, b) => s + b.amount, 0)
  const debtFromTx = transactions
    .filter((t) => t.type === 'expense' && t.category === 'debt')
    .reduce((s, t) => s + t.amount, 0)
  const debtPayments = Math.max(monthlyDebtPayments, debtFromTx)

  const outflow = expenses > 0 ? expenses : upcomingBillsTotal(bills)
  const runwayMonths = outflow > 0 ? cash / outflow : Infinity
  const dti = income > 0 ? (debtPayments / income) * 100 : 0

  return {
    income,
    expenses,
    cashFlow: remaining,
    savingsRate,
    runwayMonths,
    dti,
    debtPayments,
    liquidCash: cash,
    temps: {
      cashFlow: cashFlowTemperature(remaining, income),
      savingsRate: savingsRateTemperature(savingsRate),
      runway: runwayTemperature(runwayMonths),
      dti: dtiTemperature(dti),
    },
  }
}

/* ------------------------------------------------------------------ */
/* Path finance snapshot — the planner's input contract for the        */
/* binding-constraint engine (Stage 3 wires canon lib/path.ts).        */
/* ------------------------------------------------------------------ */

export interface PathFinanceSnapshot {
  income: number
  expenses: number
  cashFlow: number
  savingsRate: number
  runwayMonths: number
  dti: number
  liquidCash: number
  debtPayments: number
  portfolioValue: number
  netWorth: number
  savingsGoalTarget: number
  savingsGoalCurrent: number
}

export function buildPathFinanceSnapshot(s: {
  transactions: Transaction[]
  accounts: BankAccount[]
  bills: Bill[]
  holdings: Holding[]
  netWorthItems: NetWorthItem[]
  savingsGoal: SavingsGoal
}): PathFinanceSnapshot {
  const reality = financialReality(s.transactions, s.accounts, s.bills)
  const portfolio = summarizePortfolio(s.holdings)
  const nw = totalNetWorth(s.accounts, s.holdings, s.netWorthItems)
  return {
    income: reality.income,
    expenses: reality.expenses,
    cashFlow: reality.cashFlow,
    savingsRate: reality.savingsRate,
    runwayMonths: reality.runwayMonths,
    dti: reality.dti,
    liquidCash: reality.liquidCash,
    debtPayments: reality.debtPayments,
    portfolioValue: portfolio.marketValue,
    netWorth: nw.netWorth,
    savingsGoalTarget: s.savingsGoal.target,
    savingsGoalCurrent: s.savingsGoal.current,
  }
}

/* ------------------------------------------------------------------ */
/* Defaults + demo seed                                                */
/*                                                                     */
/* The demo seed reproduces the reference planner's screenshot state.  */
/* Every date is relative to "today" (the reference dated its seed the */
/* same way), so the demo ages gracefully: bills re-derive their       */
/* due/scheduled/upcoming status from the real clock, and the ledger   */
/* always covers roughly the last two weeks.                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_GOAL: SavingsGoal = {
  name: 'Emergency fund',
  target: 0,
  current: 0,
}

/** Neutral profile — the user fills Plan / housing / emotional fields. */
export const DEFAULT_READINESS_PROFILE: BudgetState['readinessProfile'] = {
  creditScore: 0,
  lifeStability: 5,
  confidenceLevel: 5,
  partnerAlignment: 5,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  targetHomePrice: 0,
  downPaymentSaved: 0,
  assumedRatePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.2,
  hoaMonthly: 0,
  currentRent: 0,
}

export const DEFAULT_HOUSEHOLD_PARTNER: BudgetState['householdPartner'] = {
  enabled: false,
  label: 'Partner',
  creditScore: 0,
  lifeStability: 5,
  confidenceLevel: 5,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  incomeShare: 0.5,
  partnerAlignment: 5,
}

function billStatusFor(dueDate: string, autopay: boolean, today: string): BillStatus {
  const due = daysUntil(dueDate, today)
  if (due < 0) return 'overdue'
  if (due === 0) return 'due'
  return autopay ? 'scheduled' : 'upcoming'
}

export function buildDemoSeed(now: Date = new Date()): BudgetState {
  const today = toISODate(now)
  const day = (offset: number) => addDaysISO(today, offset)
  const syncedAt = now.toISOString()

  const accounts: BankAccount[] = [
    {
      id: 'acct-demo-checking',
      institution: 'chase',
      name: 'Total Checking',
      type: 'checking',
      mask: '4821',
      balance: 4280.42,
      available: 4120.0,
      currency: 'USD',
      lastSyncedAt: syncedAt,
      status: 'linked',
    },
    {
      id: 'acct-demo-savings',
      institution: 'chase',
      name: 'Savings',
      type: 'savings',
      mask: '9033',
      balance: 11240.18,
      available: 11240.18,
      currency: 'USD',
      lastSyncedAt: syncedAt,
      status: 'linked',
    },
    {
      id: 'acct-demo-ally',
      institution: 'ally',
      name: 'Online Savings',
      type: 'savings',
      mask: '7710',
      balance: 3200.0,
      available: 3200.0,
      currency: 'USD',
      lastSyncedAt: syncedAt,
      status: 'linked',
    },
  ]

  const bill = (
    id: string,
    name: string,
    amount: number,
    category: ExpenseCategory,
    dueOffset: number,
    opts: { autopay?: boolean; source?: 'manual' | 'bank'; accountId?: string } = {},
  ): Bill => {
    const dueDate = day(dueOffset)
    const autopay = opts.autopay ?? false
    return {
      id,
      name,
      amount,
      category,
      dueDate,
      status: billStatusFor(dueDate, autopay, today),
      frequency: 'monthly',
      accountId: opts.accountId,
      autopay,
      source: opts.source ?? 'manual',
      paidAt: null,
    }
  }

  const bills: Bill[] = [
    bill('bill-demo-teco', 'TECO electric', 112.4, 'utilities', 0, {
      autopay: true,
      source: 'bank',
      accountId: 'acct-demo-checking',
    }),
    bill('bill-demo-rent', 'Apartment rent', 1850, 'housing', 3, {
      accountId: 'acct-demo-checking',
    }),
    bill('bill-demo-spectrum', 'Spectrum internet', 79.99, 'utilities', 5, {
      autopay: true,
      source: 'bank',
      accountId: 'acct-demo-checking',
    }),
    bill('bill-demo-netflix', 'Netflix', 15.49, 'entertainment', 8, {
      autopay: true,
      source: 'bank',
      accountId: 'acct-demo-checking',
    }),
    bill('bill-demo-student-loan', 'Student loan', 220, 'debt', 12, {
      accountId: 'acct-demo-checking',
    }),
    bill('bill-demo-mobile', 'Mobile plan', 68, 'utilities', 18, {
      autopay: true,
      source: 'bank',
      accountId: 'acct-demo-ally',
    }),
  ]

  const tx = (
    id: string,
    note: string,
    type: Transaction['type'],
    amount: number,
    category: CategoryId,
    dayOffset: number,
  ): Transaction => ({
    id,
    type,
    amount,
    category,
    note,
    date: day(dayOffset),
    source: 'manual',
  })

  const transactions: Transaction[] = [
    tx('tx-demo-01', 'Coffee runs', 'expense', 42, 'food', -1),
    tx('tx-demo-02', 'Groceries midweek', 'expense', 178, 'food', -2),
    tx('tx-demo-03', 'Student loan', 'expense', 220, 'debt', -3),
    tx('tx-demo-04', 'Rent', 'expense', 1850, 'housing', -4),
    tx('tx-demo-05', 'Groceries', 'expense', 312, 'food', -4),
    tx('tx-demo-06', 'Biweekly paycheck', 'income', 6200, 'salary', -5),
    tx('tx-demo-07', 'Fuel + transit', 'expense', 86, 'transport', -6),
    tx('tx-demo-08', 'Electric + internet', 'expense', 148, 'utilities', -7),
    tx('tx-demo-09', 'Consulting weekend', 'income', 450, 'freelance', -8),
    tx('tx-demo-10', 'Streaming + dinner out', 'expense', 64, 'entertainment', -9),
    tx('tx-demo-11', 'Household essentials', 'expense', 119, 'shopping', -10),
    tx('tx-demo-12', 'Pharmacy', 'expense', 48, 'health', -11),
    tx('tx-demo-13', 'Groceries prior', 'expense', 248, 'food', -12),
    tx('tx-demo-14', 'Amazon haul', 'expense', 210, 'shopping', -13),
    tx('tx-demo-15', 'Concert tickets', 'expense', 92, 'entertainment', -14),
  ]

  const asOf = day(-1)
  const holdings: Holding[] = [
    {
      id: 'hold-demo-fxaix',
      symbol: 'FXAIX',
      name: 'Fidelity 500 Index',
      assetClass: 'mutual',
      accountKind: 'traditional_401k',
      shares: 120.5,
      costBasis: 145.0,
      price: 198.6,
      asOf,
      source: 'broker',
      brokerId: 'fidelity',
    },
    {
      id: 'hold-demo-vti',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      assetClass: 'etf',
      accountKind: 'brokerage',
      shares: 42.5,
      costBasis: 198.4,
      price: 268.15,
      asOf,
      source: 'manual',
    },
    {
      id: 'hold-demo-voo',
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      assetClass: 'etf',
      accountKind: 'roth',
      shares: 18.2,
      costBasis: 380.0,
      price: 512.4,
      asOf,
      source: 'manual',
    },
    {
      id: 'hold-demo-bnd',
      symbol: 'BND',
      name: 'Vanguard Total Bond Market ETF',
      assetClass: 'bond',
      accountKind: 'brokerage',
      shares: 80,
      costBasis: 74.2,
      price: 72.95,
      asOf,
      source: 'manual',
    },
    {
      id: 'hold-demo-vxus',
      symbol: 'VXUS',
      name: 'Vanguard Total International Stock',
      assetClass: 'etf',
      accountKind: 'brokerage',
      shares: 65,
      costBasis: 52.1,
      price: 61.8,
      asOf,
      source: 'manual',
    },
    {
      id: 'hold-demo-aapl',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetClass: 'stock',
      accountKind: 'brokerage',
      shares: 12,
      costBasis: 172.5,
      price: 214.3,
      asOf,
      source: 'manual',
    },
  ]

  const netWorthItems: NetWorthItem[] = [
    {
      id: 'nw-demo-vehicle',
      kind: 'asset',
      name: 'Vehicle (KBB mid)',
      amount: 18500,
      note: '2019 Honda CR-V',
    },
    { id: 'nw-demo-hsa', kind: 'asset', name: 'HSA cash reserve', amount: 2400 },
    {
      id: 'nw-demo-student-loan',
      kind: 'liability',
      name: 'Student loan balance',
      amount: 18400,
      note: 'Federal Direct',
    },
    {
      id: 'nw-demo-auto-loan',
      kind: 'liability',
      name: 'Auto loan remaining',
      amount: 6200,
    },
  ]

  return {
    transactions,
    savingsGoal: { name: 'Emergency fund', target: 12000, current: 4800 },
    accounts,
    bills,
    bankLinkStatus: 'linked',
    lastBankSyncAt: syncedAt,
    holdings,
    netWorthItems,
    brokers: [
      {
        id: 'broker-demo-fidelity',
        institution: 'fidelity',
        name: 'Fidelity · Workplace 401(k)',
        mask: '4412',
        status: 'linked',
        lastSyncedAt: syncedAt,
        marketValue: Number((120.5 * 198.6).toFixed(2)),
      },
    ],
    brokerLinkStatus: 'linked',
    lastBrokerSyncAt: syncedAt,
    path: null,
    readinessProfile: {
      ...DEFAULT_READINESS_PROFILE,
      // Screenshot parity (reference audit-overview.png): HōMI-Score 73,
      // ALMOST THERE, pillars 74 / 66 / 80 on this exact ledger. The
      // closed-loop test asserts these numbers — keep them aligned.
      creditScore: 750,
      lifeStability: 7,
      confidenceLevel: 7,
      partnerAlignment: 7,
      fomoLevel: 4,
      timeHorizonMonths: 18,
      targetHomePrice: 400000,
      downPaymentSaved: 20000,
      currentRent: 1850,
    },
    householdPartner: { ...DEFAULT_HOUSEHOLD_PARTNER },
    debts: [
      {
        id: 'debt-demo-student',
        name: 'Student loan',
        balance: 18400,
        apr: 5.5,
        minPayment: 220,
      },
      {
        id: 'debt-demo-auto',
        name: 'Auto loan',
        balance: 6200,
        apr: 6.9,
        minPayment: 200,
      },
    ],
    dismissedSignals: [],
    toolsOverlay: { extraDebtPayment: 0 },
    checkins: [],
    lastImpact: null,
  }
}
