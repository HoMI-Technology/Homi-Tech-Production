import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Types (design.md §6.9)                                              */
/* ------------------------------------------------------------------ */

export type TxType = 'income' | 'expense'

export type Transaction = {
  id: string
  type: TxType
  amount: number
  description: string
  categoryId: string
  date: string // ISO yyyy-mm-dd
  notes?: string
}

export type Category = {
  id: string
  name: string
  icon: string // lucide icon key (see CATEGORY_ICONS in components/CategoryIcon.tsx)
  color: string
  budget?: number
}

export type Goal = {
  id: string
  name: string
  target: number
  saved: number
  monthlyContribution: number
  deadline?: string // ISO yyyy-mm-dd
  color: string
}

export type Holding = {
  id: string
  ticker: string
  name: string
  shares: number
  avgCost: number
  price: number
  prevClose: number
  history: number[] // 30 daily closes, oldest → newest (last === price)
}

export type BudgetState = {
  transactions: Transaction[]
  categories: Category[]
  goals: Goal[]
  holdings: Holding[]
  monthlyDebtPayments: number
  totalDebt: number
  savedAt: string // ISO timestamp
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = 'homi-budget-v1'

/** 12-slot category chart palette (design.md §2). Crimson is never a category color. */
export const CATEGORY_PALETTE = [
  '#22d3ee',
  '#34d399',
  '#fab633',
  '#a78bfa',
  '#f472b6',
  '#60a5fa',
  '#2dd4bf',
  '#fb923c',
  '#a3e635',
  '#38bdf8',
  '#fb7185',
  '#818cf8',
] as const

export type Temperature = 'emerald' | 'yellow' | 'amber' | 'crimson'

export const TEMP_HEX: Record<Temperature, string> = {
  emerald: '#34d399',
  yellow: '#facc15',
  amber: '#fab633',
  crimson: '#f24822',
}

export const TEMP_WORD: Record<Temperature, string> = {
  emerald: 'HEALTHY',
  yellow: 'CAUTION',
  amber: 'WATCH',
  crimson: 'AT RISK',
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/** en-US USD. 0 decimals for KPIs, 2 for rows. Negative renders with true minus. */
export function fmt(n: number, decimals = 0): string {
  const abs = Math.abs(n)
  const s = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs)
  return n < 0 ? `−${s}` : s
}

/** Signed delta: +$1,204.00 / −$84.20 (true minus). Zero has no sign. */
export function fmtSigned(n: number, decimals = 2): string {
  if (n === 0) return fmt(0, decimals)
  return `${n > 0 ? '+' : '−'}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(n))}`
}

/** Compact axis formatting: $2k, $850 */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) {
    const k = n / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `$${Math.round(n)}`
}

/** Ratio → percentage string. fmtPct(0.234) → "23.4%" */
export function fmtPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}

