/* ------------------------------------------------------------------ */
/* Decision calendar — pure derivation layer.                          */
/*                                                                     */
/* Every function takes explicit dates (todayISO where relevant) so    */
/* the whole surface is deterministic and unit-testable. No store      */
/* imports, no React — the Calendar tab components consume these.      */
/*                                                                     */
/* Screenshot-verified formulas (cal-final-* / spec §4):               */
/*   - EOM projected      = bankCashNow − Σ open bills (all unpaid)    */
/*   - selected-day Proj  = bankCashNow − Σ open bills due on/before   */
/*                          that day                                   */
/*   - DAY IMPACT         = dayIn − dayOut − billsDueThatDay           */
/*   - runway area        = cashNow stepping down by each open bill    */
/*                          at its due date, flat otherwise            */
/*   - bill states        = paid / overdue / due / upcoming (≤7d) /    */
/*                          scheduled (autopay, >7d out)               */
/* ------------------------------------------------------------------ */

import type { Bill, Transaction } from '@/lib/planner/types'
import { addDaysISO, daysUntil } from '@/lib/planner/derived'

/* ------------------------------------------------------------------ */
/* Date primitives (ISO-first, local-calendar safe)                    */
/* ------------------------------------------------------------------ */

export interface MonthRef {
  year: number
  month: number // 0-based
}

export function parseISO(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map((s) => Number(s))
  return { year: y, month: m - 1, day: d }
}

export function toISO(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function monthOfISO(iso: string): MonthRef {
  const { year, month } = parseISO(iso)
  return { year, month }
}

export function monthStartISO(ref: MonthRef): string {
  return toISO(ref.year, ref.month, 1)
}

export function monthEndISO(ref: MonthRef): string {
  return toISO(ref.year, ref.month, daysInMonth(ref.year, ref.month))
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const total = ref.year * 12 + ref.month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

export function isWeekendISO(iso: string): boolean {
  const dow = new Date(`${iso}T12:00:00`).getDay()
  return dow === 0 || dow === 6
}

/* ------------------------------------------------------------------ */
/* Bill visual state                                                   */
/*                                                                     */
/* paid → emerald · overdue (past-due unpaid) → crimson · due today →  */
/* gold DUE · upcoming (≤7d out) → cyan/gold · scheduled (autopay      */
/* further out) → dim. Screenshot-checked: Spectrum (autopay, +5d)     */
/* chips UPCOMING; Netflix (autopay, +8d) chips SCHEDULED.             */
/* ------------------------------------------------------------------ */

export type BillVisualState = 'paid' | 'overdue' | 'due' | 'upcoming' | 'scheduled'

export function billState(bill: Bill, todayISO: string): BillVisualState {
  if (bill.status === 'paid' || bill.paidAt) return 'paid'
  const due = daysUntil(bill.dueDate, todayISO)
  if (due < 0) return 'overdue'
  if (due === 0) return 'due'
  if (due <= 7) return 'upcoming'
  if (bill.autopay || bill.status === 'scheduled') return 'scheduled'
  return 'upcoming'
}

export const BILL_STATE_LABEL: Record<BillVisualState, string> = {
  paid: 'PAID',
  overdue: 'OVERDUE',
  due: 'DUE',
  upcoming: 'UPCOMING',
  scheduled: 'SCHEDULED',
}

/* ------------------------------------------------------------------ */
/* Day collections                                                     */
/* ------------------------------------------------------------------ */

export function openBills(bills: Bill[]): Bill[] {
  return bills.filter((b) => b.status !== 'paid' && !b.paidAt)
}

export function billsDueOn(dateISO: string, bills: Bill[]): Bill[] {
  return bills.filter((b) => b.dueDate === dateISO)
}

export function openBillsDueOn(dateISO: string, bills: Bill[]): Bill[] {
  return openBills(bills).filter((b) => b.dueDate === dateISO)
}

export function transactionsOn(dateISO: string, transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.date === dateISO)
}

/** Open bills due on/before dateISO — the "Proj $" deduction set. */
export function openBillsOnOrBefore(dateISO: string, bills: Bill[]): Bill[] {
  return openBills(bills).filter((b) => b.dueDate <= dateISO)
}

/* ------------------------------------------------------------------ */
/* dayRollup — the per-day numbers behind grid cells, week columns,    */
/* agenda rows, and the inspector.                                     */
/*   in      = Σ income ledger entries that day                        */
/*   out     = Σ expense ledger entries that day                       */
/*   bills   = Σ open bills due that day                               */
/*   impact  = in − out − bills  (DAY IMPACT, crimson when negative)   */
/*   pressure= bills + out       (relative bar is computed by the      */
/*             caller against monthPressureMax)                        */
/* ------------------------------------------------------------------ */

export interface DayRollup {
  dateISO: string
  in: number
  out: number
  bills: number
  impact: number
  pressure: number
  billItems: Bill[]
  txItems: Transaction[]
}

export function dayRollup(dateISO: string, bills: Bill[], transactions: Transaction[]): DayRollup {
  const txItems = transactionsOn(dateISO, transactions)
  let dayIn = 0
  let dayOut = 0
  for (const tx of txItems) {
    if (tx.type === 'income') dayIn += tx.amount
    else dayOut += tx.amount
  }
  const billItems = billsDueOn(dateISO, bills)
  const openDue = billItems.filter((b) => b.status !== 'paid' && !b.paidAt)
  const billsTotal = openDue.reduce((s, b) => s + b.amount, 0)
  const impact = dayIn - dayOut - billsTotal
  return {
    dateISO,
    in: round2(dayIn),
    out: round2(dayOut),
    bills: round2(billsTotal),
    impact: round2(impact),
    pressure: round2(billsTotal + dayOut),
    billItems,
    txItems,
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2))
}

