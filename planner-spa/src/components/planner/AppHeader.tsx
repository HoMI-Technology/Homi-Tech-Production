/* ------------------------------------------------------------------ */
/* AppHeader — planner in-page header block + legal footer (spec §0).  */
/*                                                                     */
/* Eyebrow + Fraunces italic display title + state-rotating tagline.   */
/* Top-right action: `Reset demo` while demo data is loaded,           */
/* `Clear data` (ConfirmDialog) otherwise. PlannerFooter carries the   */
/* verbatim planner-variant legal disclaimer.                          */
/* ------------------------------------------------------------------ */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eraser, RotateCcw } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { usePlannerStore } from '@/store/planner'
import { usePlannerIsEmpty, usePlannerScore } from '@/components/planner/ReadinessHero'

/* ------------------------------------------------------------------ */
/* Tagline variants (spec §0, verbatim)                                */
/* ------------------------------------------------------------------ */

const TAGLINE_DEFAULT =
  'Cash flow, banks, portfolio, Path to Ready, and decision models — HōMI numbers for real choices, not a sales funnel.'
const TAGLINE_LIVE =
  'HōMI-Score, live signals, Path to Ready, debt lab, and household dual readiness — numbers that protect decisions.'
const TAGLINE_PROTECT =
  'Stress patterns, protective nudges, and closed-loop score moves — numbers that protect decisions.'
const TAGLINE_PATH =
  'Closed-loop score, signals, Path, housing lens, debt lab, and household dual readiness — actions that move the number.'
const TAGLINE_EMPTY =
  'Your numbers. Protective nudges. Closed-loop score moves when cash, path, or stress change.'

/* ------------------------------------------------------------------ */
/* Legal footer (spec §0, verbatim planner variant)                    */
/* ------------------------------------------------------------------ */

const LEGAL_LINE =
  'HōMI is a product of HOMI TECHNOLOGIES LLC. Educational guidance only — not financial, legal, tax, or investment advice. Bank/broker linking, Monte Carlo, and decision models are demo flows for product validation.'
const LEGAL_EMPTY_SUFFIX =
  'Your data stays on this device until you connect production services.'

export function PlannerFooter() {
  const isEmpty = usePlannerIsEmpty()
  return (
    <footer className="mt-12 border-t border-white/[0.06] pt-6">
      <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-dim">
        {LEGAL_LINE}
        {isEmpty ? ` ${LEGAL_EMPTY_SUFFIX}` : ''}
      </p>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

/** True when the workspace still carries demo-seed rows (id namespaced). */
function useIsDemoWorkspace(): boolean {
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const transactions = usePlannerStore((s) => s.transactions)
  return (
    accounts.some((a) => a.id.startsWith('acct-demo-')) ||
    bills.some((b) => b.id.startsWith('bill-demo-')) ||
    transactions.some((t) => t.id.startsWith('tx-demo-'))
  )
}

export default function AppHeader() {
  const isEmpty = usePlannerIsEmpty()
  const isDemo = useIsDemoWorkspace()
  const planner = usePlannerScore()
  const path = usePlannerStore((s) => s.path)
  const resetDemo = usePlannerStore((s) => s.resetDemo)
  const clearWorkspace = usePlannerStore((s) => s.clearWorkspace)
  const [confirmClear, setConfirmClear] = useState(false)

  const tagline = isEmpty
    ? TAGLINE_EMPTY
    : planner.hardStops.length > 0
      ? TAGLINE_PROTECT
      : path
        ? TAGLINE_PATH
        : planner.score > 0 && !isDemo
          ? TAGLINE_LIVE
          : TAGLINE_DEFAULT

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-label uppercase tracking-widest text-cyan">
          Decision Readiness Intelligence
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mt-2 font-serif text-4xl italic text-light sm:text-5xl"
        >
          Budget Planner
        </motion.h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">{tagline}</p>
      </div>

      <div className="flex items-center gap-2">
        {isDemo ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => resetDemo()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate/60 px-4 py-2 text-sm font-medium text-light transition-colors hover:border-cyan/30 hover:text-cyan"
          >
            <RotateCcw size={15} />
            Reset demo
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate/60 px-4 py-2 text-sm font-medium text-light transition-colors hover:border-crimson/30 hover:text-crimson"
          >
            <Eraser size={15} />
            Clear data
          </motion.button>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your planner data?"
        body="Transactions, accounts, bills, holdings, Path, and check-ins on this device are removed. Nothing was ever sent anywhere — clearing simply starts you back at an honest blank page."
        confirmLabel="Clear data"
        onConfirm={() => clearWorkspace()}
        onClose={() => setConfirmClear(false)}
      />
    </header>
  )
}