/** "12:04 PM" from an ISO timestamp */
export function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/* Date / month helpers                                                */
/* ------------------------------------------------------------------ */

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`
}

/** First day of the month `offset` months from the current real month (0 = current). */
export function monthDate(offset = 0): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + offset, 1)
}

export function monthLabel(offset = 0): string {
  return monthDate(offset).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function monthShort(offset = 0): string {
  return monthDate(offset).toLocaleDateString('en-US', { month: 'short' })
}

export function isInMonth(dateStr: string, offset = 0): boolean {
  const ref = monthDate(offset)
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const d = new Date(`${dateStr}T00:00:00`)
  return d.getFullYear() === y && d.getMonth() === m
}

/** Number of days in the selected month that have data (today's day for current month). */
export function monthDayCount(offset = 0): number {
  const ref = monthDate(offset)
  if (offset === 0) return new Date().getDate()
  return daysInMonth(ref.getFullYear(), ref.getMonth())
}

/** Today in the user's local calendar as YYYY-MM-DD — never UTC-derived. */
export function todayDateOnly(now: Date = new Date()): string {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Fraction of the selected month elapsed, clamped to [0, 1] — the honesty
 * basis for pacing markers (a month in progress is compared against elapsed
 * days, never the whole month). Past/future months read as fully elapsed. */
export function monthElapsedFraction(offset = 0): number {
  if (offset !== 0) return 1
  const now = new Date()
  return Math.min(1, Math.max(0, now.getDate() / daysInMonth(now.getFullYear(), now.getMonth())))
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cents = (v: number) => Math.round(v * 100) / 100

export function buildSeed(now: Date): BudgetState {
  const rand = mulberry32(20240)
  const txs: Transaction[] = []
  let n = 0
  const nid = () => `tx-seed-${String(++n).padStart(3, '0')}`

  const freelanceByMonth = [1250, 0, 1800, 950, 2100, 2600] // oldest → current
  const grocerySpots = ['Whole Foods Market', "Trader Joe's", 'Costco Wholesale']
  const diningSpots = ['Sweetgreen', 'Blue Bottle Coffee', 'Chipotle', 'Sushi Nakama', 'Shake Shack', 'Olive & Vine']
  const shopSpots = ['Target', 'Amazon', 'Uniqlo', 'Best Buy']
  const funSpots = ['AMC Theatres', 'Steam', 'Bowlero', 'Kindle Books']

  for (let o = -5; o <= 0; o++) {
    const idx = o + 5
    const base = new Date(now.getFullYear(), now.getMonth() + o, 1)
    const y = base.getFullYear()
    const m = base.getMonth()
    const lastDay = o === 0 ? now.getDate() : daysInMonth(y, m)
    const put = (type: TxType, day: number, amount: number, description: string, categoryId: string) => {
      if (day > lastDay) return
      txs.push({ id: nid(), type, amount: cents(amount), description, categoryId, date: isoDate(y, m, day) })
    }

    // income
    put('income', 1, 5850, 'Salary — Northwind Studio', 'income')
    const freelance = freelanceByMonth[idx]
    if (freelance > 0) put('income', 14, freelance, 'Freelance — brand identity project', 'income')

    // housing
    put('expense', 2, 1750, 'Rent — Harborview Apartments', 'housing')
    put('expense', 3, 128 + rand() * 42, 'Utilities — City Power & Water', 'housing')

    // subscriptions
    put('expense', 5, 39.0, 'Equinox gym membership', 'subscriptions')
    put('expense', 6, 15.49, 'Netflix', 'subscriptions')
    put('expense', 9, 11.99, 'Spotify Premium', 'subscriptions')
    put('expense', 12, 2.99, 'iCloud+ storage', 'subscriptions')
    put('expense', 17, 13.99, 'YouTube Premium', 'subscriptions')

    // transport
    put('expense', 1, 98, 'Metro monthly pass', 'transport')
    put('expense', 8, 46 + rand() * 14, 'Gas — Shell', 'transport')
    put('expense', 21, 44 + rand() * 16, 'Gas — Chevron', 'transport')
    put('expense', 10, 164, 'Auto insurance — Geico', 'transport')

    // groceries (4 trips)
    for (const day of [4, 11, 19, 26]) {
      put('expense', day, 92 + rand() * 48, grocerySpots[Math.floor(rand() * grocerySpots.length)], 'groceries')
    }
    // dining (4)
    for (const day of [5, 13, 20, 27]) {
      put('expense', day, 21 + rand() * 52, diningSpots[Math.floor(rand() * diningSpots.length)], 'dining')
    }
    // shopping (2)
    for (const day of [7, 22]) {
      put('expense', day, 58 + rand() * 130, shopSpots[Math.floor(rand() * shopSpots.length)], 'shopping')
    }
    // entertainment (2)
    for (const day of [15, 25]) {
      put('expense', day, 16 + rand() * 46, funSpots[Math.floor(rand() * funSpots.length)], 'entertainment')
    }
    // health every other month
    if (idx % 2 === 0) put('expense', 16, 24 + rand() * 42, 'CVS Pharmacy', 'health')
    // travel in months 1, 3 and current
    if (idx === 1 || idx === 3) put('expense', 18, 218 + rand() * 130, 'Delta Airlines — SFO ⇄ SAN', 'travel')
    if (idx === 5) put('expense', 18, 342, 'United Airlines — holiday flight', 'travel')
    if (idx === 3) put('expense', 19, 186, 'Airbnb — weekend stay', 'travel')
  }

  const categories: Category[] = [
    { id: 'housing', name: 'Housing', icon: 'Home', color: CATEGORY_PALETTE[0], budget: 2100 },
    { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', color: CATEGORY_PALETTE[1], budget: 550 },
    { id: 'dining', name: 'Dining', icon: 'UtensilsCrossed', color: CATEGORY_PALETTE[2], budget: 380 },
    { id: 'transport', name: 'Transport', icon: 'CarFront', color: CATEGORY_PALETTE[3], budget: 520 },
    { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', color: CATEGORY_PALETTE[4], budget: 110 },
    { id: 'travel', name: 'Travel', icon: 'Plane', color: CATEGORY_PALETTE[5], budget: 400 },
    { id: 'health', name: 'Health', icon: 'HeartPulse', color: CATEGORY_PALETTE[6], budget: 220 },
    { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: CATEGORY_PALETTE[7], budget: 320 },
    { id: 'entertainment', name: 'Entertainment', icon: 'Clapperboard', color: CATEGORY_PALETTE[8], budget: 180 },
    { id: 'savings', name: 'Savings & Goals', icon: 'PiggyBank', color: CATEGORY_PALETTE[10] },
    { id: 'income', name: 'Income', icon: 'Briefcase', color: CATEGORY_PALETTE[9] },
  ]

  const goals: Goal[] = [
    {
      id: 'goal-house',
      name: 'House Down Payment',
      target: 60000,
      saved: 23400,
      monthlyContribution: 800,
      deadline: isoDate(now.getFullYear(), now.getMonth() + 15, 1),
      color: CATEGORY_PALETTE[0],
    },
    {
      id: 'goal-emergency',
      name: 'Emergency Fund',
      target: 15000,
      saved: 11250,
      monthlyContribution: 500,
      color: CATEGORY_PALETTE[1],
    },
    {
      id: 'goal-japan',
      name: 'Japan Trip',
      target: 4500,
      saved: 2100,
      monthlyContribution: 350,
      deadline: isoDate(now.getFullYear(), now.getMonth() + 8, 1),
      color: CATEGORY_PALETTE[3],
    },
  ]

  const hist = (end: number, vol: number, seed: number): number[] => {
    const r = mulberry32(seed)
    const out = new Array<number>(30)
    out[29] = end
    for (let i = 28; i >= 0; i--) {
      const step = (r() - 0.48) * vol
      out[i] = cents(out[i + 1] / (1 + step))
    }
    return out
  }
  const mkHolding = (id: string, ticker: string, name: string, shares: number, avgCost: number, price: number, vol: number, seed: number): Holding => {
    const history = hist(price, vol, seed)
    return { id, ticker, name, shares, avgCost, price, prevClose: history[28], history }
  }

  const holdings: Holding[] = [
    mkHolding('h-vti', 'VTI', 'Vanguard Total Stock Market ETF', 42, 251.3, 284.16, 0.012, 11),
    mkHolding('h-aapl', 'AAPL', 'Apple Inc.', 18, 178.4, 232.87, 0.02, 22),
    mkHolding('h-msft', 'MSFT', 'Microsoft Corp.', 9, 388.2, 428.15, 0.016, 33),
    mkHolding('h-nvda', 'NVDA', 'NVIDIA Corp.', 25, 96.4, 138.25, 0.035, 44),
    mkHolding('h-schd', 'SCHD', 'Schwab U.S. Dividend Equity ETF', 60, 76.8, 82.44, 0.008, 55),
    mkHolding('h-btc', 'BTC', 'Bitcoin', 0.35, 61200, 97840, 0.045, 66),
    {
      id: 'h-hysa',
      ticker: 'HYSA',
      name: 'High-Yield Savings — Marcus 4.40% APY',
      shares: 12400,
      avgCost: 1,
      price: 1,
      prevClose: 1,
      history: new Array<number>(30).fill(1),
    },
  ]

  return {
    transactions: txs,
    categories,
    goals,
    holdings,
    monthlyDebtPayments: 675,
    totalDebt: 18400,
    savedAt: now.toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Persistence — defensive local-ledger (HōMI canon patterns)          */
/*                                                                     */
/* The stored blob is a versioned envelope { v, savedAt, data } with a */
/* forward-only migration chain; legacy unwrapped blobs (pre-envelope) */
/* migrate transparently. Every row is shape-checked on load so one    */
/* corrupted row is dropped instead of crashing the aggregates; an     */
/* unparseable blob is preserved under a corrupt-backup key before     */
/* falling back to the seed. Saves report failure (Safari private      */
/* mode's zero quota) instead of swallowing it.                        */
/* ------------------------------------------------------------------ */

export const CORRUPT_BACKUP_KEY = 'homi-budget-v1:corrupt-backup'
export const CURRENT_SCHEMA_VERSION = 1

type BudgetEnvelope = {
  v: number
  savedAt: string
  data: BudgetState
}

/**
 * Forward-only migration chain keyed by the version being upgraded FROM.
 * Version 1 is current, so the map is empty; a future v2 adds
 * `1: (data) => ...`.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * Row-level shape guards. A single corrupted row must be dropped from the
 * working set rather than reaching the selectors and blanking the tab at
 * render time — the original blob is what the corrupt-backup key preserves.
 */
function isUsableTransaction(tx: unknown): tx is Transaction {
  return (
    isRecord(tx) &&
    typeof tx.id === 'string' &&
    (tx.type === 'income' || tx.type === 'expense') &&
    isFiniteNumber(tx.amount) &&
    typeof tx.description === 'string' &&
    typeof tx.categoryId === 'string' &&
    typeof tx.date === 'string' &&
    ISO_DATE_ONLY.test(tx.date) &&
    (tx.notes === undefined || typeof tx.notes === 'string')
  )
}

function isUsableCategory(c: unknown): c is Category {
  return (
    isRecord(c) &&
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.color === 'string' &&
    (c.budget === undefined || isFiniteNumber(c.budget))
  )
}

function isUsableGoal(g: unknown): g is Goal {
  return (
    isRecord(g) &&
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    isFiniteNumber(g.target) &&
    isFiniteNumber(g.saved) &&
    isFiniteNumber(g.monthlyContribution) &&
    typeof g.color === 'string' &&
    (g.deadline === undefined || (typeof g.deadline === 'string' && ISO_DATE_ONLY.test(g.deadline)))
  )
}

function isUsableHolding(h: unknown): h is Holding {
  return (
    isRecord(h) &&
    typeof h.id === 'string' &&
    typeof h.ticker === 'string' &&
    typeof h.name === 'string' &&
    isFiniteNumber(h.shares) &&
    isFiniteNumber(h.avgCost) &&
    isFiniteNumber(h.price) &&
    isFiniteNumber(h.prevClose) &&
    Array.isArray(h.history) &&
    h.history.every(isFiniteNumber)
  )
}

/** Shape-checked merge: missing sections fall back to seed; bad rows drop. */
function sanitizeState(data: Record<string, unknown>, seed: BudgetState): BudgetState {
  return {
    transactions: Array.isArray(data.transactions)
      ? data.transactions.filter(isUsableTransaction)
      : seed.transactions,
    categories: Array.isArray(data.categories)
      ? data.categories.filter(isUsableCategory)
      : seed.categories,
    goals: Array.isArray(data.goals) ? data.goals.filter(isUsableGoal) : seed.goals,
    holdings: Array.isArray(data.holdings)
      ? data.holdings.filter(isUsableHolding)
      : seed.holdings,
    monthlyDebtPayments: isFiniteNumber(data.monthlyDebtPayments)
      ? data.monthlyDebtPayments
      : seed.monthlyDebtPayments,
    totalDebt: isFiniteNumber(data.totalDebt) ? data.totalDebt : seed.totalDebt,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : seed.savedAt,
  }
}

export type LoadedBudget = {
  state: BudgetState
  /** True when the blob was unreadable and a backup copy was kept. */
  recoveredFromCorruption: boolean
}

/**
 * Loads the budget from localStorage; seeded state when absent. Envelope
 * blobs run the forward-only migration chain; legacy bare blobs load
 * through the same row guards. Unreadable JSON is preserved under the
 * corrupt-backup key before falling back — never destroyed. SSR-safe.
 */
export function loadStoredBudget(now: Date = new Date()): LoadedBudget {
  const seed = buildSeed(now)
  if (typeof window === 'undefined') return { state: seed, recoveredFromCorruption: false }
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: seed, recoveredFromCorruption: false }
    let parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('not an object')

    let data: Record<string, unknown>
    if (typeof parsed.v === 'number' && isRecord(parsed.data)) {
      // Versioned envelope — walk the forward-only chain.
      let version = parsed.v
      let migrated: Record<string, unknown> = parsed.data
      while (version < CURRENT_SCHEMA_VERSION) {
        const migrate = MIGRATIONS[version]
        if (!migrate) break // unknown ancient shape — row guards decide below
        migrated = migrate(migrated)
        version += 1
        if (!isRecord(migrated)) throw new Error('migration produced non-object')
      }
      data = migrated
    } else {
      // Legacy unwrapped blob (pre-envelope) migrates transparently.
      data = parsed
    }
    return { state: sanitizeState(data, seed), recoveredFromCorruption: false }
  } catch {
    try {
      if (raw !== null) window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw)
    } catch {
      // Backup is best-effort; the seed fallback below still applies.
    }
    return { state: seed, recoveredFromCorruption: true }
  }
}

/** Last payload this tab wrote — the cross-tab echo-loop guard. */
let lastSerialized: string | null = null

/**
 * Persists the budget as a versioned envelope. Returns false when the
 * write failed (Safari private mode's zero quota, storage full) — callers
 * must disclose that, not hide it: a budget that silently stops saving is
 * worse than no budget.
 */
export function saveStoredBudget(state: BudgetState): boolean {
  if (typeof window === 'undefined') return false
  try {
    const envelope: BudgetEnvelope = { v: CURRENT_SCHEMA_VERSION, savedAt: state.savedAt, data: state }
    const serialized = JSON.stringify(envelope)
    window.localStorage.setItem(STORAGE_KEY, serialized)
    lastSerialized = serialized
    return true
  } catch {
    return false
  }
}

let uidCounter = 0
export function uid(prefix: string): string {
  uidCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`
}

