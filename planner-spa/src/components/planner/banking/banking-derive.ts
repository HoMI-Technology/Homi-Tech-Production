/* ------------------------------------------------------------------ */
/* BankingCommand pure helpers — bill tiles, EOM projection, pay-from  */
/* resolution, and display formatting. Kept React-free so              */
/* scripts/planner-bank-wealth.test.mjs can esbuild-bundle and assert  */
/* demo parity (bank cash $18,720.60 · open bills $2,345.88 · EOM      */
/* $16,374.72 = cash − open bills). Aggregates reuse                   */
/* @/lib/planner/derived — no new lib files.                           */
/* ------------------------------------------------------------------ */

import {
  daysUntil,
  summarizeAccounts,
  upcomingBillsTotal,
} from '@/lib/planner/derived'
import type {
  BankAccount,
  Bill,
  BillStatus,
  ExpenseCategory,
} from '@/lib/planner/types'

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  utilities: 'Utilities',
  health: 'Health',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  debt: 'Debt',
  other: 'Other',
}

export const EXPENSE_CATEGORY_IDS = Object.keys(
  EXPENSE_CATEGORY_LABEL,
) as ExpenseCategory[]

/* ------------------------------------------------------------------ */
/* Bill pay tiles: OPEN / DUE TODAY / OVERDUE                          */
/* ------------------------------------------------------------------ */

export interface BillTiles {
  openCount: number
  openTotal: number
  dueToday: number
  overdue: number
  overdueTotal: number
}

export function billTiles(bills: Bill[]): BillTiles {
  const open = bills.filter((b) => b.status !== 'paid')
  const overdueBills = open.filter((b) => b.status === 'overdue')
  return {
    openCount: open.length,
    openTotal: upcomingBillsTotal(bills),
    dueToday: open.filter((b) => b.status === 'due').length,
    overdue: overdueBills.length,
    overdueTotal: overdueBills.reduce((s, b) => s + b.amount, 0),
  }
}

/** End-of-month projected cash = linked cash − open bills. */
export function eomProjection(accounts: BankAccount[], bills: Bill[]): number {
  const { cash } = summarizeAccounts(accounts)
  return Number((cash - upcomingBillsTotal(bills)).toFixed(2))
}

/* ------------------------------------------------------------------ */
/* Bill ordering + pay-from account resolution                         */
/* ------------------------------------------------------------------ */

/**
 * Bills in due-date order (overdue first — negative days), paid last.
 * Matches the reference bill-pay list ordering.
 */
export function sortBillsForPay(bills: Bill[]): Bill[] {
  const paidRank = (b: Bill) => (b.status === 'paid' ? 1 : 0)
  return [...bills].sort(
    (a, b) =>
      paidRank(a) - paidRank(b) || daysUntil(a.dueDate) - daysUntil(b.dueDate),
  )
}

/** Accounts a bill can be paid from (any linked account, checking first). */
export function payFromOptions(accounts: BankAccount[]): BankAccount[] {
  const rank = (a: BankAccount) =>
    a.type === 'checking' ? 0 : a.type === 'savings' ? 1 : 2
  return [...accounts].sort((a, b) => rank(a) - rank(b))
}

/**
 * Default pay-from account: the bill's assigned account when it still
 * exists, otherwise the first payable account. Mirrors the store's
 * payBill(billId, accountId?) fallback (accountId ?? bill.accountId).
 */
export function defaultPayFromId(
  bill: Bill,
  accounts: BankAccount[],
): string | undefined {
  if (bill.accountId && accounts.some((a) => a.id === bill.accountId)) {
    return bill.accountId
  }
  return payFromOptions(accounts)[0]?.id
}

/* ------------------------------------------------------------------ */
/* Status chips + relative-due copy                                    */
/* ------------------------------------------------------------------ */

export const BILL_STATUS_CHIP: Record<BillStatus, string> = {
  overdue: 'OVERDUE',
  due: 'DUE TODAY',
  upcoming: 'UPCOMING',
  scheduled: 'SCHEDULED',
  paid: 'PAID',
}

export function dueRelativeLabel(bill: Bill): string {
  if (bill.status === 'paid') return 'Paid'
  const d = daysUntil(bill.dueDate)
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'Due today'
  return `Due in ${d}d`
}

/* ------------------------------------------------------------------ */
/* Date / sync-stamp formatting                                        */
/* ------------------------------------------------------------------ */

function parseISODay(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

/** `Aug 2` from a YYYY-MM-DD bill due date. */
export function formatDay(iso: string): string {
  return parseISODay(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/** `Aug 2 · 2:30 PM` — account-row and tile sync stamps. */
export function formatSyncStamp(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

/** `Aug 3, 2:04 PM` — the header card's `Last sync:` line. */
export function formatSyncLong(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date}, ${time}`
}
