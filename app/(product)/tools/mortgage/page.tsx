"use client";

import { useMemo, useState } from "react";
import { fullPaymentBreakdown, amortizationSummary } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";

function MortgagePageInner() {
  const [price, setPrice] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000);
  const [rate, setRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [taxInsRate, setTaxInsRate] = useState(1.5);
  const [hoaMonthly, setHoaMonthly] = useState(0);

  const loanAmount = Math.max(0, price - downPayment);

  const breakdown = useMemo(
    () =>
      fullPaymentBreakdown(price, {
        rate,
        termYears,
        taxInsuranceRate: taxInsRate / 100,
        downPayment,
        hoaMonthly,
      }),
    [price, rate, termYears, taxInsRate, downPayment, hoaMonthly],
  );

  const amortization = useMemo(
    () => amortizationSummary(loanAmount, rate, termYears),
    [loanAmount, rate, termYears],
  );

  const maxBar = Math.max(breakdown.principalAndInterest, breakdown.taxesAndInsurance, breakdown.hoa, 1);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Mortgage Payment</h1>
      <p className="mt-2 max-w-2xl text-dim">
        The full monthly payment, broken into its real parts, plus what the loan actually costs over its
        full life — not just the headline rate.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass space-y-5 p-6">
          <Field label="Home price" value={price} onChange={setPrice} min={100000} max={1500000} step={5000} format="currency" />
          <Field label="Down payment" value={downPayment} onChange={setDownPayment} min={0} max={price} step={1000} format="currency" />
          <Field label="Interest rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" />
          <Field label="Loan term (years)" value={termYears} onChange={setTermYears} min={10} max={30} step={5} format="years" />
          <Field label="Taxes + insurance (% of price / yr)" value={taxInsRate} onChange={setTaxInsRate} min={0.5} max={3} step={0.1} format="percent" />
          <Field label="HOA (monthly)" value={hoaMonthly} onChange={setHoaMonthly} min={0} max={1500} step={25} format="currency" />
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="font-semibold text-light">Monthly payment breakdown</h2>
            <p className="mt-1 text-xs text-dim">Loan amount: {formatCurrency(loanAmount)}</p>
            <div className="mt-5 space-y-4">
              <BarRow label="Principal &amp; interest" value={breakdown.principalAndInterest} max={maxBar} color="#22d3ee" />
              <BarRow label="Taxes &amp; insurance (est.)" value={breakdown.taxesAndInsurance} max={maxBar} color="#facc15" />
              {breakdown.hoa > 0 && <BarRow label="HOA" value={breakdown.hoa} max={maxBar} color="#34d399" />}
            </div>
            <div className="hairline my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">Total monthly</span>
              <span className="score-numeral text-xl font-bold text-light">{formatCurrency(breakdown.total)}</span>
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Amortization summary</h2>
            <p className="mt-1 text-xs text-dim">Principal &amp; interest only, over the full {termYears}-year term.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-dim">Total interest paid</p>
                <p className="score-numeral mt-1 text-xl font-bold text-amber">{formatCurrency(amortization.totalInterestPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-dim">Total paid (P&amp;I)</p>
                <p className="score-numeral mt-1 text-xl font-bold text-light">{formatCurrency(amortization.totalPaid)}</p>
              </div>
            </div>
            <div className="hairline my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">Payoff date</span>
              <span className="score-numeral text-sm text-light">
                {amortization.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              The interest total above is the real cost of borrowing, not just the sticker price of the
              home — on a 30-year loan it is often close to the loan amount itself. Taxes, insurance, and
              HOA dues are estimates and will drift with your actual location and building; principal and
              interest are fixed for the life of a fixed-rate loan. None of this is a lender quote — treat
              it as the shape of the payment, not the final number.
            </p>
          </div>
        </div>
      </div>
    </div>
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
    format === "currency" ? formatCurrency(value) : format === "percent" ? `${value}%` : `${value} yrs`;

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

export default function MortgagePage() {
  return (
    <AdvancedToolGate>
      <MortgagePageInner />
    </AdvancedToolGate>
  );
}