/* ------------------------------------------------------------------ */
/* Derived selectors (pure — recompute live on every mutation)         */
/* ------------------------------------------------------------------ */

export function transactionsInMonth(state: BudgetState, offset = 0): Transaction[] {
  return state.transactions.filter((t) => isInMonth(t.date, offset))
}

export function monthIncome(state: BudgetState, offset = 0): number {
  return transactionsInMonth(state, offset)
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
}

export function monthExpenses(state: BudgetState, offset = 0): number {
  return transactionsInMonth(state, offset)
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
}

/** income − expenses − debtPayments (debt payments apply to every month) */
export function netCashFlow(state: BudgetState, offset = 0): number {
  return monthIncome(state, offset) - monthExpenses(state, offset) - state.monthlyDebtPayments
}

/** netCashFlow / income (0 when no income) */
export function savingsRate(state: BudgetState, offset = 0): number {
  const income = monthIncome(state, offset)
  if (income <= 0) return 0
  return netCashFlow(state, offset) / income
}

/** High-yield cash holding value */
export function cashValue(state: BudgetState): number {
  return state.holdings
    .filter((h) => h.ticker === 'HYSA')
    .reduce((s, h) => s + h.shares * h.price, 0)
}

/** Liquid savings = high-yield cash + money already saved toward goals */
export function liquidSavings(state: BudgetState): number {
  return cashValue(state) + state.goals.reduce((s, g) => s + g.saved, 0)
}

