"use client";

import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { computeHousingLens } from '@/lib/planner/housing'
import type { HousingLensResult } from '@/lib/planner/housing'
import { financialReality } from '@/lib/planner/derived'
import { formatCurrency } from '@/lib/tools/format'
import { usePlannerStore } from "@/lib/planner/store"
import { NumberField } from "@/components/planner/ui/NumberField"
import { PlanFooter, PlanSectionHeader, PlanTile } from './ui'

/* ------------------------------------------------------------------ */
/* Housing sub-tab — rent-vs-buy lens (spec §7).                       */
/*                                                                     */
/* Engine: lib/planner/housing.ts computeHousingLens (CFM-backed PITI  */
/* via lib/planner/cfm.ts estimateHousingPayment — imported, never     */
/* re-implemented). Income / cash flow / liquid savings come from the  */
/* live ledger; home inputs are the demo lens defaults (the §7         */
/* screenshot case) the user can edit. Appreciation 3% / opportunity   */
/* cost 6% / 5-year horizon are engine defaults — labeled below.       */
/* ------------------------------------------------------------------ */

const VERDICT_CHIP: Record<
  HousingLensResult['verdict'],
  { label: string; className: string }
> = {
  blocked: {
    label: 'BLOCKED',
    className: 'border-crimson/30 bg-crimson/10 text-crimson',
  },
  buy_stretch: {
    label: 'STRETCH',
    className: 'border-amber/30 bg-amber/10 text-amber',
  },
  rent_clearer: {
    label: 'RENT CLEARER',
    className: 'border-cyan/30 bg-cyan/10 text-cyan',
  },
  buy_competitive: {
    label: 'BUY COMPETITIVE',
    className: 'border-emerald/30 bg-emerald/10 text-emerald',
  },
}

function signedMoney(n: number): string {
  const abs = formatCurrency(Math.abs(n))
  return n > 0 ? `+${abs}` : n < 0 ? `-${abs}` : abs
}

export default function PlanHousing() {
  const transactions = usePlannerStore((s) => s.transactions)
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)

  // Demo lens defaults — the §7 screenshot case.
  const [targetPrice, setTargetPrice] = useState(425000)
  const [downPayment, setDownPayment] = useState(38000)
  const [ratePct, setRatePct] = useState(6.5)
  const [currentRent, setCurrentRent] = useState(1850)
  const [hoaMonthly, setHoaMonthly] = useState(45)
  const [termYears, setTermYears] = useState(30)
  const [taxInsuranceRatePct, setTaxInsuranceRatePct] = useState(1.35)

  const lens = useMemo(() => {
    const reality = financialReality(transactions, accounts, bills)
    return computeHousingLens({
      targetPrice,
      downPaymentSaved: downPayment,
      ratePct,
      termYears,
      taxInsuranceRatePct,
      hoaMonthly,
      currentRent,
      monthlyIncome: reality.income,
      liquidSavings: reality.liquidCash,
      netCashFlow: reality.cashFlow,
    })
  }, [
    transactions,
    accounts,
    bills,
    targetPrice,
    downPayment,
    ratePct,
    termYears,
    taxInsuranceRatePct,
    hoaMonthly,
    currentRent,
  ])

  const chip = VERDICT_CHIP[lens.verdict]

  return (
    <section className="card-chrome card-hairline-top p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="HOUSING LENS"
        title="Rent vs buy"
        caption="CFM-backed monthly and 5-year view. Magnitude only — not a buy recommendation."
        right={
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${chip.className}`}
          >
            {chip.label}
          </span>
        }
      />

      <p className="mt-3 font-serif text-[16px] italic leading-snug text-light/90">
        {lens.headline}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PlanTile label="BUY / MO" value={formatCurrency(lens.monthlyHousing)} tone="cyan" />
        <PlanTile label="RENT / MO" value={formatCurrency(lens.rentMonthly)} />
        <PlanTile
          label="MONTHLY DELTA"
          value={signedMoney(lens.monthlyDelta)}
          tone={lens.monthlyDelta > 0 ? 'amber' : 'emerald'}
        />
        <PlanTile
          label="HOUSING RATIO"
          value={`${Math.round(lens.housingRatioPct)}%`}
          tone={
            lens.housingRatioPct > 45
              ? 'crimson'
              : lens.housingRatioPct > 36
                ? 'amber'
                : 'emerald'
          }
        />
        <PlanTile label="5-YR BUY CASH" value={formatCurrency(lens.fiveYearBuy)} />
        <PlanTile label="5-YR RENT CASH" value={formatCurrency(lens.fiveYearRent)} />
        <PlanTile
          label="EST. EQUITY @ 5Y"
          value={formatCurrency(lens.equityAtHorizon)}
          tone="emerald"
        />
        <PlanTile
          label="RUNWAY HIT"
          value={
            lens.runwayHitMonths != null ? `~${lens.runwayHitMonths} mo` : 'None'
          }
          hint={
            lens.runwayHitMonths != null
              ? 'Liquid savings absorbing the buy premium'
              : 'Buy premium does not drain savings'
          }
        />
      </div>

      <p className="mt-4 text-[13px] text-dim">
        Rough cash/equity break-even ~{' '}
        <span className="font-display font-semibold text-light">
          {lens.breakEvenYears != null ? lens.breakEvenYears : '30+'} years
        </span>
        {' · '}gap to 20% down{' '}
        <span
          className={`font-display font-semibold ${lens.downPaymentGap > 0 ? 'text-amber' : 'text-emerald'}`}
        >
          {formatCurrency(lens.downPaymentGap)}
        </span>
      </p>

      {lens.notes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {lens.notes.map((note) => (
            <li
              key={note}
              className="flex items-start gap-2.5 rounded-xl border border-amber/20 bg-amber/[0.05] px-3.5 py-2.5 text-[12px] leading-relaxed text-light/90"
            >
              <Scale size={13} className="mt-0.5 shrink-0 text-amber" />
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <NumberField label="TARGET PRICE" prefix="$" value={targetPrice} onChange={setTargetPrice} step={5000} min={0} />
        <NumberField label="DOWN PAYMENT" prefix="$" value={downPayment} onChange={setDownPayment} step={1000} min={0} />
        <NumberField label="RATE %" suffix="%" value={ratePct} onChange={setRatePct} step={0.125} min={0} />
        <NumberField label="CURRENT RENT" prefix="$" value={currentRent} onChange={setCurrentRent} step={50} min={0} />
        <NumberField label="HOA / MO" prefix="$" value={hoaMonthly} onChange={setHoaMonthly} step={5} min={0} />
        <NumberField label="TERM YEARS" suffix="yr" value={termYears} onChange={setTermYears} step={5} min={1} />
        <NumberField label="TAX+INS % / YR" suffix="%" value={taxInsuranceRatePct} onChange={setTaxInsuranceRatePct} step={0.05} min={0} />
      </div>

      <PlanFooter
        lines={[
          'Income, cash flow, and liquid savings come from your live ledger. Home inputs are demo defaults — edit them to match your target.',
          'Assumptions: 3%/yr appreciation, 6%/yr opportunity cost on the down payment, 5-year horizon. Educational estimates only — not financial advice.',
        ]}
      />
    </section>
  )
}
