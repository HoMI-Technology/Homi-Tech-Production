"use client";

import { useMemo, useState } from "react";
import { computeRothConversion } from "@/lib/tools/roth";
import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";

function RothConversionPageInner() {
  const [currentBalance, setCurrentBalance] = useState(120000);
  const [convertAmount, setConvertAmount] = useState(30000);
  const [marginalRateNow, setMarginalRateNow] = useState(22);
  const [expectedRateRetirement, setExpectedRateRetirement] = useState(24);
  const [yearsToHorizon, setYearsToHorizon] = useState(20);
  const [expectedGrowth, setExpectedGrowth] = useState(7);

  const result = useMemo(
    () =>
      computeRothConversion({
        currentBalance,
        convertAmount,
        marginalRateNowPercent: marginalRateNow,
        expectedRateRetirementPercent: expectedRateRetirement,
        yearsToHorizon,
        expectedGrowthPercent: expectedGrowth,
      }),
    [currentBalance, convertAmount, marginalRateNow, expectedRateRetirement, yearsToHorizon, expectedGrowth],
  );

  const benefitPositive = result.netEducationalBenefit >= 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Roth Conversion — Educational</h1>
      <p className="mt-2 max-w-2xl text-dim">
        A plain-language look at one trade-off: paying tax on a conversion now versus the tax you'd
        otherwise owe on that money later. This is education, not a recommendation to convert anything.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass space-y-5 p-6">
          <Field label="Current traditional balance" value={currentBalance} onChange={setCurrentBalance} min={0} max={1000000} step={5000} format="currency" />
          <Field label="Amount considering converting" value={convertAmount} onChange={setConvertAmount} min={0} max={currentBalance || 500000} step={1000} format="currency" />
          <Field label="Marginal tax rate now" value={marginalRateNow} onChange={setMarginalRateNow} min={0} max={40} step={1} format="percent" />
          <Field label="Expected tax rate at retirement" value={expectedRateRetirement} onChange={setExpectedRateRetirement} min={0} max={40} step={1} format="percent" />
          <Field label="Years to horizon" value={yearsToHorizon} onChange={setYearsToHorizon} min={1} max={40} step={1} format="years" />
          <Field label="Expected annual growth" value={expectedGrowth} onChange={setExpectedGrowth} min={0} max={12} step={0.5} format="percent" />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass p-6">
              <p className="text-sm text-dim">Tax cost today</p>
              <p className="score-numeral mt-2 text-3xl font-bold text-amber">{formatCurrency(result.taxCostToday)}</p>
              <p className="mt-1 text-xs text-dim">
                {formatCurrency(convertAmount)} converted at {marginalRateNow}%.
              </p>
            </div>
            <div className="glass p-6">
              <p className="text-sm text-dim">Tax avoided at horizon</p>
              <p className="score-numeral mt-2 text-3xl font-bold text-emerald">{formatCurrency(result.taxAvoidedAtHorizon)}</p>
              <p className="mt-1 text-xs text-dim">
                On a projected {formatCurrency(result.futureValueAtHorizon)} balance in {yearsToHorizon} years.
              </p>
            </div>
          </div>

          <div className={`glass border p-6 ${benefitPositive ? "bg-verdict-ready" : "bg-verdict-almost"}`}>
            <p className="text-sm text-dim">Net educational benefit (undiscounted)</p>
            <p className={`score-numeral mt-2 text-3xl font-bold ${benefitPositive ? "text-emerald" : "text-amber"}`}>
              {benefitPositive ? "+" : ""}
              {formatCurrency(result.netEducationalBenefit)}
            </p>
            <p className="mt-2 text-xs text-dim">
              Tax avoided later minus tax paid now, in nominal dollars — not adjusted for the time value of
              money or for paying the conversion tax out of the converted funds themselves.
            </p>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              A conversion tends to look better on paper the more your expected retirement tax rate exceeds
              your rate today — this tool assumes you pay the conversion tax from money outside the
              account, which matters a lot in practice. This is not financial, tax, or investment advice;
              it is a simplified, educational comparison of two numbers. A tax professional who knows your
              full picture is the right place to take this next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RothConversionPage() {
  return (
    <AdvancedToolGate>
      <RothConversionPageInner />
    </AdvancedToolGate>
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
