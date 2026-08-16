import { useMemo, useState } from 'react'
import { ClipboardCopy, Download, Printer } from 'lucide-react'
import {
  downloadReceipt,
  issueReceipt,
  type SignedReceipt,
} from '@/lib/receipts'
import { scoreFromBudget, toPlannerScore } from '@/lib/planner/score-bridge'
import { VERDICT_META } from '@/lib/score'
import { usePlannerStore } from '@/store/planner'
import { PlanFooter, PlanSectionHeader, VerdictChip } from './ui'

/* ------------------------------------------------------------------ */
/* Share sub-tab — export pack + band-only receipt (spec §7 / §3.6).   */
/*                                                                     */
/* Receipts: canon lib/receipts.ts — verdict + coarse bands + device   */
/* signature, never the exact score or underlying financials. The key  */
/* lives on this device; the copy below says exactly what that proves. */
/* ------------------------------------------------------------------ */

export default function PlanShare() {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)
  const householdPartner = usePlannerStore((s) => s.householdPartner)
  const debts = usePlannerStore((s) => s.debts)

  const plannerScore = useMemo(() => {
    const result = scoreFromBudget({
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
      debts,
    })
    return toPlannerScore(result, {
      singleRedistribution: !householdPartner.enabled,
    })
  }, [
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    householdPartner.enabled,
    debts,
  ])

  const [receipt, setReceipt] = useState<SignedReceipt | null>(null)
  const [copied, setCopied] = useState<'summary' | 'json' | null>(null)
  const [busy, setBusy] = useState(false)

  const copyText = async (text: string, kind: 'summary' | 'json') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  const summaryText = () => {
    const meta = VERDICT_META[plannerScore.verdict]
    const lines = [
      `HōMI readiness — ${meta.label}`,
      `Verdict: ${meta.label} · score ${plannerScore.score} of 100`,
      `Pillars: Financial ${plannerScore.pillarPct.financial}% · Emotional ${plannerScore.pillarPct.emotional}% · Timing ${plannerScore.pillarPct.timing}%`,
      `Next steps:`,
      ...plannerScore.nextSteps.map((s, i) => `${i + 1}. ${s}`),
      'Educational guidance only — not financial, legal, tax, or investment advice.',
    ]
    return lines.join('\n')
  }

  const ensureReceipt = async (): Promise<SignedReceipt> => {
    if (receipt) return receipt
    setBusy(true)
    try {
      const issued = await issueReceipt(plannerScore.result)
      setReceipt(issued)
      return issued
    } finally {
      setBusy(false)
    }
  }

  const claims = receipt?.claims ?? null

  return (
    <section className="card-chrome card-hairline-top p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="EXPORT PACK"
        title="Share readiness"
        caption="Score, pillars, next steps, and a band-only receipt — a shareable artifact that never carries your raw numbers."
      />

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => copyText(summaryText(), 'summary')}
          className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-[13px] font-semibold text-light transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ClipboardCopy size={14} />
          {copied === 'summary' ? 'Copied' : 'Copy summary'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const r = await ensureReceipt()
            await copyText(JSON.stringify(r, null, 2), 'json')
          }}
          className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-[13px] font-semibold text-light transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
        >
          <ClipboardCopy size={14} />
          {copied === 'json' ? 'Copied' : 'Copy receipt JSON'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const r = await ensureReceipt()
            downloadReceipt(r)
          }}
          className="flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-navy shadow-glow-cyan transition-colors hover:bg-cyan/90 disabled:opacity-50"
        >
          <Download size={14} />
          Download receipt
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-[13px] font-semibold text-light transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <Printer size={14} />
          Print / PDF
        </button>
      </div>

      {/* mini readiness card */}
      <div className="mx-auto mt-6 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-navyLight/80 p-5">
        <div className="flex items-center justify-between">
          <p className="text-label text-cyan">HōMI READINESS</p>
          <VerdictChip verdict={plannerScore.verdict} />
        </div>
        <p className="mt-3 font-display text-[40px] font-bold leading-none text-light tnum">
          {plannerScore.score}
          <span className="ml-1.5 text-[13px] font-medium text-dim">of 100</span>
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {(
            [
              ['FINANCIAL', plannerScore.pillarPct.financial],
              ['EMOTIONAL', plannerScore.pillarPct.emotional],
              ['TIMING', plannerScore.pillarPct.timing],
            ] as const
          ).map(([label, pct]) => (
            <div key={label}>
              <div className="flex items-center justify-between">
                <span className="text-label">{label}</span>
                <span className="font-display text-[11px] text-dim">{pct}%</span>
              </div>
              <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {claims && (
          <p className="mt-4 break-all rounded-lg bg-white/[0.03] px-2.5 py-1.5 font-display text-[10px] text-dim">
            homi_rcpt_{claims.verdict.toLowerCase()}_{claims.scoreBand}_
            {claims.deviceKeyId}
          </p>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-dim/70">
          Educational only — not credit, lending, legal, tax, or investment
          advice. Band-only receipt · no underlying financials.
        </p>
      </div>

      {claims && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <p className="text-label">RECEIPT CLAIMS</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-3">
            <div>
              <dt className="text-dim">Verdict</dt>
              <dd className="font-display text-light">{claims.verdict}</dd>
            </div>
            <div>
              <dt className="text-dim">Score band</dt>
              <dd className="font-display text-light">{claims.scoreBand}</dd>
            </div>
            <div>
              <dt className="text-dim">Issued</dt>
              <dd className="font-display text-light">
                {claims.issuedAt.slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="text-dim">Financial</dt>
              <dd className="font-display text-light">{claims.pillars.financial}</dd>
            </div>
            <div>
              <dt className="text-dim">Emotional</dt>
              <dd className="font-display text-light">{claims.pillars.emotional}</dd>
            </div>
            <div>
              <dt className="text-dim">Timing</dt>
              <dd className="font-display text-light">{claims.pillars.timing}</dd>
            </div>
          </dl>
        </div>
      )}

      <PlanFooter
        lines={[
          'A receipt is signed with a key generated on this device — it proves the receipt was not altered since this device issued it, and nothing more. No third party can verify it without this device.',
          'Receipts carry verdict and coarse bands only — never your exact score, balances, or identity.',
        ]}
      />
    </section>
  )
}
