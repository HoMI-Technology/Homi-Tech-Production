import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Ban,
  Check,
  Database,
  Download,
  Eraser,
  HardDrive,
  Scale,
  Trash2,
} from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useConfidence } from '@/lib/confidence'
import type { ConfidenceLevel } from '@/lib/confidence'
import { clearEvents, getEvents } from '@/lib/events'
import { AUDIT_SOURCE_META, useAuditRows } from '@/components/trust/audit'
import type { AuditSource } from '@/components/trust/audit'
import { NON_POSITIONING } from '@/components/trust/legal'
import { downloadHomiExport, eraseAllHomiData } from '@/components/trust/dataPortability'
import DividendSection from '@/components/trust/DividendSection'
import ReceiptSection from '@/components/trust/ReceiptSection'
import { cn } from '@/lib/utils'

const ERASE_COPY =
  'This removes every entry, goal, holding, and score from this browser. There is no undo.'

const PRIVACY_BLOCKS = [
  {
    icon: HardDrive,
    title: 'Where your data lives',
    body: "In this browser's local storage. There is no HōMI server receiving your numbers in this build.",
  },
  {
    icon: Ban,
    title: 'What we never do',
    body: "No selling data. No lender offers. No credit-broker fees. Ever — it's in our non-positioning.",
  },
  {
    icon: Scale,
    title: 'The non-positioning',
    body: NON_POSITIONING,
  },
  {
    icon: Database,
    title: 'Demo data',
    body: "The sample ledger is there so the app isn't empty. First real entry makes it yours.",
  },
]

const LEVEL_META: Record<ConfidenceLevel, { label: string; hex: string }> = {
  high: { label: 'High', hex: '#34d399' },
  medium: { label: 'Medium', hex: '#facc15' },
  low: { label: 'Low', hex: '#fab633' },
}

const SOURCE_BADGE_CLASS: Record<AuditSource, string> = {
  computed: 'bg-cyan/10 text-cyan',
  self: 'bg-yellow/10 text-yellow',
  default: 'bg-amber/10 text-amber',
}

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
})