/* ------------------------------------------------------------------ */
/* Month grid                                                          */
/* ------------------------------------------------------------------ */

export interface CalendarDay {
  dateISO: string
  day: number
  inMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

/**
 * SUN–SAT weeks covering the given month, padded with leading/trailing
 * days from adjacent months (those render dimmed).
 */
export function buildMonthGrid(year: number, month: number, todayISO: string): CalendarDay[][] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay() // 0 = Sunday
  const count = daysInMonth(year, month)
  const totalCells = Math.ceil((startOffset + count) / 7) * 7
  const startISO = addDaysISO(toISO(year, month, 1), -startOffset)

  const weeks: CalendarDay[][] = []
  for (let w = 0; w < totalCells / 7; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d
      const dateISO = addDaysISO(startISO, idx)
      const p = parseISO(dateISO)
      week.push({
        dateISO,
        day: p.day,
        inMonth: p.year === year && p.month === month,
        isToday: dateISO === todayISO,
        isWeekend: d === 0 || d === 6,
      })
    }
    weeks.push(week)
  }
  return weeks
}

/** The SUN–SAT week containing anchorISO. */
export function buildWeekDays(anchorISO: string, todayISO: string): CalendarDay[] {
  const dow = new Date(`${anchorISO}T12:00:00`).getDay()
  const startISO = addDaysISO(anchorISO, -dow)
  return Array.from({ length: 7 }, (_, d) => {
    const dateISO = addDaysISO(startISO, d)
    return {
      dateISO,
      day: parseISO(dateISO).day,
      inMonth: true,
      isToday: dateISO === todayISO,
      isWeekend: d === 0 || d === 6,
    }
  })
}

/** Label for the week strip header, e.g. "Aug 2 – Aug 8". */
export function weekRangeLabel(anchorISO: string): string {
  const days = buildWeekDays(anchorISO, anchorISO)
  const first = days[0].dateISO
  const last = days[6].dateISO
  return `${shortDateLabel(first)} – ${shortDateLabel(last)}`
}

/* ------------------------------------------------------------------ */
/* Agenda — the next N days that carry any bill or ledger activity     */
/* ------------------------------------------------------------------ */

export interface AgendaDay {
  dateISO: string
  offsetDays: number // 0 = fromISO ("Today"), n → "In Nd"
  rollup: DayRollup
  bills: Bill[]
  billsTotal: number
}

export function buildAgendaDays(
  bills: Bill[],
  transactions: Transaction[],
  fromISO: string,
  count: number,
): AgendaDay[] {
  const days: AgendaDay[] = []
  for (let i = 0; i < count; i++) {
    const dateISO = addDaysISO(fromISO, i)
    const rollup = dayRollup(dateISO, bills, transactions)
    const dayBills = openBillsDueOn(dateISO, bills)
    if (dayBills.length === 0 && rollup.txItems.length === 0) continue
    days.push({
      dateISO,
      offsetDays: i,
      rollup,
      bills: dayBills,
      billsTotal: round2(dayBills.reduce((s, b) => s + b.amount, 0)),
    })
  }
  return days
}

/* ------------------------------------------------------------------ */
/* Runway — projected cash across the viewed month                     */
/*                                                                     */
/* Area series: starts at cashNow, steps down by each open bill at its */
/* due date (bills already past-due at month start deduct on day 1),   */
/* flat otherwise. Daily-net bars: ledger net − bills due per day.     */
/* ------------------------------------------------------------------ */

