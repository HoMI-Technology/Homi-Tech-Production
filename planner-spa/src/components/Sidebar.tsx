import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftRight, Calculator, CalendarDays, ClipboardList, Compass, Dna, FlaskConical, LayoutGrid, Milestone, PieChart, RotateCcw, ShieldCheck, Tag, Target, TrendingUp, Users } from 'lucide-react'
import { useBudget, fmt, fmtSigned, fmtTime, netWorthSeries, totalNetWorth } from '@/store/budget'
import PulseDot from '@/components/PulseDot'
import AnimatedNumber from '@/components/AnimatedNumber'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Readiness', to: '/readiness', icon: Compass, hash: '' },
  { label: 'Assessment', to: '/assessment', icon: ClipboardList, hash: '' },
  { label: 'Build Path', to: '/buildpath', icon: Milestone, hash: '' },
  { label: 'Rehearse', to: '/rehearse', icon: FlaskConical, hash: '' },
  { label: 'Tools', to: '/tools', icon: Calculator, hash: '' },
  { label: 'Planner', to: '/planner', icon: CalendarDays, hash: '' },
  { label: 'Partner', to: '/partner', icon: Users, hash: '' },
  { label: 'Genome', to: '/genome', icon: Dna, hash: '' },
  { label: 'Overview', to: '/', icon: LayoutGrid, hash: '' },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight, hash: '' },
  { label: 'Investments', to: '/investments', icon: TrendingUp, hash: '' },
  { label: 'Goals', to: '/goals', icon: Target, hash: '' },
  { label: 'Analytics', to: '/goals#analytics', icon: PieChart, hash: '#analytics' },
  { label: 'Trust & Data', to: '/trust', icon: ShieldCheck, hash: '' },
  { label: 'Pricing', to: '/pricing', icon: Tag, hash: '' },
]

/** App sidebar — design.md §6.1. 248px full / 72px icon rail / drawer. */
export default function Sidebar({ mode = 'auto', onNavigate }: { mode?: 'auto' | 'drawer'; onNavigate?: () => void }) {
  const { state, resetDemoData } = useBudget()
  const location = useLocation()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

  const netWorth = totalNetWorth(state)
  const nwSeries = useMemo(() => netWorthSeries(state), [state])
  const nwDelta = nwSeries.length > 1 ? nwSeries[nwSeries.length - 1] - nwSeries[nwSeries.length - 2] : 0

  const rail = mode === 'auto'

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    const [path, hash] = item.to.split('#')
    if (path === '/') return location.pathname === '/'
    if (location.pathname !== path) return false
    const wanted = hash ? `#${hash}` : ''
    return wanted === '' ? location.hash !== '#analytics' : location.hash === wanted
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.06] bg-navyLight',
        mode === 'drawer' ? 'w-[248px]' : 'hidden w-[72px] md:flex xl:w-[248px]',
      )}
    >
      {/* wordmark */}
      <div className={cn('px-5 pb-5 pt-6', rail && 'max-xl:px-0 max-xl:text-center')}>
        {/* Locked wordmark: Inter 900, -0.02em, H cyan · ō emerald · M yellow · I cyan. Never italic/gradient/animated. */}
        <Link
          to="/"
          onClick={onNavigate}
          className="font-sans text-[18px] font-black tracking-[-0.02em]"
          aria-label="HōMI home"
        >
          <span className="text-cyan">H</span>
          <span className="text-emerald">ō</span>
          <span className="text-yellow">M</span>
          <span className="text-cyan">I</span>
        </Link>
        <p className={cn('text-label mt-2 !text-[9px]', rail && 'max-xl:hidden')}>Decision Readiness</p>
      </div>

      {/* nav */}
      <nav className={cn('flex flex-col gap-1 px-3', rail && 'max-xl:items-center max-xl:px-2')}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-cyan-300' : 'text-dim hover:bg-white/[0.04] hover:text-light',
                rail && 'max-xl:justify-center max-xl:px-0 max-xl:py-3 max-xl:w-11',
              )}
            >
              {active && (
                <motion.span
                  layoutId={mode === 'drawer' ? 'nav-pill-drawer' : 'nav-pill'}
                  className="absolute inset-0 rounded-xl bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              )}
              {active && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cyan" />}
              <Icon size={17} className="relative shrink-0" />
              <span className={cn('relative', rail && 'max-xl:hidden')}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* net-worth mini module */}
      <div className={cn('mx-3 mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4', rail && 'max-xl:hidden')}>
        <p className="text-label">Net Worth</p>
        <AnimatedNumber value={netWorth} format={(n) => fmt(n)} className="text-kpi mt-1.5 block !text-[22px] text-light" />
        <div className="mt-2">
          <NetWorthSpark values={nwSeries} />
        </div>
        <p className={cn('mt-1.5 text-[11px] font-semibold', nwDelta >= 0 ? 'text-emerald' : 'text-crimson')}>
          {fmtSigned(nwDelta, 0)} vs last month
        </p>
      </div>

      {/* footer */}
      <div className={cn('border-t border-white/[0.06] px-5 py-4', rail && 'max-xl:px-2')}>
        <p className={cn('flex items-center gap-1.5 text-xs text-dim', rail && 'max-xl:justify-center')}>
          <PulseDot color="#34d399" size={5} />
          <span className={cn(rail && 'max-xl:hidden')}>Saved {fmtTime(state.savedAt)}</span>
        </p>
        <button
          onClick={() => setConfirmReset(true)}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-light',
            rail && 'max-xl:mx-auto',
          )}
        >
          <RotateCcw size={12} />
          <span className={cn(rail && 'max-xl:hidden')}>Reset demo data</span>
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        body="Your ledger, goals and portfolio will be replaced with the original HōMI demo dataset. This cannot be undone."
        confirmLabel="Reset"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData()
          navigate('/')
        }}
      />
    </aside>
  )
}

function NetWorthSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 160
  const h = 32
  const up = values[values.length - 1] >= values[0]
  const color = up ? '#34d399' : '#f24822'
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 6)}`)
  const id = up ? 'nw-spark-up' : 'nw-spark-down'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
