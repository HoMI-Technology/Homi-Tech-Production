"use client";

/**
 * Pass-1 tool panels — designed for local SPA instrument language.
 * Math: pure modules in lib/tools + computeHousingLens (no formula fork).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { computeRunwayMonths, formatRunwayMonths } from "@/lib/tools/runway";
import { computeDownPaymentPlan } from "@/lib/tools/downpayment";
import { estimateClosingCosts } from "@/lib/tools/closingcost";
import { computeHousingLens } from "@/lib/planner/housing";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import {
  InputGrid,
  NumberField,
  ResultChip,
  Stat,
  StatGrid,
  ToolPanel,
} from "@/components/tools/panel-ui";
import { TIER_HEX } from "@/components/tools/panel-registry";
import type { LedgerSeeds } from "@/components/tools/seeds";

function runwayTone(months: number): string {
  if (!Number.isFinite(months)) return TIER_HEX.protected;
  if (months >= 6) return TIER_HEX.protected;
  if (months >= 3) return TIER_HEX.stretch;
  if (months >= 1) return TIER_HEX.snowball;
  return TIER_HEX.redLine;
}

function runwayLabel(months: number): string {
  if (!Number.isFinite(months)) return "Open runway";
  if (months >= 6) return "Healthy buffer";
  if (months >= 3) return "Watch";
  if (months >= 1) return "Tight";
  return "Critical";
}

export function RunwayPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [liquid, setLiquid] = useState(
    seeds.liquidSavings > 0 ? Math.round(seeds.liquidSavings) : 0,
  );
  const [outflow, setOutflow] = useState(
    seeds.monthlyOutflow > 0 ? Math.round(seeds.monthlyOutflow) : 0,
  );

  const months = useMemo(() => computeRunwayMonths(liquid, outflow), [liquid, outflow]);
  const tone = runwayTone(months);

  return (
    <ToolPanel desc={desc} seeded={seeds.liquidSavings > 0 || seeds.monthlyOutflow > 0}>
      <InputGrid>
        <NumberField
          label="Liquid cash"
          value={liquid}
          onChange={setLiquid}
          prefix="$"
          step={500}
          min={0}
        />
        <NumberField
          label="Essential monthly outflow"
          value={outflow}
          onChange={setOutflow}
          prefix="$"
          step={50}
          min={0}
        />
      </InputGrid>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <ResultChip label={runwayLabel(months)} color={tone} />
          <p className="mt-3 score-numeral text-4xl font-bold tracking-[-0.03em] tnum text-light">
            {formatRunwayMonths(months)}
          </p>
          <p className="mt-1 text-xs text-dim">liquid cash ÷ essential monthly outflow</p>
        </div>
        <StatGrid>
          <Stat label="Liquid" value={formatCurrency(liquid)} />
          <Stat label="Outflow / mo" value={formatCurrency(outflow)} />
        </StatGrid>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-dim">
        Six months is a common protective buffer for housing decisions. Under one month is a
        hard-stop signal in HōMI readiness math. This lens does not approve or deny credit.
      </p>
    </ToolPanel>
  );
}

export function DownPaymentPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [price, setPrice] = useState(0);
  const [percent, setPercent] = useState(20);
  const [saved, setSaved] = useState(
    seeds.downPaymentSaved !== undefined ? Math.round(seeds.downPaymentSaved) : 18000,
  );
  const [monthly, setMonthly] = useState(0);

  const plan = useMemo(
    () =>
      computeDownPaymentPlan({
        targetPrice: price,
        percent,
        currentSavings: saved,
        monthlyContribution: monthly,
      }),
    [price, percent, saved, monthly],
  );

  const progress =
    plan.goalAmount > 0 ? Math.min(1, (plan.goalAmount - plan.remaining) / plan.goalAmount) : 1;

  return (
    <ToolPanel desc={desc} seeded={seeds.downPaymentSaved !== undefined}>
      <InputGrid>
        <NumberField
          label="Target price"
          value={price}
          onChange={setPrice}
          prefix="$"
          step={5000}
          min={0}
        />
        <NumberField
          label="Down payment %"
          value={percent}
          onChange={setPercent}
          suffix="%"
          step={1}
          min={0}
        />
        <NumberField
          label="Already saved"
          value={saved}
          onChange={setSaved}
          prefix="$"
          step={500}
          min={0}
        />
        <NumberField
          label="Monthly contribution"
          value={monthly}
          onChange={setMonthly}
          prefix="$"
          step={50}
          min={0}
        />
      </InputGrid>

      <div className="mt-6">
        <ResultChip
          label={
            plan.funded
              ? "Goal funded"
              : plan.months === null
                ? "Need a monthly amount"
                : "On a path"
          }
          color={plan.funded ? TIER_HEX.protected : TIER_HEX.p50}
        />
        <p className="mt-3 score-numeral text-4xl font-bold tracking-[-0.03em] tnum text-light">
          {plan.funded ? "Ready" : plan.months === null ? "—" : `${plan.months} mo`}
        </p>
        <p className="mt-1 text-xs text-dim">
          {plan.funded
            ? "Current savings cover the target down payment."
            : plan.months === null
              ? "Set a monthly contribution to estimate months."
              : `Months at ${formatCurrency(monthly)}/mo to close the gap`}
        </p>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-cyan shadow-glow-cyan transition-[width] duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 score-numeral text-xs tnum text-dim">
          {formatCurrency(plan.goalAmount - plan.remaining)} of {formatCurrency(plan.goalAmount)} (
          {Math.round(progress * 100)}%)
        </p>
      </div>

      <StatGrid>
        <Stat label="Goal amount" value={formatCurrency(plan.goalAmount)} />
        <Stat
          label="Still needed"
          value={formatCurrency(plan.remaining)}
          accent={plan.remaining > 0 ? TIER_HEX.snowball : undefined}
        />
      </StatGrid>

      <p className="mt-5 text-xs leading-relaxed text-dim">
        Illustrative pacing only. Actual purchase timing depends on the full readiness picture, not
        this calculator alone.
      </p>
    </ToolPanel>
  );
}

export function ClosingCostPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [price, setPrice] = useState(0);
  const [extra, setExtra] = useState(0);
  void seeds;

  const est = useMemo(
    () => estimateClosingCosts({ homePrice: price, extraFees: extra }),
    [price, extra],
  );

  return (
    <ToolPanel desc={desc} lender>
      <InputGrid>
        <NumberField
          label="Home price"
          value={price}
          onChange={setPrice}
          prefix="$"
          step={5000}
          min={0}
        />
        <NumberField
          label="Extra fixed fees"
          value={extra}
          onChange={setExtra}
          prefix="$"
          step={100}
          min={0}
        />
      </InputGrid>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Low (2%)" value={formatCurrency(est.totalLow)} hint="Plus extras" />
        <Stat
          label="Mid (3.5%)"
          value={formatCurrency(est.totalMid)}
          accent={TIER_HEX.p50}
          hint="Common planning midpoint"
        />
        <Stat
          label="High (5%)"
          value={formatCurrency(est.totalHigh)}
          accent={TIER_HEX.snowball}
          hint="Stress band"
        />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-dim">
        Closing costs vary by market, loan type, and seller credits. This range is for readiness
        planning only - not a fee quote from any lender or title company.
      </p>
    </ToolPanel>
  );
}

export function RentVsBuyPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [price, setPrice] = useState(0);
  const [down, setDown] = useState(
    seeds.downPaymentSaved !== undefined ? Math.round(seeds.downPaymentSaved) : 38000,
  );
  const [rate, setRate] = useState(6.5);
  const [rent, setRent] = useState(0);
  const [income, setIncome] = useState(
    seeds.monthlyIncome > 0 ? Math.round(seeds.monthlyIncome) : 0,
  );
  const [hoa, setHoa] = useState(0);
  const [term, setTerm] = useState(30);

  const result = useMemo(
    () =>
      computeHousingLens({
        targetPrice: price,
        downPaymentSaved: down,
        ratePct: rate,
        termYears: term,
        taxInsuranceRatePct: 1.2,
        hoaMonthly: hoa,
        currentRent: rent,
        monthlyIncome: income,
        liquidSavings: seeds.liquidSavings,
        netCashFlow: seeds.monthlyCashFlow,
      }),
    [price, down, rate, term, hoa, rent, income, seeds.liquidSavings, seeds.monthlyCashFlow],
  );

  const verdictColor =
    result.verdict === "buy_competitive"
      ? TIER_HEX.protected
      : result.verdict === "rent_clearer"
        ? TIER_HEX.p50
        : result.verdict === "buy_stretch"
          ? TIER_HEX.stretch
          : TIER_HEX.redLine;

  const verdictLabel =
    result.verdict === "buy_competitive"
      ? "Buy competitive"
      : result.verdict === "rent_clearer"
        ? "Rent clearer"
        : result.verdict === "buy_stretch"
          ? "Buy stretch"
          : "Blocked";

  return (
    <ToolPanel desc={desc} seeded lender>
      <InputGrid>
        <NumberField
          label="Target price"
          value={price}
          onChange={setPrice}
          prefix="$"
          step={5000}
          min={0}
        />
        <NumberField
          label="Down payment"
          value={down}
          onChange={setDown}
          prefix="$"
          step={1000}
          min={0}
        />
        <NumberField label="Rate" value={rate} onChange={setRate} suffix="%" step={0.125} min={0} />
        <NumberField
          label="Current rent"
          value={rent}
          onChange={setRent}
          prefix="$"
          step={25}
          min={0}
        />
        <NumberField
          label="Monthly income"
          value={income}
          onChange={setIncome}
          prefix="$"
          step={100}
          min={0}
        />
        <NumberField label="HOA / mo" value={hoa} onChange={setHoa} prefix="$" step={5} min={0} />
        <NumberField label="Term (years)" value={term} onChange={setTerm} step={5} min={1} />
      </InputGrid>

      <div className="mt-6">
        <ResultChip label={verdictLabel} color={verdictColor} />
        <p className="verdict-voice mt-3 max-w-xl">{result.headline}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Buy / mo"
          value={formatCurrency(result.monthlyHousing)}
          accent={TIER_HEX.p50}
        />
        <Stat label="Rent / mo" value={formatCurrency(result.rentMonthly)} />
        <Stat
          label="Monthly delta"
          value={`${result.monthlyDelta >= 0 ? "+" : ""}${formatCurrency(result.monthlyDelta)}`}
          accent={result.monthlyDelta > 0 ? TIER_HEX.snowball : TIER_HEX.protected}
          hint="Buy minus rent"
        />
        <Stat label="Housing ratio" value={formatPercent(result.housingRatioPct, 0)} />
        <Stat label="5-yr buy cash" value={formatCurrency(result.fiveYearBuy)} />
        <Stat
          label="Est. equity @ 5y"
          value={formatCurrency(result.equityAtHorizon)}
          accent={TIER_HEX.protected}
        />
      </div>

      {result.notes.length > 0 && (
        <ul className="mt-5 space-y-1.5 border-t border-white/[0.06] pt-4">
          {result.notes.slice(0, 4).map((n) => (
            <li key={n} className="text-xs leading-relaxed text-dim">
              {n}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/planner"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cyan hover:text-cyan/80"
      >
        Open full Plan housing lab
        <ArrowRight size={14} />
      </Link>
    </ToolPanel>
  );
}