export interface RunwayPoint {
  dateISO: string
  day: number
  cash: number
  net: number // daily net bar (in − out − bills)
}

export interface RunwaySeries {
  month: MonthRef
  points: RunwayPoint[]
  /** cashNow − Σ ALL open bills (the EOM-projected tile formula). */
  eomProjected: number
  minCash: number
  maxCash: number
}

export function buildRunwaySeries(
  cashNow: number,
  bills: Bill[],
  transactions: Transaction[],
  month: MonthRef,
): RunwaySeries {
  const open = openBills(bills)
  const openTotal = open.reduce((s, b) => s + b.amount, 0)
  const count = daysInMonth(month.year, month.month)
  const start = monthStartISO(month)

  let deducted = 0
  const points: RunwayPoint[] = []
  for (let i = 0; i < count; i++) {
    const dateISO = addDaysISO(start, i)
    // Step down by every open bill due on/before this day, exactly once.
    const step = open
      .filter((b) => b.dueDate === dateISO)
      .reduce((s, b) => s + b.amount, 0)
    deducted += step
    // Overdue / pre-month bills deduct immediately on day 1.
    if (i === 0) {
      deducted += open
        .filter((b) => b.dueDate < start)
        .reduce((s, b) => s + b.amount, 0)
    }
    const rollup = dayRollup(dateISO, bills, transactions)
    points.push({
      dateISO,
      day: i + 1,
      cash: round2(cashNow - deducted),
      net: rollup.impact,
    })
  }

  const cashValues = points.map((p) => p.cash)
  return {
    month,
    points,
    eomProjected: round2(cashNow - openTotal),
    minCash: cashValues.length ? Math.min(...cashValues) : cashNow,
    maxCash: cashValues.length ? Math.max(...cashValues) : cashNow,
  }
}

/** Selected-day "Proj $" — cashNow − Σ open bills due on/before that day. */
export function projectedCashOn(dateISO: string, cashNow: number, bills: Bill[]): number {
  const due = openBillsOnOrBefore(dateISO, bills).reduce((s, b) => s + b.amount, 0)
  return round2(cashNow - due)
}

/* ------------------------------------------------------------------ */
/* Month pressure scale — the visual-only heat behind cell tint + the  */
/* inspector's DAY PRESSURE bar (day bills+out vs the month's max).    */
/* ------------------------------------------------------------------ */

export function monthPressureMax(
  month: MonthRef,
  bills: Bill[],
  transactions: Transaction[],
): number {
  const count = daysInMonth(month.year, month.month)
  const start = monthStartISO(month)
  let max = 0
  for (let i = 0; i < count; i++) {
    const r = dayRollup(addDaysISO(start, i), bills, transactions)
    if (r.pressure > max) max = r.pressure
  }
  return max
}

/** 0..1 pressure ratio for tint/bar width. 0 when the month is calm. */
export function pressureRatio(pressure: number, max: number): number {
  if (max <= 0 || pressure <= 0) return 0
  return Math.min(1, pressure / max)
}

/* ------------------------------------------------------------------ */
/* Month stat window — the tiles + filter counts are forward-looking:  */
/* events from today through the viewed month's end (screenshot: Aug   */
/* shows $0.00 / 0 events because the only August ledger entry is      */
/* Aug 1, before the Aug 2 "today").                                   */
/* ------------------------------------------------------------------ */

export interface MonthWindowStats {
  monthIncome: number
  monthSpend: number
  incomeEvents: number
  spendEvents: number
  billsOpenTotal: number
  billsOpenCount: number
  billsDueSoon: number // open bills due within 7 days of today
  netCashFlow: number
}

export function monthWindowStats(
  month: MonthRef,
  bills: Bill[],
  transactions: Transaction[],
  todayISO: string,
): MonthWindowStats {
  const start = todayISO > monthStartISO(month) ? todayISO : monthStartISO(month)
  const end = monthEndISO(month)
  let monthIncome = 0
  let monthSpend = 0
  let incomeEvents = 0
  let spendEvents = 0
  if (start <= end) {
    for (const tx of transactions) {
      if (tx.date < start || tx.date > end) continue
      if (tx.type === 'income') {
        monthIncome += tx.amount
        incomeEvents += 1
      } else {
        monthSpend += tx.amount
        spendEvents += 1
      }
    }
  }
  const open = openBills(bills)
  const billsDueSoon = open.filter((b) => {
    const d = daysUntil(b.dueDate, todayISO)
    return d >= 0 && d <= 7
  }).length
  return {
    monthIncome: round2(monthIncome),
    monthSpend: round2(monthSpend),
    incomeEvents,
    spendEvents,
    billsOpenTotal: round2(open.reduce((s, b) => s + b.amount, 0)),
    billsOpenCount: open.length,
    billsDueSoon,
    netCashFlow: round2(monthIncome - monthSpend),
  }
}

