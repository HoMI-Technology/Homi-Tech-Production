import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fmt, fmtPct, fmtSigned } from '@/store/budget'
import AnimatedNumber from '@/components/AnimatedNumber'
import { cn } from '@/lib/utils'

export type LedgerSummary = {
  income: number
  incomeCount: number
  expenses: number
  expenseCount: number
  net: number
}

function Chip({
  icon: Icon,
  iconTint,
  label,
  value,
  caption,
  valueClass,
  delay,
}: {
  icon: LucideIcon
  iconTint: string
  label: string
  value: number
  caption: string
  valueClass?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
      className="flex min-w-[220px] flex-1 items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-slate/60 px-5 py-4"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${iconTint}1a`, color: iconTint }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-label">{label}</p>
        <AnimatedNumber
          value={value}
          format={(n) => (label === 'Net' ? fmtSigned(n, 0) : fmt(n, 0))}
          className={cn('mt-0.5 block font-display text-xl font-semibold tnum', valueClass ?? 'text-light')}
        />
        <p className="mt-0.5 truncate text-xs text-dim">{caption}</p>
      </div>
    </motion.div>
  )
}

/** Three stat chips above the ledger (transactions.md §2). */
export default function SummaryStrip({ summary }: { summary: LedgerSummary }) {
  const rate = summary.income > 0 ? summary.net / summary.income : 0
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip
        icon={ArrowDownLeft}
        iconTint="#22d3ee"
        label="Money in"
        value={summary.income}
        caption={`${summary.incomeCount} ${summary.incomeCount === 1 ? 'entry' : 'entries'}`}
        delay={0}
      />
      <Chip
        icon={ArrowUpRight}
        iconTint="#f24822"
        label="Money out"
        value={summary.expenses}
        caption={`${summary.expenseCount} ${summary.expenseCount === 1 ? 'entry' : 'entries'}`}
        delay={0.05}
      />
      <Chip
        icon={Scale}
        iconTint={summary.net >= 0 ? '#34d399' : '#f24822'}
        label="Net"
        value={summary.net}
        caption={`savings rate ${fmtPct(rate)}`}
        valueClass={summary.net >= 0 ? 'text-emerald' : 'text-crimson'}
        delay={0.1}
      />
    </div>
  )
}
