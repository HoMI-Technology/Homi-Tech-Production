/* Shared visual atoms for the Decision calendar surface. */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { BillVisualState } from '@/lib/planner/calendar'
import { BILL_STATE_LABEL } from '@/lib/planner/calendar'
import type { ExpenseCategory } from '@/lib/planner/types'

/* Card shells ------------------------------------------------------ */

export const CARD =
  'rounded-2xl border border-white/[0.06] bg-navyLight/60'
export const SUBCARD =
  'rounded-xl border border-white/[0.06] bg-white/[0.02]'

export const EYEBROW =
  'text-[10px] font-medium uppercase tracking-[0.22em] text-cyan'
export const EYEBROW_DIM =
  'text-[10px] font-medium uppercase tracking-[0.22em] text-dim'

export function SectionCard({
  eyebrow,
  count,
  icon,
  children,
  className,
}: {
  eyebrow: string
  count?: number
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(CARD, 'p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className={EYEBROW_DIM}>{eyebrow}</span>
        {count != null && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 font-display text-[10px] tabular-nums text-dim">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* Bill state chip --------------------------------------------------- */

const STATE_CHIP_CLASS: Record<BillVisualState, string> = {
  due: 'border-yellow/40 bg-yellow/10 text-yellow',
  upcoming: 'border-cyan/40 bg-cyan/10 text-cyan',
  scheduled: 'border-white/[0.1] bg-white/[0.03] text-dim',
  paid: 'border-emerald/40 bg-emerald/10 text-emerald',
  overdue: 'border-crimson/50 bg-crimson/10 text-crimson',
}

export function BillStateChip({ state }: { state: BillVisualState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]',
        STATE_CHIP_CLASS[state],
      )}
    >
      {BILL_STATE_LABEL[state]}
    </span>
  )
}

/* Event dots (month grid / agenda) ----------------------------------- */

export type DotKind = 'overdue' | 'bill' | 'spend' | 'income'

export const DOT_CLASS: Record<DotKind, string> = {
  overdue: 'bg-crimson',
  bill: 'bg-yellow',
  spend: 'bg-cyan',
  income: 'bg-emerald',
}

export function EventDot({ kind, className }: { kind: DotKind; className?: string }) {
  return (
    <span
      className={cn('inline-block h-1.5 w-1.5 rounded-full', DOT_CLASS[kind], className)}
    />
  )
}

/* Inputs -------------------------------------------------------------- */

export const INPUT_CLASS =
  'w-full rounded-lg border border-white/[0.08] bg-slate px-3 py-2 text-sm text-light outline-none transition-colors placeholder:text-dim/50 focus:border-cyan/50'

export const SELECT_CLASS =
  'w-full appearance-none rounded-lg border border-white/[0.08] bg-slate px-3 py-2 text-sm text-light outline-none transition-colors focus:border-cyan/50'

export const FIELD_LABEL = 'mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-dim'

/* Expense categories for the add-bill / log-spend selects. */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'housing',
  'food',
  'transport',
  'utilities',
  'health',
  'entertainment',
  'shopping',
  'debt',
  'other',
]
