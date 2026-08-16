import { useMemo, useState } from 'react'
import { computeAffordability } from '@/lib/tools/mortgage'
import { bestOfferIndex, compareOffers } from '@/lib/tools/apr'
import { analyzeRefinance } from '@/lib/tools/refinance'
import { helocTiers } from '@/lib/tools/heloc'
import { comparePrograms } from '@/lib/tools/loanprograms'
import { formatCompactCurrency, formatCurrency, formatMonths, formatPercent } from '@/lib/tools/format'
import { InputGrid, NumberField, ResultChip, Stat, StatGrid, ToolPanel } from '@/components/tools/ui'
import { TIER_HEX } from '@/components/tools/registry'
import type { LedgerSeeds } from '@/components/tools/seeds'

/* ------------------------------------------------------------------ */
/* Affordability — canon PITI tiers: Protected / Stretch / Red Line    */
/* ------------------------------------------------------------------ */

export function AffordabilityPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [annualIncome, setAnnualIncome] = useState(seeds.annualIncome > 0 ? seeds.annualIncome : 95000)
  const [monthlyDebts, setMonthlyDebts] = useState(seeds.monthlyDebts)
  const [rate, setRate] = useState(6.5)
  const [termYears, setTermYears] = useState(30)
  const [taxInsPct, setTaxInsPct] = useState(1.5)
  const [downPayment, setDownPayment] = useState(seeds.downPaymentSaved ?? 40000)

  const result = useMemo(
    () =>
      computeAffordability({
        annualIncome,
        monthlyDebts,
        rate,
        termYears,
        taxInsuranceRate: taxInsPct / 100,
        downPayment,
      }),
    [annualIncome, monthlyDebts, rate, termYears, taxInsPct, downPayment],
  )

  const tiers = [
    { tier: result.protected, color: TIER_HEX.protected },
    { tier: result.stretch, color: TIER_HEX.stretch },
    { tier: result.redLine, color: TIER_HEX.redLine },
  ]

  return (
    <ToolPanel desc={desc} seeded lender>
      <InputGrid>
        <NumberField label="Gross annual income" value={annualIncome} onChange={setAnnualIncome} prefix="$" step={1000} min={0} />
        <NumberField label="Other monthly debts" value={monthlyDebts} onChange={setMonthlyDebts} prefix="$" step={25} min={0} />
        <NumberField label="Interest rate" value={rate} onChange={setRate} suffix="%" step={0.125} min={0} />
        <NumberField label="Loan term (years)" value={termYears} onChange={setTermYears} step={5} min={1} />
        <NumberField label="Taxes + insurance (% / yr)" value={taxInsPct} onChange={setTaxInsPct} suffix="%" step={0.1} min={0} />
        <NumberField label="Down payment" value={downPayment} onChange={setDownPayment} prefix="$" step={1000} min={0} />
      </InputGrid>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {tiers.map(({ tier, color }) => (
          <div key={tier.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <ResultChip label={tier.label} color={color} />
            <p className="mt-3 font-display text-[22px] font-semibold tracking-[-0.01em] text-light">
              {formatCompactCurrency(tier.maxPrice, { minDecimals: 1 })}
            </p>
            <p className="mt-1 text-[11px] text-dim">
              max home price · {formatPercent(tier.ratio * 100, 0)} of gross income
            </p>
            <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-2.5">
              <p className="flex items-baseline justify-between text-[11px] text-dim">
                Monthly PITI
                <span className="font-display text-[12px] font-medium text-light">{formatCurrency(tier.maxMonthlyHousing)}</span>
              </p>
              <p className="flex items-baseline justify-between text-[11px] text-dim">
                Loan amount
                <span className="font-display text-[12px] font-medium text-light">{formatCurrency(tier.loanAmount)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        Protected keeps housing under 28% of gross income; Stretch reaches 33%; past the 36% Red Line one bad
        month becomes a crisis. Which tier a price lands in is the honest answer — not what a lender will approve.
      </p>
    </ToolPanel>
  )
}

/* ------------------------------------------------------------------ */
/* APR Comparison — cost-inclusive APR ranking                         */
/* ------------------------------------------------------------------ */

type OfferDraft = { label: string; rate: number; points: number; fees: number }

const DEFAULT_OFFERS: OfferDraft[] = [
  { label: 'Offer A', rate: 6.5, points: 0, fees: 1500 },
  { label: 'Offer B', rate: 6.25, points: 1, fees: 2500 },
  { label: 'Offer C', rate: 6.75, points: 0, fees: 500 },
]

export function AprPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  void seeds
  const [loan, setLoan] = useState(400000)
  const [termYears, setTermYears] = useState(30)
  const [offers, setOffers] = useState<OfferDraft[]>(DEFAULT_OFFERS)

  const results = useMemo(() => compareOffers(loan, termYears, offers), [loan, termYears, offers])
  const best = results.length > 0 ? bestOfferIndex(results) : -1

  const patchOffer = (i: number, patch: Partial<OfferDraft>) =>
    setOffers((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  return (
    <ToolPanel desc={desc} lender>
      <InputGrid>
        <NumberField label="Loan amount" value={loan} onChange={setLoan} prefix="$" step={5000} min={0} />
        <NumberField label="Loan term (years)" value={termYears} onChange={setTermYears} step={5} min={1} />
      </InputGrid>

      <div className="mt-5 space-y-3">
        {offers.map((o, i) => {
          const r = results[i]
          const isBest = i === best
          return (
            <div
              key={o.label}
              className="rounded-xl border p-4"
              style={{
                borderColor: isBest ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.06)',
                backgroundColor: isBest ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-label !text-light">{o.label}</span>
                {isBest && <ResultChip label="Lowest true cost" color="#22d3ee" />}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <NumberField label="Note rate" value={o.rate} onChange={(v) => patchOffer(i, { rate: v })} suffix="%" step={0.125} min={0} />
                <NumberField label="Points" value={o.points} onChange={(v) => patchOffer(i, { points: v })} step={0.125} min={0} />
                <NumberField label="Fees" value={o.fees} onChange={(v) => patchOffer(i, { fees: v })} prefix="$" step={100} min={0} />
              </div>
              {r && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5 sm:grid-cols-4">
                  <p className="text-[11px] text-dim">
                    Monthly <span className="block font-display text-[13px] font-medium text-light">{formatCurrency(r.monthly, { decimals: 2 })}</span>
                  </p>
                  <p className="text-[11px] text-dim">
                    Upfront cost <span className="block font-display text-[13px] font-medium text-light">{formatCurrency(r.upfrontCost)}</span>
                  </p>
                  <p className="text-[11px] text-dim">
                    True APR{' '}
                    <span className="block font-display text-[13px] font-semibold" style={{ color: isBest ? '#22d3ee' : '#e2e8f0' }}>
                      {formatPercent(r.apr, 3)}
                    </span>
                  </p>
                  <p className="text-[11px] text-dim">
                    Total cost <span className="block font-display text-[13px] font-medium text-light">{formatCurrency(r.totalCost)}</span>
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        The note rate hides points and fees; the APR spreads them across the loan life. The lowest APR is the
        honest winner — not the lowest headline rate.
      </p>
    </ToolPanel>
  )
}

/* ------------------------------------------------------------------ */
/* Refinance Break-Even                                                */
/* ------------------------------------------------------------------ */

export function RefinancePanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  void seeds
  const [balance, setBalance] = useState(320000)
  const [currentRate, setCurrentRate] = useState(7.5)
  const [currentTermYears, setCurrentTermYears] = useState(25)
  const [newRate, setNewRate] = useState(6.0)
  const [newTermYears, setNewTermYears] = useState(30)
  const [closingCosts, setClosingCosts] = useState(6000)

  const r = useMemo(
    () => analyzeRefinance({ balance, currentRate, currentTermYears, newRate, newTermYears, closingCosts }),
    [balance, currentRate, currentTermYears, newRate, newTermYears, closingCosts],
  )

  const chip =
    r.breakEvenMonths !== null
      ? { label: `Break-even: ${formatMonths(r.breakEvenMonths)}`, color: TIER_HEX.p90 }
      : { label: 'No monthly savings', color: TIER_HEX.redLine }

  return (
    <ToolPanel desc={desc} lender>
      <InputGrid>
        <NumberField label="Loan balance" value={balance} onChange={setBalance} prefix="$" step={5000} min={0} />
        <NumberField label="Current rate" value={currentRate} onChange={setCurrentRate} suffix="%" step={0.125} min={0} />
        <NumberField label="Years left (current)" value={currentTermYears} onChange={setCurrentTermYears} step={1} min={1} />
        <NumberField label="New rate" value={newRate} onChange={setNewRate} suffix="%" step={0.125} min={0} />
        <NumberField label="New term (years)" value={newTermYears} onChange={setNewTermYears} step={5} min={1} />
        <NumberField label="Closing costs" value={closingCosts} onChange={setClosingCosts} prefix="$" step={250} min={0} />
      </InputGrid>

      <div className="mt-5">
        <ResultChip label={chip.label} color={chip.color} />
      </div>
      <StatGrid>
        <Stat label="Current payment" value={formatCurrency(r.currentMonthly, { decimals: 2 })} />
        <Stat label="New payment" value={formatCurrency(r.newMonthly, { decimals: 2 })} />
        <Stat
          label="Monthly savings"
          value={formatCurrency(Math.abs(r.monthlySavings), { decimals: 2 })}
          accent={r.monthlySavings > 0 ? TIER_HEX.p90 : TIER_HEX.redLine}
        />
        <Stat
          label="Break-even"
          value={r.breakEvenMonths !== null ? formatMonths(r.breakEvenMonths) : 'never'}
          hint={r.breakEvenMonths !== null ? 'Months until payment savings repay closing costs' : 'The new loan costs more every month'}
        />
        <Stat label="Lifetime interest (current)" value={formatCurrency(r.currentLifetimeInterest)} />
        <Stat
          label="Lifetime interest saved"
          value={formatCurrency(r.lifetimeInterestDelta)}
          accent={r.lifetimeInterestDelta > 0 ? TIER_HEX.p90 : TIER_HEX.redLine}
          hint="After closing costs; negative means the refi costs more over the full life"
        />
      </StatGrid>
    </ToolPanel>
  )
}

/* ------------------------------------------------------------------ */
/* Home Equity Line — CLTV tier availability                           */
/* ------------------------------------------------------------------ */

export function HelocPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  void seeds
  const [homeValue, setHomeValue] = useState(500000)
  const [mortgageBalance, setMortgageBalance] = useState(280000)
  const [rate, setRate] = useState(8.5)

  const tiers = useMemo(() => helocTiers(homeValue, mortgageBalance, rate), [homeValue, mortgageBalance, rate])
  const mid = tiers[1]?.result

  return (
    <ToolPanel desc={desc} lender>
      <InputGrid>
        <NumberField label="Home value" value={homeValue} onChange={setHomeValue} prefix="$" step={5000} min={0} />
        <NumberField label="Mortgage balance" value={mortgageBalance} onChange={setMortgageBalance} prefix="$" step={5000} min={0} />
        <NumberField label="Line rate (variable)" value={rate} onChange={setRate} suffix="%" step={0.125} min={0} />
      </InputGrid>

      {mid && (
        <div className="mt-5">
          <ResultChip label={`${formatPercent(mid.equityPct * 100, 0)} equity today`} color={TIER_HEX.p90} />
        </div>
      )}
      <StatGrid>
        <Stat label="Current equity" value={formatCurrency(mid?.equity ?? 0)} hint="Value minus balance — paper equity, not borrowable" />
        <Stat label="Current CLTV" value={formatPercent((mid?.currentCltv ?? 0) * 100, 1)} />
        <Stat label="Available at 85% CLTV" value={formatCurrency(mid?.availableLine ?? 0)} accent="#22d3ee" />
      </StatGrid>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-label px-4 py-2.5">CLTV cap</th>
              <th className="text-label px-4 py-2.5">Available line</th>
              <th className="text-label px-4 py-2.5">Interest-only / mo</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(({ cltv, result }) => (
              <tr key={cltv} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-2.5 font-display text-[13px] font-medium text-light">{formatPercent(cltv * 100, 0)}</td>
                <td className="px-4 py-2.5 font-display text-[13px] font-medium text-light">{formatCurrency(result.availableLine)}</td>
                <td className="px-4 py-2.5 font-display text-[13px] font-medium text-dim">{formatCurrency(result.interestOnlyMonthly, { decimals: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        Lenders cap combined loan-to-value, so the borrowable line is value × cap − balance — always less than
        paper equity. HELOC rates are typically variable; the interest-only figure assumes the full line is drawn.
      </p>
    </ToolPanel>
  )
}

/* ------------------------------------------------------------------ */
/* Loan Programs — Conventional vs FHA vs VA                           */
/* ------------------------------------------------------------------ */

export function LoanProgramsPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [homePrice, setHomePrice] = useState(400000)
  const [downPayment, setDownPayment] = useState(seeds.downPaymentSaved ?? 80000)
  const [rate, setRate] = useState(6.5)
  const [termYears, setTermYears] = useState(30)

  const results = useMemo(
    () => comparePrograms({ homePrice, downPayment, rate, termYears, firstTimeUse: true }),
    [homePrice, downPayment, rate, termYears],
  )
  const cheapest = results.reduce((best, r, i) => (r.monthlyTotal < results[best].monthlyTotal ? i : best), 0)

  return (
    <ToolPanel desc={desc} seeded lender>
      <InputGrid>
        <NumberField label="Home price" value={homePrice} onChange={setHomePrice} prefix="$" step={5000} min={0} />
        <NumberField label="Down payment" value={downPayment} onChange={setDownPayment} prefix="$" step={1000} min={0} />
        <NumberField label="Interest rate" value={rate} onChange={setRate} suffix="%" step={0.125} min={0} />
        <NumberField label="Loan term (years)" value={termYears} onChange={setTermYears} step={5} min={1} />
      </InputGrid>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {results.map((r, i) => (
          <div
            key={r.program}
            className="rounded-xl border p-4"
            style={{
              borderColor: i === cheapest ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.06)',
              backgroundColor: i === cheapest ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-label !text-light">{r.label}</span>
              {i === cheapest && <ResultChip label="Lowest monthly" color={TIER_HEX.p90} />}
            </div>
            <p className="mt-3 font-display text-[22px] font-semibold tracking-[-0.01em] text-light">
              {formatCurrency(r.monthlyTotal, { decimals: 2 })}
              <span className="ml-1 text-[11px] font-normal text-dim">/mo</span>
            </p>
            <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-2.5">
              <p className="flex items-baseline justify-between text-[11px] text-dim">
                Loan amount
                <span className="font-display text-[12px] font-medium text-light">{formatCurrency(r.loanAmount)}</span>
              </p>
              <p className="flex items-baseline justify-between text-[11px] text-dim">
                Financed upfront fee
                <span className="font-display text-[12px] font-medium text-light">{formatCurrency(r.upfrontFeeFinanced)}</span>
              </p>
              <p className="flex items-baseline justify-between text-[11px] text-dim">
                Monthly insurance
                <span className="font-display text-[12px] font-medium text-light">
                  {r.monthlyInsurance > 0 ? formatCurrency(r.monthlyInsurance, { decimals: 2 }) : 'none'}
                </span>
              </p>
            </div>
            <p className="mt-2.5 text-[11px] leading-snug text-dim">{r.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        Each program fits the typical profile for a different buyer: conventional rewards strong credit and
        20% down, FHA lowers the barrier to entry, and VA serves eligible service members and veterans.
        Standard 2026 program rules, shown for education.
      </p>
    </ToolPanel>
  )
}

