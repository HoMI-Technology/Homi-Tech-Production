"use client";

import { useCallback, useMemo, useState } from "react";
import { compareOffers, bestOfferIndex, type LoanOffer } from "@/lib/tools/apr";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { CalcField } from "@/components/tools/CalcField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { DeltasCard } from "@/components/tools/DeltasCard";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { SaveScenarioButton } from "@/components/tools/SaveScenarioButton";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { ReadinessBand } from "@/components/tools/ReadinessBand";
import { getLens } from "@/lib/tools/registry";
import { computeHousingDeltas } from "@/lib/tools/deltas";
import { toReadinessDigest } from "@/lib/tools/readiness-impact";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { useHousingReadinessImpact } from "@/hooks/use-housing-readiness";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell } from "@/components/tools/ToolShell";

const LENS = getLens("apr-compare")!;

const START: LoanOffer[] = [
  { label: "Offer A", rate: 6.25, points: 0, fees: 3000 },
  { label: "Offer B", rate: 6.0, points: 1, fees: 3500 },
  { label: "Offer C", rate: 5.75, points: 2, fees: 4000 },
];

function AprComparePageInner() {
  const [loan, setLoan] = useState(400000);
  const [termYears, setTermYears] = useState(30);
  const [offers, setOffers] = useState<LoanOffer[]>(START);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "loan") setLoan(v);
    else if (key === "termYears") setTermYears(v);
  }, []);
  const { prefilled, finance, hydrated, markAll } = useLensPrefill("apr-compare", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const results = useMemo(() => compareOffers(loan, termYears, offers), [loan, termYears, offers]);
  const best = useMemo(() => bestOfferIndex(results), [results]);
  const winning = results[best];

  // Deterministic impact of carrying the WINNING offer's payment — the
  // honest frame, since the winner is decided by code, not preference.
  const deltas = useMemo(() => {
    if (!finance || !winning) return null;
    return computeHousingDeltas(finance, winning.monthly);
  }, [finance, winning]);

  const readiness = useHousingReadinessImpact(
    winning
      ? { monthlyObligation: winning.monthly, upfrontCost: winning.upfrontCost }
      : null,
  );

  // The lens digest the Companion reads — every number precomputed here.
  const digest = useMemo(
    () => ({
      lensId: "apr-compare",
      path: "/tools/apr-compare",
      headline: {
        label: `Best true APR (${winning?.label ?? "—"})`,
        value: Math.round((winning?.apr ?? 0) * 1000) / 1000,
        unit: "percent" as const,
      },
      keyInputs: { loan, termYears },
      deltas,
      readiness: readiness ? toReadinessDigest(readiness) : undefined,
    }),
    [winning, loan, termYears, deltas, readiness],
  );

  function update(i: number, patch: Partial<LoanOffer>) {
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  return (
    <ToolShell
      title="APR Comparison"
      description={`The lowest rate isn't always the cheapest loan. Points and fees hide in the headline number — this ranks three offers by their true, cost-inclusive APR.`}
    >
      <SavedNumbersStrip />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="glass space-y-5 p-6 lg:col-span-1">
          <CalcField label="Loan amount" value={loan} onChange={setLoan} min={50000} max={1500000} step={5000} format="currency" source={sourceFor("loan")} />
          <CalcField label="Loan term" value={termYears} onChange={setTermYears} min={10} max={30} step={5} format="years" source={sourceFor("termYears")} />
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

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({ termYears })}
            onSaved={() => markAll(["termYears"])}
          />
          <SaveScenarioButton
            lensId="apr-compare"
            getInputs={() => ({
              loan,
              termYears,
              aRate: offers[0].rate,
              aPoints: offers[0].points,
              aFees: offers[0].fees,
              bRate: offers[1].rate,
              bPoints: offers[1].points,
              bFees: offers[1].fees,
              cRate: offers[2].rate,
              cPoints: offers[2].points,
              cFees: offers[2].fees,
            })}
          />
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

          <LensSynthesis digest={digest} />

          {hydrated && deltas && <DeltasCard deltas={deltas} lensId="apr-compare" />}
          {hydrated && readiness && <ReadinessBand impact={readiness} />}

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Why APR, not rate</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              A lender can advertise a low note rate and quietly charge points and fees to get there. The APR
              folds those upfront costs back into an equivalent rate, so a 5.75% loan with two points can end
              up <em>more</em> expensive than a 6.25% loan with none. Rank by the true APR (and by how long
              you&rsquo;ll actually keep the loan) — not the number on the flyer. Educational math, not a quote.
            </p>
          </div>

          {LENS.chains && <ChainLinks chains={LENS.chains} />}
        </div>
      </div>
    </ToolShell>
  );
}

export default function AprComparePage() {
  return (
    <AdvancedToolGate>
      <AprComparePageInner />
    </AdvancedToolGate>
  );
}
