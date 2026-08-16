import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { computeDualHouseholdScore } from '@/lib/household'
import { scoreHouseholdMember } from '@/lib/planner/score-bridge'
import { HARD_STOP_MESSAGES } from '@/lib/score'
import { usePlannerStore } from '@/store/planner'
import { NumberField } from '@/components/tools/ui'
import { PlanFooter, PlanSectionHeader, PlanTile, VerdictChip } from './ui'

/* ------------------------------------------------------------------ */
/* Household sub-tab — dual readiness (spec §7).                       */
/*                                                                     */
/* Engine: canon lib/household.ts (joint = min, hard-stop union) over  */
/* two canon score runs from planner/score-bridge.ts                   */
/* scoreHouseholdMember (income-share clamp 0.1–0.9). Partner inputs   */
/* persist through setHouseholdPartner.                                */
/* ------------------------------------------------------------------ */

export default function PlanHousehold() {
  const partner = usePlannerStore((s) => s.householdPartner)
  const setHouseholdPartner = usePlannerStore((s) => s.setHouseholdPartner)
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const holdings = usePlannerStore((s) => s.holdings)
  const netWorthItems = usePlannerStore((s) => s.netWorthItems)
  const savingsGoal = usePlannerStore((s) => s.savingsGoal)
  const readinessProfile = usePlannerStore((s) => s.readinessProfile)
  const debts = usePlannerStore((s) => s.debts)

  const dual = useMemo(() => {
    if (!partner.enabled) return null
    const input = {
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
      debts,
    }
    const a = scoreHouseholdMember(input, partner, 'primary')
    const b = scoreHouseholdMember(input, partner, 'partner')
    return computeDualHouseholdScore(
      { label: 'You', result: a },
      { label: partner.label.trim() || 'Partner', result: b },
    )
  }, [
    partner,
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    debts,
  ])

  return (
    <section className="card-chrome card-hairline-top p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="HOUSEHOLD"
        title="Dual readiness"
        caption="Two canon score runs, one household answer — the joint score follows the weaker member, never an average that hides a hard-stop."
        right={<Users size={18} className="text-cyan" />}
      />

      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
        <div>
          <p className="text-[13px] font-semibold text-light">
            {partner.enabled ? 'Partner scoring is on' : 'Fly solo or score together?'}
          </p>
          <p className="mt-0.5 text-[12px] text-dim">
            Align with your partner on one number — a shared max housing payment
            or runway target beats a full budget debate.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={partner.enabled}
          onClick={() => setHouseholdPartner({ enabled: !partner.enabled })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            partner.enabled ? 'bg-cyan' : 'bg-white/[0.1]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-navy transition-transform ${
              partner.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {partner.enabled && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PlanTile
              label="YOUR SCORE"
              value={String(dual?.memberA.score ?? 0)}
              hint="Canon engine · live numbers"
            />
            <PlanTile
              label={`${(partner.label.trim() || 'Partner').toUpperCase()} SCORE`}
              value={String(dual?.memberB.score ?? 0)}
              hint={`Income share ${Math.round((partner.incomeShare || 0.5) * 100)}%`}
            />
            <PlanTile
              label="JOINT (MIN)"
              value={String(dual?.jointScore ?? 0)}
              tone={dual && dual.jointHardStops.length > 0 ? 'crimson' : 'cyan'}
              hint="Weaker member leads"
            />
            <PlanTile
              label="SCORE GAP"
              value={String(dual?.scoreGap ?? 0)}
              tone={dual && dual.scoreGap >= 15 ? 'amber' : 'default'}
              hint={dual?.verdictAligned ? 'Same verdict band' : 'Verdicts differ'}
            />
          </div>

          {dual && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <VerdictChip verdict={dual.memberA.verdict} />
              <span className="text-[11px] uppercase tracking-[0.12em] text-dim">
                joint
              </span>
              <VerdictChip verdict={dual.jointVerdict} />
            </div>
          )}

          {dual && dual.jointHardStops.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {dual.jointHardStops.map((stop) => {
                const code =
                  typeof stop === "string" ? stop : stop.code
                const message =
                  typeof stop === "string"
                    ? HARD_STOP_MESSAGES[stop]
                    : stop.message || HARD_STOP_MESSAGES[stop.code]
                return (
                  <li
                    key={code}
                    className="rounded-xl border border-crimson/25 bg-crimson/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-light/90"
                  >
                    {message}
                  </li>
                )
              })}
            </ul>
          )}

          {dual && (
            <p className="mt-4 font-serif text-[15px] italic leading-snug text-light/90">
              {dual.summary}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
              <span className="text-label">PARTNER LABEL</span>
              <input
                value={partner.label}
                onChange={(e) => setHouseholdPartner({ label: e.target.value })}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-light outline-none focus:border-cyan/40"
              />
            </label>
            <NumberField
              label="CREDIT SCORE"
              value={partner.creditScore}
              onChange={(v) => setHouseholdPartner({ creditScore: Math.round(Math.min(850, Math.max(0, v))) })}
              step={10}
              min={0}
            />
            <NumberField
              label="INCOME SHARE"
              value={Math.round((partner.incomeShare || 0.5) * 100)}
              onChange={(v) => setHouseholdPartner({ incomeShare: Math.min(90, Math.max(10, v)) / 100 })}
              suffix="%"
              step={5}
              min={10}
            />
            <NumberField
              label="LIFE STABILITY (1–10)"
              value={partner.lifeStability}
              onChange={(v) => setHouseholdPartner({ lifeStability: Math.min(10, Math.max(1, v)) })}
              min={1}
            />
            <NumberField
              label="CONFIDENCE (1–10)"
              value={partner.confidenceLevel}
              onChange={(v) => setHouseholdPartner({ confidenceLevel: Math.min(10, Math.max(1, v)) })}
              min={1}
            />
            <NumberField
              label="PRESSURE / FOMO (1–10)"
              value={partner.fomoLevel}
              onChange={(v) => setHouseholdPartner({ fomoLevel: Math.min(10, Math.max(1, v)) })}
              min={1}
            />
            <NumberField
              label="HORIZON (MONTHS)"
              value={partner.timeHorizonMonths}
              onChange={(v) => setHouseholdPartner({ timeHorizonMonths: Math.max(0, Math.round(v)) })}
              step={6}
              min={0}
            />
            <NumberField
              label="PARTNER ALIGNMENT (1–10)"
              value={partner.partnerAlignment}
              onChange={(v) => setHouseholdPartner({ partnerAlignment: Math.min(10, Math.max(1, v)) })}
              min={1}
            />
          </div>
        </>
      )}

      <PlanFooter
        lines={[
          dual?.disclaimer ??
            'Household readiness is educational only. Turn partner scoring on to see the joint picture — nothing leaves this device.',
        ]}
      />
    </section>
  )
}
