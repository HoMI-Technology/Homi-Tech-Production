"use client";

import { useEffect, useMemo, useState } from "react";
import { computeAffordability, paymentBreakdown, type AffordabilityInputs } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { getToolPrefill } from "@/lib/tools/prefill";
import { ToolShell } from "@/components/tools/ToolShell";

const TIERS = [
  { key: "protected" as const, label: "Protected", ratio: "28%", color: "#34d399", className: "bg-verdict-ready" },
  { key: "stretch" as const, label: "Stretch", ratio: "33%", color: "#facc15", className: "bg-verdict-almost" },
  { key: "redLine" as const, label: "Red Line", ratio: "36%", color: "#f24822", className: "bg-verdict-notyet" },
];

export default function AffordabilityPage() {
  const [income, setIncome] = useState(95000);
  const [debts, setDebts] = useState(400);

  // Companion hand-off: seed with the user's saved numbers on mount only.
  useEffect(() => {
    const prefill = getToolPrefill();
    if (!prefill) return;
    setIncome(prefill.annualIncome);
    setDebts(prefill.monthlyDebtPayments);
    setDownPayment(prefill.liquidSavings);
  }, []);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [taxInsRate, setTaxInsRate] = useState(1.5);
  const [downPayment, setDownPayment] = useState(40000);

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

  const maxBar = Math.max(stretchBreakdown.principalAndInterest, stretchBreakdown.taxesAndInsurance, 1);

  return (
    <ToolShell
      title="Affordability"
      description={`What you can afford is not the same as what a lender will approve you for. Here are three honest tiers of monthly housing cost, based on your income before other debts are even in the picture.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <Field label="Gross annual income" value={income} onChange={setIncome} min={0} max={500000} step={1000} format="currency" />
          <Field label="Other monthly debts" value={debts} onChange={setDebts} min={0} max={10000} step={25} format="currency" />
          <Field label="Interest rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" />
          <Field label="Loan term (years)" value={term} onChange={setTerm} min={10} max={30} step={5} format="years" />
          <Field label="Taxes + insurance (% of price / yr)" value={taxInsRate} onChange={setTaxInsRate} min={0.5} max={3} step={0.1} format="percent" />
          <Field label="Down payment" value={downPayment} onChange={setDownPayment} min={0} max={500000} step={1000} format="currency" />
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
        </div>
      </div>
    </ToolShell>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years";
}) {
  const fill = sliderFillPercent(value, min, max);
  const display =
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${value}%`
        : `${value} yrs`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-light">{label}</label>
        <span className="score-numeral text-sm text-cyan">{display}</span>
      </div>
      <input
        type="range"
        className="homi-slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
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
