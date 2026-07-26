"use client";

import { useMemo, useState } from "react";
import { monthlyPayment } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { ToolShell } from "@/components/tools/ToolShell";

interface YearCost {
  year: number;
  rentCost: number;
  buyCost: number;
}

function simulate(rent: number, price: number, rate: number, appreciation: number, years: number): YearCost[] {
  const downPayment = price * 0.2;
  const loan = price - downPayment;
  const monthlyPI = monthlyPayment(loan, rate, 30);
  const monthlyTaxIns = (price * 0.015) / 12;
  const monthlyMaintenance = (price * 0.01) / 12;

  const results: YearCost[] = [];
  let cumulativeRent = 0;
  let cumulativeBuy = downPayment; // upfront cost counted immediately
  let currentRent = rent;
  let homeValue = price;

  for (let y = 1; y <= years; y++) {
    cumulativeRent += currentRent * 12;
    cumulativeBuy += (monthlyPI + monthlyTaxIns + monthlyMaintenance) * 12;
    currentRent *= 1.03; // assume 3% annual rent growth
    homeValue *= 1 + appreciation / 100;

    // Net buy cost accounts for equity gained via appreciation (rough, ignores principal paydown for simplicity of the "what if I sold" framing)
    const equityGain = homeValue - price;
    const netBuyCost = cumulativeBuy - equityGain;

    results.push({ year: y, rentCost: cumulativeRent, buyCost: netBuyCost });
  }

  return results;
}

export default function RentVsBuyPage() {
  const [rent, setRent] = useState(2200);
  const [price, setPrice] = useState(400000);
  const [rate, setRate] = useState(6.5);
  const [appreciation, setAppreciation] = useState(3.5);
  const [years, setYears] = useState(5);

  const data = useMemo(() => simulate(rent, price, rate, appreciation, years), [rent, price, rate, appreciation, years]);
  const finalYear = data[data.length - 1];
  const buyIsCheaper = finalYear ? finalYear.buyCost < finalYear.rentCost : false;

  const width = 640;
  const height = 260;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxVal = Math.max(...data.map((d) => Math.max(d.rentCost, d.buyCost)), 1);

  const scaleX = (year: number) => padding + (year / years) * chartWidth;
  const scaleY = (v: number) => padding + chartHeight - (Math.max(0, v) / maxVal) * chartHeight;

  const rentPoints = [`${scaleX(0)},${scaleY(0)}`, ...data.map((d) => `${scaleX(d.year)},${scaleY(d.rentCost)}`)].join(" ");
  const buyPoints = [`${scaleX(0)},${scaleY(0)}`, ...data.map((d) => `${scaleX(d.year)},${scaleY(d.buyCost)}`)].join(" ");

  return (
    <ToolShell
      title="Rent vs. Buy"
      description={`A cumulative cost comparison over your time horizon. Read this as one honest input among many — the real answer depends on timing, not just math.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <Field label="Monthly rent" value={rent} onChange={setRent} min={500} max={8000} step={50} format="currency" />
          <Field label="Home price" value={price} onChange={setPrice} min={100000} max={1500000} step={5000} format="currency" />
          <Field label="Mortgage rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" />
          <Field label="Annual appreciation" value={appreciation} onChange={setAppreciation} min={-2} max={8} step={0.5} format="percent" />
          <Field label="Time horizon (years)" value={years} onChange={setYears} min={1} max={10} step={1} format="years" />
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="font-semibold text-light">Cumulative cost over {years} years</h2>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="Rent vs buy cumulative cost chart">
              <polyline points={rentPoints} fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={buyPoints} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-3 flex gap-6 text-xs text-dim">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-yellow" /> Renting (cumulative)</span>
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-cyan" /> Buying (net of equity)</span>
            </div>
          </div>

          {finalYear && (
            <div className="glass p-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-dim">Renting, {years}yr total</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-yellow">{formatCurrency(finalYear.rentCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-dim">Buying, {years}yr net cost</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-cyan">{formatCurrency(finalYear.buyCost)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              At this horizon, {buyIsCheaper ? "buying" : "renting"} looks cheaper on paper — but this
              assumes steady appreciation and ignores the risk of needing to sell in a down market, closing
              costs, and how a mortgage changes your flexibility to move. The answer depends on timing, not
              just math: how long you'll actually stay, and how much certainty you need, matter as much as
              the numbers above.
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
