"use client";

import { useCallback, useMemo, useState } from "react";
import { computeAffordability, paymentBreakdown, type AffordabilityInputs } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { LensField } from "@/components/tools/LensField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { DeltasCard } from "@/components/tools/DeltasCard";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { getLens } from "@/lib/tools/registry";
import { computeHousingDeltas } from "@/lib/tools/deltas";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { ToolShell } from "@/components/tools/ToolShell";

const LENS = getLens("affordability")!;

const TIERS = [
  { key: "protected" as const, label: "Protected", ratio: "28%", color: "#34d399", className: "bg-verdict-ready" },
  { key: "stretch" as const, label: "Stretch", ratio: "33%", color: "#facc15", className: "bg-verdict-almost" },
  { key: "redLine" as const, label: "Red Line", ratio: "36%", color: "#ef4444", className: "bg-verdict-notyet" },
];

export default function AffordabilityPage() {
  const [income, setIncome] = useState(95000);
  const [debts, setDebts] = useState(400);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [taxInsRate, setTaxInsRate] = useState(1.5);
  const [downPayment, setDownPayment] = useState(40000);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "income") setIncome(v);
    else if (key === "debts") setDebts(v);
    else if (key === "rate") setRate(v);
    else if (key === "term") setTerm(v);
    else if (key === "taxInsRate") setTaxInsRate(v);
    else if (key === "downPayment") setDownPayment(v);
  }, []);
  const { prefilled, finance, hydrated, markAll } = useLensPrefill("affordability", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const inputs: AffordabilityInputs = {
    annualIncome: income,
    monthlyDebts: debts,
    rate,
    termYears: term,
    taxInsuranceRate: taxInsRate / 100,
    downPayment,
  };

  const result = useMemo(() => computeAffordability(inputs), [income, debts, rate, term, taxInsRate, downPayment]);
  const stretchBreakdown = useMemo(
    () => paymentBreakdown(result.stretch.maxPrice, { rate, termYears: term, taxInsuranceRate: taxInsRate / 100, downPayment }),
    [result, rate, term, taxInsRate, downPayment],
  );

  // Deterministic impact of carrying the Stretch-tier payment.
  const deltas = useMemo(() => {
    if (!finance) return null;
    return computeHousingDeltas(finance, stretchBreakdown.total);
  }, [finance, stretchBreakdown.total]);

  const maxBar = Math.max(stretchBreakdown.principalAndInterest, stretchBreakdown.taxesAndInsurance, 1);

  return (
    <ToolShell
      title="Affordability"
      description={`What you can afford is not the same as what a lender will approve you for. Here are three honest tiers of monthly housing cost, based on your income before other debts are even in the picture.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <LensField label="Gross annual income" value={income} onChange={setIncome} min={0} max={500000} step={1000} format="currency" source={sourceFor("income")} />
          <LensField label="Other monthly debts" value={debts} onChange={setDebts} min={0} max={10000} step={25} format="currency" source={sourceFor("debts")} />
          <LensField label="Interest rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" source={sourceFor("rate")} />
          <LensField label="Loan term (years)" value={term} onChange={setTerm} min={10} max={30} step={5} format="years" source={sourceFor("term")} />
          <LensField label="Taxes + insurance (% of price / yr)" value={taxInsRate} onChange={setTaxInsRate} min={0.5} max={3} step={0.1} format="percent" source={sourceFor("taxInsRate")} />
          <LensField label="Down payment" value={downPayment} onChange={setDownPayment} min={0} max={500000} step={1000} format="currency" source={sourceFor("downPayment")} />

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({
              assumedRatePct: rate,
              termYears: term,
              taxInsuranceRatePct: taxInsRate,
              downPaymentSaved: downPayment,
            })}
            onSaved={() => markAll(["rate", "term", "taxInsRate", "downPayment"])}
          />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const data = result[tier.key];
              return (
                <div key={tier.key} className={`glass border p-5 ${tier.className}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: tier.color }}>
                      {tier.label}
                    </span>
                    <span className="text-xs text-dim">{tier.ratio} of income</span>
                  </div>
                  <div className="score-numeral mt-3 text-2xl font-bold text-light">
                    {formatCurrency(data.maxPrice)}
                  </div>
                  <p className="mt-1 text-xs text-dim">max home price</p>
                  <div className="hairline my-3" />
                  <p className="text-sm text-light">{formatCurrency(data.maxMonthlyHousing)}/mo housing</p>
                </div>
              );
            })}
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Monthly payment breakdown</h2>
            <p className="mt-1 text-xs text-dim">At the Stretch tier price of {formatCurrency(result.stretch.maxPrice)}.</p>
            <div className="mt-5 space-y-4">
              <BarRow label="Principal &amp; interest" value={stretchBreakdown.principalAndInterest} max={maxBar} color="#22d3ee" />
              <BarRow label="Taxes &amp; insurance (est.)" value={stretchBreakdown.taxesAndInsurance} max={maxBar} color="#facc15" />
            </div>
            <div className="hairline my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">Total monthly</span>
              <span className="score-numeral text-xl font-bold text-light">{formatCurrency(stretchBreakdown.total)}</span>
            </div>
          </div>

          {hydrated && deltas && <DeltasCard deltas={deltas} />}

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              The Protected tier (28%) leaves the most room for the unexpected — repairs, a job change, a
              new baby. The Red Line tier (36%) is the point past which most lenders and most budgets start
              feeling the strain. Being approved for more than the Protected number does not make it the
              right number for you. Debts you listed reduce the room you have for the unexpected, even
              though this calculator does not subtract them from the housing ratio directly — a lender's
              back-end DTI will.
            </p>
          </div>

          {LENS.chains && <ChainLinks chains={LENS.chains} />}
        </div>
      </div>
    </ToolShell>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-dim" dangerouslySetInnerHTML={{ __html: label }} />
        <span className="score-numeral text-light">{formatCurrency(value)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
