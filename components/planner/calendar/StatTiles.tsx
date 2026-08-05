/* Decision calendar — the four month stat tiles. */

import { Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import type { MonthWindowStats } from '@/lib/planner/calendar'
import { money2, signedMoney2 } from '@/lib/planner/calendar'

interface TileSpec {
  label: string
  icon: LucideIcon
  value: string
  valueClass: string
  sub: string
  tint: string
}

export default function StatTiles({
  stats,
  eomProjected,
  paidCount,
}: {
  stats: MonthWindowStats
  eomProjected: number
  paidCount: number
}) {
  const totalBills = stats.billsOpenCount + paidCount
  const clearedRatio = totalBills > 0 ? paidCount / totalBills : 0

  const tiles: TileSpec[] = [
    {
      label: 'Income ahead',
      icon: TrendingUp,
      value: money2(stats.monthIncome),
      valueClass: 'text-emerald',
      sub: `${stats.incomeEvents} ledger events left this month`,
      tint: 'from-emerald/[0.07]',
    },
    {
      label: 'Spend ahead',
      icon: TrendingDown,
      value: money2(stats.monthSpend),
      valueClass: 'text-light',
      sub: 'Outflows from today to month end',
      tint: 'from-white/[0.03]',
    },
    {
      label: 'Bills open',
      icon: Receipt,
      value: money2(stats.billsOpenTotal),
      valueClass: 'text-yellow',
      sub: `${stats.billsOpenCount} open · ${stats.billsDueSoon} due ≤7d`,
      tint: 'from-yellow/[0.07]',
    },
    {
      label: 'Net cash flow',
      icon: Wallet,
      value: signedMoney2(stats.netCashFlow),
      valueClass: 'text-cyan',
      sub: `EOM projected ${money2(eomProjected)}`,
      tint: 'from-cyan/[0.07]',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cn(
            'rounded-xl border border-white/[0.06] bg-gradient-to-br to-transparent p-4',
            t.tint,
          )}
        >
          <div className="flex items-center gap-1.5 text-dim">
            <t.icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
              {t.label}
            </span>
          </div>
          <p
            className={cn(
              'mt-2 font-display text-lg font-semibold tabular-nums sm:text-xl',
              t.valueClass,
            )}
          >
            {t.value}
          </p>
          <p className="mt-0.5 text-[11px] text-dim">{t.sub}</p>
          {t.label === 'Bills open' && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-yellow/70 transition-all"
                style={{ width: `${Math.max(clearedRatio * 100, totalBills > 0 ? 2 : 0)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