/** liquidSavings / (monthly expenses + debt payments), using the current month outflow */
export function runwayMonths(state: BudgetState): number {
  const outflow = monthExpenses(state, 0) + state.monthlyDebtPayments
  if (outflow <= 0) return 99
  return liquidSavings(state) / outflow
}

/** debtPayments / income for the selected month */
export function debtToIncome(state: BudgetState, offset = 0): number {
  const income = monthIncome(state, offset)
  if (income <= 0) return state.monthlyDebtPayments > 0 ? 1 : 0
  return state.monthlyDebtPayments / income
}

export type CategorySpend = { category: Category; total: number; share: number }

/** Expense totals per category for the selected month, sorted desc */
export function spendingByCategory(state: BudgetState, offset = 0): CategorySpend[] {
  const totals = new Map<string, number>()
  for (const t of transactionsInMonth(state, offset)) {
    if (t.type !== 'expense') continue
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
  }
  const grand = [...totals.values()].reduce((s, v) => s + v, 0)
  return state.categories
    .filter((c) => (totals.get(c.id) ?? 0) > 0)
    .map((c) => ({ category: c, total: totals.get(c.id) ?? 0, share: grand > 0 ? (totals.get(c.id) ?? 0) / grand : 0 }))
    .sort((a, b) => b.total - a.total)
}