/** Trust & data — M0 privacy shell + M10 input audit + event log tail. */
export default function Trust() {
  const confidence = useConfidence()
  const rows = useAuditRows()
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0)
  const [eventCount, setEventCount] = useState(() => getEvents().length)

  const level = LEVEL_META[confidence.level]

  const handleErase = () => {
    eraseAllHomiData()
    window.location.reload()
  }

  const handleClearLog = () => {
    clearEvents()
    setEventCount(0)
  }

  return (
    <div className="flex flex-col gap-10">
      {/* hero */}
      <motion.div {...reveal(0)} className="max-w-2xl">
        <p className="text-label">Trust &amp; data</p>
        <h1 className="mt-3 font-serif text-[34px] italic leading-[1.15] text-light md:text-[44px]">
          Your numbers live here. Nowhere else.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Everything you enter stays in this browser. You can take it with you, or erase it, any
          time.
        </p>
      </motion.div>

      {/* privacy — plain language */}
      <motion.div {...reveal(1)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PRIVACY_BLOCKS.map((block) => {
          const Icon = block.icon
          return (
            <div key={block.title} className="card-chrome p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] bg-slate/80">
                  <Icon size={15} className="text-cyan" />
                </span>
                <h2 className="text-sm font-semibold text-light">{block.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-dim">{block.body}</p>
            </div>
          )
        })}
      </motion.div>

      {/* export & delete */}
      <motion.div {...reveal(2)} className="card-chrome card-hairline-top p-6">
        <p className="text-label">Export &amp; delete</p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-light">Take it with you</h3>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              One JSON file with everything HōMI has stored in this browser — ledger, goals,
              holdings, and readiness inputs.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={downloadHomiExport}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-[0_0_24px_rgba(34,211,238,0.25)]"
            >
              <Download size={15} />
              Download my data (JSON)
            </motion.button>
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-light">Leave no trace</h3>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              Erase every HōMI key from this browser and start from a clean slate.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setConfirmStep(1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm font-semibold text-crimson transition-colors hover:bg-crimson/20"
            >
              <Trash2 size={15} />
              Erase everything
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* input audit (M10) */}
      <motion.section {...reveal(3)} id="audit" className="scroll-mt-24">
        <div className="max-w-2xl">
          <p className="text-label">Input audit</p>
          <h2 className="mt-3 font-serif text-[24px] italic leading-snug text-light md:text-[28px]">
            Confidence is a feature. Estimated numbers say so.
          </h2>
        </div>

        {/* confidence summary */}
        <div className="card-chrome mt-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ backgroundColor: `${level.hex}1a`, color: level.hex }}
            >
              {level.label} confidence
            </span>
            <span className="font-display text-[28px] font-semibold text-light tnum">
              {Math.round(confidence.value * 100)}%
            </span>
            <span className="text-xs text-dim">composite of the factors below</span>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            {confidence.factors.map((f) => (
              <li key={f.key} className="flex items-start gap-2.5">
                {f.ok ? (
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald" />
                ) : (
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber" />
                )}
                <div>
                  <span className="text-sm font-medium text-light">{f.label}</span>
                  <p className="text-xs leading-relaxed text-dim">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* audit table */}
        <div className="card-chrome mt-4 overflow-hidden">
          <div className="hidden grid-cols-12 gap-3 border-b border-white/[0.06] px-5 py-3 md:grid">
            <span className="text-label col-span-4">Input</span>
            <span className="text-label col-span-2 text-right">Value</span>
            <span className="text-label col-span-3">Source</span>
            <span className="text-label col-span-3">As of</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-2 gap-2 border-b border-white/[0.04] px-5 py-3.5 transition-colors last:border-b-0 hover:bg-slateHover/40 md:grid-cols-12 md:items-center md:gap-3"
            >
              <span className="col-span-2 text-sm font-medium text-light md:col-span-4">
                {row.label}
              </span>
              <span className="col-span-1 font-display text-[13px] text-light tnum md:col-span-2 md:text-right">
                {row.value}
              </span>
              <span className="col-span-1 md:col-span-3">
                <span
                  className={cn(
                    'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    SOURCE_BADGE_CLASS[row.source],
                  )}
                >
                  {AUDIT_SOURCE_META[row.source].badge}
                </span>
              </span>
              <span className="col-span-2 text-xs text-dim md:col-span-3">{row.asOf}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* readiness receipt (canon lib/receipts port — per-device signed) */}
      <motion.section {...reveal(4)}>
        <ReceiptSection />
      </motion.section>

      {/* readiness dividend (canon lib/outcomes framework — local trajectory only) */}
      <motion.section {...reveal(5)}>
        <DividendSection />
      </motion.section>

      {/* events tail */}
      <motion.div {...reveal(6)} className="card-chrome p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-label">On this device</p>
            <p className="mt-2 text-sm text-dim">
              <span className="font-display text-light tnum">{eventCount}</span>{' '}
              {eventCount === 1 ? 'event' : 'events'} logged locally — never leaves this browser.
            </p>
          </div>
          <button
            onClick={handleClearLog}
            disabled={eventCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-3.5 py-2 text-xs font-semibold text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser size={13} />
            Clear log
          </button>
        </div>
      </motion.div>

      {/* erase — double confirm (crimson) */}
      <ConfirmDialog
        open={confirmStep === 1}
        title="Erase everything?"
        body={ERASE_COPY}
        confirmLabel="Continue"
        onConfirm={() => setConfirmStep(2)}
        /* ConfirmDialog fires onConfirm then onClose on the same click —
           keep step 2 if we just advanced, otherwise dismiss. */
        onClose={() => setConfirmStep((s) => (s === 2 ? s : 0))}
      />
      <ConfirmDialog
        open={confirmStep === 2}
        title="Final confirmation"
        body={ERASE_COPY}
        confirmLabel="Erase everything"
        onConfirm={handleErase}
        onClose={() => setConfirmStep(0)}
      />
    </div>
  )
}
