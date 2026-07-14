"use client";

import { useMemo, useState } from "react";
import { compareOffers, bestOfferIndex, type LoanOffer } from "@/lib/tools/apr";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { CalcField } from "@/components/tools/CalcField";

const START: LoanOffer[] = [
  { label: "Offer A", rate: 6.25, points: 0, fees: 3000 },
  { label: "Offer B", rate: 6.0, points: 1, fees: 3500 },
  { label: "Offer C", rate: 5.75, points: 2, fees: 4000 },
];

export default function AprComparePage() {
  const [loan, setLoan] = useState(400000);
  const [termYears, setTermYears] = useState(30);
  const [offers, setOffers] = useState<LoanOffer[]>(START);

  const results = useMemo(() => compareOffers(loan, termYears, offers), [loan, termYears, offers]);
  const best = useMemo(() => bestOfferIndex(results), [results]);

  function update(i: number, patch: Partial<LoanOffer>) {
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">APR Comparison</h1>
      <p className="mt-2 max-w-2xl text-dim">
        The lowest rate isn&rsquo;t always the cheapest loan. Points and fees hide in the headline number —
        this ranks three offers by their true, cost-inclusive APR.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="glass space-y-5 p-6 lg:col-span-1">
          <CalcField label="Loan amount" value={loan} onChange={setLoan} min={50000} max={1500000} step={5000} format="currency" />
          <CalcField label="Loan term" value={termYears} onChange={setTermYears} min={10} max={30} step={5} format="years" />
          <div className="hairline" />
          {offers.map((o, i) => (
            <div key={i} className="space-y-4">
              <p className="text-sm font-semibold text-light">{o.label}</p>
              <CalcField label="Rate" value={o.rate} onChange={(v) => update(i, { rate: v })} min={3} max={10} step={0.125} format="percent" />
              <CalcField label="Points" value={o.points} onChange={(v) => update(i, { points: v })} min={0} max={4} step={0.25} format="number" suffix="pts" />
              <CalcField label="Fees" value={o.fees} onChange={(v) => update(i, { fees: v })} min={0} max={12000} step={250} format="currency" />
              {i < offers.length - 1 && <div className="hairline" />}
            </div>
          ))}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            {results.map((r, i) => (
              <div key={i} className={`glass p-5 ${i === best ? "panel-focus" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-light">{r.label}</p>
                  {i === best && <span className="chip !text-[0.6875rem] !text-emerald">Lowest APR</span>}
                </div>
                <p className="eyebrow mt-3">True APR</p>
                <p className="score-numeral text-2xl font-bold text-cyan">{formatPercent(r.apr, 3)}</p>
                <div className="mt-4 space-y-2 text-xs text-dim">
                  <div className="flex justify-between"><span>Note rate</span><span className="score-numeral text-light">{formatPercent(r.rate, 3)}</span></div>
                  <div className="flex justify-between"><span>Monthly P&amp;I</span><span className="score-numeral text-light">{formatCurrency(r.monthly)}</span></div>
                  <div className="flex justify-between"><span>Upfront cost</span><span className="score-numeral text-light">{formatCurrency(r.upfrontCost)}</span></div>
                  <div className="flex justify-between"><span>Total over term</span><span className="score-numeral text-light">{formatCurrency(r.totalCost)}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Why APR, not rate</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              A lender can advertise a low note rate and quietly charge points and fees to get there. The APR
              folds those upfront costs back into an equivalent rate, so a 5.75% loan with two points can end
              up <em>more</em> expensive than a 6.25% loan with none. Rank by the true APR (and by how long
              you&rsquo;ll actually keep the loan) — not the number on the flyer. Educational math, not a quote.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