/** Invested portfolio value (excludes the HYSA cash holding) */
export function portfolioValue(state: BudgetState): number {
  return state.holdings
    .filter((h) => h.ticker !== 'HYSA')
    .reduce((s, h) => s + h.shares * h.price, 0)
}

export type PortfolioGainLoss = { value: number; cost: number; gainLoss: number; pct: number }

/** Gain/loss vs average cost for invested (non-cash) holdings */
export function portfolioGainLoss(state: BudgetState): PortfolioGainLoss {
  let value = 0
  let cost = 0
  for (const h of state.holdings) {
    if (h.ticker === 'HYSA') continue
    value += h.shares * h.price
    cost += h.shares * h.avgCost
  }
  const gainLoss = value - cost
  return { value, cost, gainLoss, pct: cost > 0 ? gainLoss / cost : 0 }
}

/** liquid + portfolio − debts */
export function totalNetWorth(state: BudgetState): number {
  return liquidSavings(state) + portfolioValue(state) - state.totalDebt
}

export type MonthPoint = { key: string; label: string; income: number; spending: number; net: number }

/** Income / spending / net for the last `count` months, oldest → newest */
export function monthlySeries(state: BudgetState, count = 6): MonthPoint[] {
  const out: MonthPoint[] = []
  for (let o = -(count - 1); o <= 0; o++) {
    out.push({
      key: `${monthShort(o)}-${o}`,
      label: monthShort(o),
      income: monthIncome(state, o),
      spending: monthExpenses(state, o),
      net: netCashFlow(state, o),
    })
  }
  return out
}

