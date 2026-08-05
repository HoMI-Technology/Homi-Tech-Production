"use client";

import { useCallback, useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { monthlyPayment } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { LensField } from "@/components/tools/LensField";
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
import { ToolShell } from "@/components/tools/ToolShell";

const LENS = getLens("rent-vs-buy")!;

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

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "rent") setRent(v);
    else if (key === "price") setPrice(v);
    else if (key === "rate") setRate(v);
  }, []);
  const { prefilled, finance, hydrated, markAll } = useLensPrefill("rent-vs-buy", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const data = useMemo(() => simulate(rent, price, rate, appreciation, years), [rent, price, rate, appreciation, years]);
  const finalYear = data[data.length - 1];
  const buyIsCheaper = finalYear ? finalYear.buyCost < finalYear.rentCost : false;

  // The monthly carrying cost of buying at these inputs — P&I + tax/ins +
  // maintenance, matching the simulate() assumptions above. Counting
  // maintenance in the obligation is deliberately conservative.
  const buyMonthly = useMemo(() => {
    const loan = price * 0.8;
    return monthlyPayment(loan, rate, 30) + (price * 0.015) / 12 + (price * 0.01) / 12;
  }, [price, rate]);

  // Buying replaces rent — the same frame the mortgage lens offers.
  const deltas = useMemo(() => {
    if (!finance) return null;
    return computeHousingDeltas(finance, buyMonthly, { replacedRentMonthly: rent });
  }, [finance, buyMonthly, rent]);

  const readiness = useHousingReadinessImpact({
    monthlyObligation: buyMonthly,
    upfrontCost: price * 0.2,
    replacedRentMonthly: rent,
  });

  // The lens digest the Companion reads — every number precomputed here.
  const digest = useMemo(
    () => ({
      lensId: "rent-vs-buy",
      path: "/tools/rent-vs-buy",
      headline: {
        label: `${years}-year net cost of buying`,
        value: Math.round(finalYear?.buyCost ?? 0),
        unit: "currency" as const,
      },
      keyInputs: { rent, price, rate, appreciation, years },
      deltas,
      readiness: readiness ? toReadinessDigest(readiness) : undefined,
    }),
    [years, finalYear?.buyCost, rent, price, rate, appreciation, deltas, readiness],
  );

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
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <LensField label="Monthly rent" value={rent} onChange={setRent} min={500} max={8000} step={50} format="currency" source={sourceFor("rent")} />
          <LensField label="Home price" value={price} onChange={setPrice} min={100000} max={1500000} step={5000} format="currency" source={sourceFor("price")} />
          <LensField label="Mortgage rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" source={sourceFor("rate")} />
          <LensField label="Annual appreciation" value={appreciation} onChange={setAppreciation} min={-2} max={8} step={0.5} format="percent" />
          <LensField label="Time horizon (years)" value={years} onChange={setYears} min={1} max={10} step={1} format="years" />

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({ currentRent: rent, targetPrice: price, assumedRatePct: rate })}
            onSaved={() => markAll(["rent", "price", "rate"])}
          />
          <SaveScenarioButton
            lensId="rent-vs-buy"
            getInputs={() => ({ rent, price, rate, appreciation, years })}
          />
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="font-semibold text-light">Cumulative cost over {years} years</h2>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="Rent vs buy cumulative cost chart">
              <polyline points={rentPoints} fill="none" stroke={COLORS.yellow} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={buyPoints} fill="none" stroke={COLORS.cyan} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-3 flex gap-6 text-xs text-dim">
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-yellow" /> Renting (cumulative)</span>
              <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-cyan" /> Buying (net of equity)</span>
            </div>
          </div>

          <LensSynthesis digest={digest} />

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

          {hydrated && deltas && <DeltasCard deltas={deltas} lensId="rent-vs-buy" />}
          {hydrated && readiness && <ReadinessBand impact={readiness} />}

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

          {LENS.chains && <ChainLinks chains={LENS.chains} carryValues={{ price }} />}
        </div>
      </div>
    </ToolShell>
  );
}