/* ------------------------------------------------------------------ */
/* Filter chips — All / Bills / Income / Spend counts over the same    */
/* forward month window as the stat tiles.                             */
/* ------------------------------------------------------------------ */

export type CalendarFilter = 'all' | 'bills' | 'income' | 'spend'

export interface FilterCounts {
  all: number
  bills: number
  income: number
  spend: number
}

export function filterCounts(
  month: MonthRef,
  bills: Bill[],
  transactions: Transaction[],
  todayISO: string,
): FilterCounts {
  const stats = monthWindowStats(month, bills, transactions, todayISO)
  const billsInWindow = openBills(bills).filter((b) => {
    const start = todayISO > monthStartISO(month) ? todayISO : monthStartISO(month)
    return b.dueDate >= start && b.dueDate <= monthEndISO(month)
  }).length
  return {
    all: billsInWindow + stats.incomeEvents + stats.spendEvents,
    bills: billsInWindow,
    income: stats.incomeEvents,
    spend: stats.spendEvents,
  }
}

/** Does a day pass the active filter? (grid/week/agenda day visibility) */
export function dayMatchesFilter(rollup: DayRollup, filter: CalendarFilter): boolean {
  switch (filter) {
    case 'bills':
      return rollup.bills > 0 || rollup.billItems.length > 0
    case 'income':
      return rollup.in > 0
    case 'spend':
      return rollup.out > 0
    case 'all':
    default:
      return (
        rollup.billItems.length > 0 || rollup.in > 0 || rollup.out > 0
      )
  }
}

/* ------------------------------------------------------------------ */
/* Upcoming list — open bills sorted by due date, labeled vs today     */
/* ------------------------------------------------------------------ */

export interface UpcomingItem {
  bill: Bill
  state: BillVisualState
  daysAway: number
  label: string // "due today" · "in 3d" · "2d overdue"
}

export function buildUpcoming(bills: Bill[], todayISO: string): UpcomingItem[] {
  return openBills(bills)
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((bill) => {
      const daysAway = daysUntil(bill.dueDate, todayISO)
      const label =
        daysAway === 0
          ? 'due today'
          : daysAway > 0
            ? `in ${daysAway}d`
            : `${-daysAway}d overdue`
      return { bill, state: billState(bill, todayISO), daysAway, label }
    })
}

/* ------------------------------------------------------------------ */
/* Display helpers (pure string formatting — no locale surprises)      */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_NARROW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const WEEKDAY_HEADERS = WEEKDAY_NARROW

export function monthLabel(ref: MonthRef): string {
  return `${MONTH_NAMES[ref.month]} ${ref.year}`
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[new Date(`${iso}T12:00:00`).getDay()]
}

/** "Sun, Aug 2" */
export function dayHeaderLabel(iso: string): string {
  const p = parseISO(iso)
  return `${weekdayShort(iso)}, ${MONTH_SHORT[p.month]} ${p.day}`
}

/** "Aug 2" */
export function shortDateLabel(iso: string): string {
  const p = parseISO(iso)
  return `${MONTH_SHORT[p.month]} ${p.day}`
}

/** en-US USD, always 2 decimals: "$16,374.72" */
export function money2(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Signed 2-decimal USD with ASCII sign: "+$0.00" / "-$15.49" */
export function signedMoney2(n: number): string {
  const abs = money2(Math.abs(n))
  if (n > 0) return `+${abs}`
  if (n < 0) return `-${abs}`
  return `+${abs}`
}

/** Compact magnitude for cell/week nets: 1850 → "1.9k", 112 → "112" */
export function compactMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) {
    const k = abs / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `$${Math.round(abs)}`
}

/**
 * Week-column net label — verbatim reference copy: "Clear" when the day
 * is empty, "+$x" when positive, "-+$x" when negative (yes, the
 * reference really renders "-+$112"; cal-final-week.png).
 */
export function weekNetLabel(impact: number): string {
  if (impact === 0) return 'Clear'
  if (impact > 0) return `+${compactMoney(impact)}`
  return `-+${compactMoney(impact)}`
}

/** Category id → display label ("utilities" → "Utilities"). */
export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}