/** Daily cumulative remaining balance across the selected month (debt charged on day 1) */
export function balanceSeries(state: BudgetState, offset = 0): number[] {
  const days = monthDayCount(offset)
  const daily = new Array<number>(days).fill(0)
  for (const t of transactionsInMonth(state, offset)) {
    const day = Number(t.date.slice(8, 10))
    if (day >= 1 && day <= days) daily[day - 1] += t.type === 'income' ? t.amount : -t.amount
  }
  if (daily.length > 0) daily[0] -= state.monthlyDebtPayments
  for (let i = 1; i < daily.length; i++) daily[i] += daily[i - 1]
  return daily
}

/** 6-point net-worth trend (end of each of the last 6 months), oldest → newest */
export function netWorthSeries(state: BudgetState): number[] {
  const nets: number[] = []
  for (let o = -5; o <= 0; o++) nets.push(netCashFlow(state, o))
  const points = new Array<number>(6)
  points[5] = totalNetWorth(state)
  for (let i = 4; i >= 0; i--) points[i] = points[i + 1] - nets[i + 1]
  return points
}

/* ------------------------------------------------------------------ */
/* HōMI temperature functions (design.md §2)                           */
/* ------------------------------------------------------------------ */

/** DTI: ≤28% emerald · ≤36% yellow · ≤43% amber · >43% crimson */
export function dtiTemperature(dti: number): Temperature {
  if (dti <= 0.28) return 'emerald'
  if (dti <= 0.36) return 'yellow'
  if (dti <= 0.43) return 'amber'
  return 'crimson'
}

/** Savings rate: ≥20% emerald · ≥10% yellow · ≥0% amber · <0% crimson */
export function savingsTemperature(rate: number): Temperature {
  if (rate >= 0.2) return 'emerald'
  if (rate >= 0.1) return 'yellow'
  if (rate >= 0) return 'amber'
  return 'crimson'
}

/** Runway: ≥6mo emerald · ≥3 yellow · ≥1 amber · <1 crimson */
export function runwayTemperature(months: number): Temperature {
  if (months >= 6) return 'emerald'
  if (months >= 3) return 'yellow'
  if (months >= 1) return 'amber'
  return 'crimson'
}

/** Cash-flow ratio: ≥15% emerald · ≥5% yellow · ≥0% amber · <0% crimson */
export function cashFlowTemperature(ratio: number): Temperature {
  if (ratio >= 0.15) return 'emerald'
  if (ratio >= 0.05) return 'yellow'
  if (ratio >= 0) return 'amber'
  return 'crimson'
}

/* ------------------------------------------------------------------ */
/* Toast system (design.md §6.6)                                       */
/* ------------------------------------------------------------------ */

export type ToastKind = 'success' | 'delete' | 'info'

export type Toast = {
  id: string
  kind: ToastKind
  message: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  duration: number
}

