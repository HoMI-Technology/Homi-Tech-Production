"use client";

/* ------------------------------------------------------------------ */
/* DecisionCalendar — the Calendar tab surface ("CASH-FLOW             */
/* INSTRUMENT"). Single entry component; the planner shell wires it    */
/* into the tab. All derivation lives in @/lib/planner/calendar.       */
/*                                                                     */
/* Keyboard: M month · W week · A agenda · arrows move selection ·     */
/* T jump to today.                                                    */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Columns3,
  List,
  RotateCcw,
} from 'lucide-react'
import { cn } from "@/lib/planner/cn"
import { usePlannerStore } from "@/lib/planner/store"
import { addDaysISO, summarizeAccounts, todayISO } from '@/lib/planner/derived'
import type { CalendarFilter, MonthRef } from '@/lib/planner/calendar'
import {
  buildRunwaySeries,
  filterCounts,
  monthOfISO,
  monthWindowStats,
  shiftMonth,
} from '@/lib/planner/calendar'
import StatTiles from './StatTiles'
import RunwayCard, { FilterChips } from './RunwayCard'
import MonthGrid from './MonthGrid'
import WeekStrip from './WeekStrip'
import AgendaList from './AgendaList'
import DayInspector from './DayInspector'

type View = 'month' | 'week' | 'agenda'

const VIEW_PILLS: { key: View; label: string; icon: typeof CalendarDays }[] = [
  { key: 'month', label: 'Month', icon: CalendarDays },
  { key: 'week', label: 'Week', icon: Columns3 },
  { key: 'agenda', label: 'Agenda', icon: List },
]

export default function DecisionCalendar() {
  const bills = usePlannerStore((s) => s.bills)
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)

  const today = todayISO()
  const [view, setView] = useState<View>('month')
  const [comfort, setComfort] = useState(false)
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [selectedISO, setSelectedISO] = useState(today)
  const [viewedMonth, setViewedMonth] = useState<MonthRef>(() => monthOfISO(today))
  const [weekAnchor, setWeekAnchor] = useState(today)

  const cashNow = useMemo(() => summarizeAccounts(accounts).cash, [accounts])
  const stats = useMemo(
    () => monthWindowStats(viewedMonth, bills, transactions, today),
    [viewedMonth, bills, transactions, today],
  )
  const runway = useMemo(
    () => buildRunwaySeries(cashNow, bills, transactions, viewedMonth),
    [cashNow, bills, transactions, viewedMonth],
  )
  const counts = useMemo(
    () => filterCounts(viewedMonth, bills, transactions, today),
    [viewedMonth, bills, transactions, today],
  )
  const paidCount = useMemo(
    () => bills.filter((b) => b.status === 'paid' || b.paidAt).length,
    [bills],
  )

  const selectDay = (dateISO: string) => {
    setSelectedISO(dateISO)
    setViewedMonth(monthOfISO(dateISO))
    setWeekAnchor(dateISO)
  }

  const jumpToday = () => selectDay(todayISO())

  const shiftViewedMonth = (delta: number) =>
    setViewedMonth((m) => shiftMonth(m, delta))
  const shiftWeek = (delta: number) =>
    setWeekAnchor((a) => addDaysISO(a, delta * 7))

  /* Keyboard navigation — M/W/A views, arrows move selection, T today. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'm') setView('month')
      else if (key === 'w') setView('week')
      else if (key === 'a') setView('agenda')
      else if (key === 't') jumpToday()
      else if (key === 'arrowleft') {
        e.preventDefault()
        selectDay(addDaysISO(selectedISO, -1))
      } else if (key === 'arrowright') {
        e.preventDefault()
        selectDay(addDaysISO(selectedISO, 1))
      } else if (key === 'arrowup') {
        e.preventDefault()
        selectDay(addDaysISO(selectedISO, -7))
      } else if (key === 'arrowdown') {
        e.preventDefault()
        selectDay(addDaysISO(selectedISO, 7))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISO])

  return (
    <section className="card-chrome relative overflow-hidden p-4 sm:p-6">
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan/[0.08] blur-3xl"
        aria-hidden
      />
      {/* Header */}
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan/25 bg-cyan/10 shadow-[inset_0_1px_0_rgba(34,211,238,0.2)]">
            <CalendarDays className="h-5 w-5 text-cyan" />
          </span>
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan">
              Cash-flow instrument
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight text-light sm:text-3xl">
              Decision calendar
            </h2>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-dim sm:text-sm">
              Projected runway, bills, and ledger on one surface - pay,
              schedule, and plan without leaving the month.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/[0.08] bg-slate-surface/40 p-1">
            {VIEW_PILLS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                  view === v.key
                    ? "bg-cyan/15 text-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
                    : "text-dim hover:text-light",
                )}
              >
                <v.icon className="h-3.5 w-3.5" aria-hidden />
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={jumpToday}
            className="rounded-xl border border-white/[0.1] bg-navy/40 px-3.5 py-2 text-xs font-semibold text-light transition-colors hover:border-cyan/40 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setComfort((c) => !c)}
            aria-pressed={comfort}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
              comfort
                ? "border-cyan/50 bg-cyan/10 text-cyan"
                : "border-white/[0.1] bg-navy/40 text-dim hover:text-light",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Comfort
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-5">
        <StatTiles stats={stats} eomProjected={runway.eomProjected} paidCount={paidCount} />
      </div>

      {/* Runway + filter chips */}
      <div className="mt-4 flex flex-col gap-3 xl:flex-row">
        <RunwayCard series={runway} cashNow={cashNow} onJump={selectDay} />
        <FilterChips counts={counts} active={filter} onSelect={setFilter} />
      </div>

      {/* Grid / week / agenda + inspector */}
      <div className="mt-5 flex flex-col gap-6 xl:flex-row">
        {view === 'month' && (
          <MonthGrid
            month={viewedMonth}
            today={today}
            selectedISO={selectedISO}
            bills={bills}
            transactions={transactions}
            filter={filter}
            comfort={comfort}
            onSelect={setSelectedISO}
            onShiftMonth={shiftViewedMonth}
          />
        )}
        {view === 'week' && (
          <WeekStrip
            anchorISO={weekAnchor}
            today={today}
            selectedISO={selectedISO}
            bills={bills}
            transactions={transactions}
            comfort={comfort}
            onSelect={setSelectedISO}
            onShiftWeek={shiftWeek}
          />
        )}
        {view === 'agenda' && (
          <AgendaList
            today={today}
            selectedISO={selectedISO}
            bills={bills}
            transactions={transactions}
            filter={filter}
            comfort={comfort}
            onSelect={setSelectedISO}
          />
        )}
        <DayInspector
          selectedISO={selectedISO}
          today={today}
          bills={bills}
          transactions={transactions}
          cashNow={cashNow}
        />
      </div>
    </section>
  )
}