type ToastContextValue = {
  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => {
      const id = uid('toast')
      const duration = t.duration ?? 3500
      const toast: Toast = { ...t, id, duration }
      setToasts((prev) => [...prev.slice(-2), toast]) // max 3 visible
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), duration),
      )
      return id
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ toasts, pushToast, dismissToast }), [toasts, pushToast, dismissToast])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Budget store (context provider)                                     */
/* ------------------------------------------------------------------ */

export type TxInput = Omit<Transaction, 'id'>

export type BudgetContextValue = {
  state: BudgetState
  /** 0 = current real month, -1 = previous, … */
  monthOffset: number
  setMonthOffset: (offset: number) => void
  shiftMonth: (delta: number) => void
  addTransaction: (tx: TxInput) => Transaction
  updateTransaction: (id: string, patch: Partial<TxInput>) => void
  deleteTransaction: (id: string) => void
  addHolding: (h: Omit<Holding, 'id'>) => Holding
  updateHolding: (id: string, patch: Partial<Omit<Holding, 'id'>>) => void
  deleteHolding: (id: string) => void
  addGoal: (g: Omit<Goal, 'id'>) => Goal
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void
  resetDemoData: () => void
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState<LoadedBudget>(() => loadStoredBudget())
  const [state, setState] = useState<BudgetState>(initialLoad.state)
  const [monthOffset, setMonthOffset] = useState(0)
  const { pushToast } = useToast()
  const saveFailedRef = useRef(false)

  /** One-time disclosure when an unreadable blob was backed up + replaced. */
  useEffect(() => {
    if (!initialLoad.recoveredFromCorruption) return
    pushToast({
      kind: 'info',
      message: "Your saved data couldn't be read — a backup copy was kept.",
      duration: 6000,
    })
  }, [initialLoad, pushToast])

  /**
   * Month-rollover: the selectors read the real clock, so an open tab past
   * local midnight would show the old month forever. Bump state just after
   * midnight to re-render with the new current month (canon pattern:
   * the period is ensured reactively, never assumed static).
   */
  const [, setDayTick] = useState(todayDateOnly)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
      timer = setTimeout(() => {
        setDayTick(todayDateOnly())
        schedule()
      }, nextMidnight.getTime() - now.getTime())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  /**
   * Cross-tab sync: reload what other tabs write. The `storage` event never
   * fires in the writing tab, and lastSerialized guards against echo loops
   * in implementations that do fire it.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return
      if (e.newValue === lastSerialized) return
      lastSerialized = e.newValue
      setState(loadStoredBudget().state)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Every mutation flows through here: savedAt bumped + synchronous localStorage write. */
  const mutate = useCallback(
    (fn: (prev: BudgetState) => BudgetState) => {
      setState((prev) => {
        const next = { ...fn(prev), savedAt: new Date().toISOString() }
        const saved = saveStoredBudget(next)
        if (!saved && !saveFailedRef.current) {
          // Disclose once per failure streak (quota / Safari private mode).
          saveFailedRef.current = true
          pushToast({
            kind: 'info',
            message: "Couldn't save on this device — your changes are held in memory only.",
            duration: 6000,
          })
        } else if (saved) {
          saveFailedRef.current = false
        }
        return next
      })
    },
    [pushToast],
  )

  const shiftMonth = useCallback((delta: number) => {
    setMonthOffset((o) => Math.min(0, o + delta))
  }, [])

  const addTransaction = useCallback(
    (tx: TxInput): Transaction => {
      const created: Transaction = { ...tx, id: uid('tx') }
      mutate((s) => ({ ...s, transactions: [...s.transactions, created] }))
      pushToast({ kind: 'success', message: 'Transaction added', description: `${tx.description} · ${fmt(tx.amount, 2)}` })
      return created
    },
    [mutate, pushToast],
  )

  const updateTransaction = useCallback(
    (id: string, patch: Partial<TxInput>) => {
      mutate((s) => ({
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)),
      }))
      pushToast({ kind: 'success', message: 'Transaction updated' })
    },
    [mutate, pushToast],
  )

  const deleteTransaction = useCallback(
    (id: string) => {
      let removed: Transaction | undefined
      let removedIndex = -1
      mutate((s) => {
        removedIndex = s.transactions.findIndex((t) => t.id === id)
        removed = s.transactions[removedIndex]
        return { ...s, transactions: s.transactions.filter((t) => t.id !== id) }
      })
      pushToast({
        kind: 'delete',
        message: 'Transaction deleted',
        description: removed ? removed.description : undefined,
        actionLabel: 'Undo',
        duration: 5000,
        onAction: () => {
          if (!removed) return
          const restore = removed
          const at = removedIndex
          mutate((s) => {
            const txs = [...s.transactions]
            txs.splice(Math.min(Math.max(at, 0), txs.length), 0, restore)
            return { ...s, transactions: txs }
          })
        },
      })
    },
    [mutate, pushToast],
  )

  const addHolding = useCallback(
    (h: Omit<Holding, 'id'>): Holding => {
      const created: Holding = { ...h, id: uid('holding') }
      mutate((s) => ({ ...s, holdings: [...s.holdings, created] }))
      pushToast({ kind: 'success', message: 'Holding added', description: `${h.ticker} · ${h.shares} shares` })
      return created
    },
    [mutate, pushToast],
  )

  const updateHolding = useCallback(
    (id: string, patch: Partial<Omit<Holding, 'id'>>) => {
      mutate((s) => ({ ...s, holdings: s.holdings.map((h) => (h.id === id ? { ...h, ...patch, id: h.id } : h)) }))
      pushToast({ kind: 'success', message: 'Holding updated' })
    },
    [mutate, pushToast],
  )

  const deleteHolding = useCallback(
    (id: string) => {
      let removed: Holding | undefined
      mutate((s) => {
        removed = s.holdings.find((h) => h.id === id)
        return { ...s, holdings: s.holdings.filter((h) => h.id !== id) }
      })
      pushToast({
        kind: 'delete',
        message: 'Holding removed',
        description: removed ? `${removed.ticker} — ${removed.name}` : undefined,
        actionLabel: 'Undo',
        duration: 5000,
        onAction: () => {
          if (!removed) return
          const restore = removed
          mutate((s) => ({ ...s, holdings: [...s.holdings, restore] }))
        },
      })
    },
    [mutate, pushToast],
  )

  const addGoal = useCallback(
    (g: Omit<Goal, 'id'>): Goal => {
      const created: Goal = { ...g, id: uid('goal') }
      mutate((s) => ({ ...s, goals: [...s.goals, created] }))
      pushToast({ kind: 'success', message: 'Goal created', description: g.name })
      return created
    },
    [mutate, pushToast],
  )

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<Goal, 'id'>>) => {
      mutate((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch, id: g.id } : g)) }))
      pushToast({ kind: 'success', message: 'Goal updated' })
    },
    [mutate, pushToast],
  )

  const deleteGoal = useCallback(
    (id: string) => {
      let removed: Goal | undefined
      mutate((s) => {
        removed = s.goals.find((g) => g.id === id)
        return { ...s, goals: s.goals.filter((g) => g.id !== id) }
      })
      pushToast({
        kind: 'delete',
        message: 'Goal deleted',
        description: removed ? removed.name : undefined,
        actionLabel: 'Undo',
        duration: 5000,
        onAction: () => {
          if (!removed) return
          const restore = removed
          mutate((s) => ({ ...s, goals: [...s.goals, restore] }))
        },
      })
    },
    [mutate, pushToast],
  )

  const contributeToGoal = useCallback(
    (id: string, amount: number) => {
      mutate((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g)),
      }))
      pushToast({ kind: 'success', message: 'Contribution added', description: fmt(amount, 2) })
    },
    [mutate, pushToast],
  )

  const resetDemoData = useCallback(() => {
    const seed = buildSeed(new Date())
    setState(seed)
    saveStoredBudget(seed)
    setMonthOffset(0)
    pushToast({ kind: 'info', message: 'Demo data restored', description: 'Fresh ledger, goals and portfolio loaded.' })
  }, [pushToast])

  const value = useMemo<BudgetContextValue>(
    () => ({
      state,
      monthOffset,
      setMonthOffset,
      shiftMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addHolding,
      updateHolding,
      deleteHolding,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      resetDemoData,
    }),
    [
      state,
      monthOffset,
      shiftMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addHolding,
      updateHolding,
      deleteHolding,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      resetDemoData,
    ],
  )

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within <BudgetProvider>')
  return ctx
}

/** Convenience: the Category for an id (undefined-safe) */
export function categoryById(state: BudgetState, id: string): Category | undefined {
  return state.categories.find((c) => c.id === id)
}
