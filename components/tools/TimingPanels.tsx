"use client";

import { COLORS } from "@/lib/brand";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { runMonteCarlo } from "@/lib/tools/montecarlo";
import { DECIDE_MC_DEFAULTS } from "@/lib/tools/same-model";
import { computeCoastFire, computeFireNumber } from "@/lib/tools/fire";
import { computeRothConversion } from "@/lib/tools/roth";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/tools/format";
import {
  InputGrid,
  NumberField,
  ResultChip,
  Stat,
  StatGrid,
  ToolPanel,
} from "@/components/tools/panel-ui";
import { TIER_HEX } from "@/components/tools/panel-registry";
import { ledgerSeedsAreOwn, type LedgerSeeds } from "@/components/tools/seeds";
import { ChartTooltip } from "@/components/ui/ChartTooltip";

const AXIS_TICK = {
  fill: COLORS.dim,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
} as const;

/* ------------------------------------------------------------------ */
/* Monte Carlo Projection — seeded P10/P50/P90 fan chart               */
/* ------------------------------------------------------------------ */

export function MonteCarloPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [currentSavings, setCurrentSavings] = useState(
    seeds.invested > 0 ? Math.round(seeds.invested) : 0,
  );
  const [monthlyContribution, setMonthlyContribution] = useState(
    seeds.monthlyCashFlow > 0 ? Math.round(seeds.monthlyCashFlow) : 0,
  );
  const [years, setYears] = useState(DECIDE_MC_DEFAULTS.years);
  const [expectedReturn, setExpectedReturn] = useState(DECIDE_MC_DEFAULTS.expectedReturnPct);
  const [volatility, setVolatility] = useState(DECIDE_MC_DEFAULTS.volatilityPct);
  const [targetAmount, setTargetAmount] = useState(DECIDE_MC_DEFAULTS.targetAmount);

  /* Decide-surface defaults. Independent of the Tools page bag. Memoized
   * on the inputs alone so re-renders never re-roll. */
  const result = useMemo(
    () =>
      runMonteCarlo({
        currentSavings,
        monthlyContribution,
        years,
        expectedReturnPct: expectedReturn,
        volatilityPct: volatility,
        targetAmount: targetAmount > 0 ? targetAmount : undefined,
        jobLossProb: DECIDE_MC_DEFAULTS.jobLossProb,
        maintenanceShock: DECIDE_MC_DEFAULTS.maintenanceShock,
        incomeGrowth: DECIDE_MC_DEFAULTS.incomeGrowth,
        runs: DECIDE_MC_DEFAULTS.runs,
        seed: DECIDE_MC_DEFAULTS.seed,
      }),
    [currentSavings, monthlyContribution, years, expectedReturn, volatility, targetAmount],
  );

  /* Fan data: stacked band trick — transparent base at p10, filled band p10→p90, p50 line. */
  const fanData = useMemo(
    () =>
      result.bands.map((b) => ({
        year: `Yr ${b.year}`,
        base: b.p10,
        band: Math.max(0, b.p90 - b.p10),
        p50: b.p50,
        p10: b.p10,
        p90: b.p90,
      })),
    [result],
  );

  return (
    <ToolPanel desc={desc} seeded={ledgerSeedsAreOwn(seeds)}>
      <InputGrid>
        <NumberField
          label="Current savings"
          value={currentSavings}
          onChange={setCurrentSavings}
          prefix="$"
          step={1000}
          min={0}
        />
        <NumberField
          label="Monthly contribution"
          value={monthlyContribution}
          onChange={setMonthlyContribution}
          prefix="$"
          step={50}
          min={0}
        />
        <NumberField label="Years" value={years} onChange={setYears} step={1} min={1} />
        <NumberField
          label="Expected return"
          value={expectedReturn}
          onChange={setExpectedReturn}
          suffix="%"
          step={0.5}
          min={0}
        />
        <NumberField
          label="Volatility (std dev)"
          value={volatility}
          onChange={setVolatility}
          suffix="%"
          step={1}
          min={0}
        />
        <NumberField
          label="Target amount"
          value={targetAmount}
          onChange={setTargetAmount}
          prefix="$"
          step={10000}
          min={0}
        />
      </InputGrid>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {result.probabilityOfTarget !== null && (
          <p className="score-numeral text-2xl font-semibold tracking-[-0.01em] text-light">
            {formatPercent(result.probabilityOfTarget, 0)}
            <span className="ml-2 text-xs font-normal text-dim">
              chance of reaching {formatCompactCurrency(targetAmount, { minDecimals: 1 })}
            </span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ResultChip
            label={`P10 ${formatCompactCurrency(result.finalP10, { minDecimals: 1 })}`}
            color={TIER_HEX.p10}
          />
          <ResultChip
            label={`P50 ${formatCompactCurrency(result.finalP50, { minDecimals: 1 })}`}
            color={TIER_HEX.p50}
          />
          <ResultChip
            label={`P90 ${formatCompactCurrency(result.finalP90, { minDecimals: 1 })}`}
            color={TIER_HEX.p90}
          />
        </div>
      </div>

      <div className="mt-4 h-[240px] max-sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fanData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
            <defs>
              <linearGradient id="mc-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(226,232,240,0.05)" />
            <XAxis
              dataKey="year"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              dy={6}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactCurrency(v)}
              tick={{ fill: COLORS.dim, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={<ChartTooltip format={(n: number) => formatCurrency(n)} />}
              cursor={{ stroke: "rgba(226,232,240,0.2)", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="base"
              name="P10 base"
              stackId="band"
              stroke="none"
              fill="transparent"
              legendType="none"
              isAnimationActive={false}
              tooltipType="none"
            />
            <Area
              type="monotone"
              dataKey="band"
              name="P10–P90 band"
              stackId="band"
              stroke="none"
              fill="url(#mc-band)"
              isAnimationActive={false}
              tooltipType="none"
            />
            <Line
              type="monotone"
              dataKey="p50"
              name="P50 median"
              stroke={COLORS.cyan}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.cyan, stroke: COLORS.navyLight, strokeWidth: 1.5 }}
              style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.35))" }}
            />
            <Line
              type="monotone"
              dataKey="p10"
              name="P10"
              stroke={TIER_HEX.p10}
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p90"
              name="P90"
              stroke={TIER_HEX.p90}
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-dim">
        Seeded simulations, normally-distributed monthly returns — the same inputs always produce
        the same bands. The median path (P50) is the planning anchor; the P10–P90 band is the honest
        range, not a promise.
      </p>
    </ToolPanel>
  );
}

/* ------------------------------------------------------------------ */
/* FIRE Number — classic + coast                                       */
/* ------------------------------------------------------------------ */

export function FirePanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [annualExpenses, setAnnualExpenses] = useState(
    seeds.monthlyOutflow > 0 ? Math.round(seeds.monthlyOutflow * 12) : 48000,
  );
  const [swrPercent, setSwrPercent] = useState(4);
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [currentSavings, setCurrentSavings] = useState(
    seeds.invested > 0 ? Math.round(seeds.invested) : 0,
  );
  const [expectedReturn, setExpectedReturn] = useState(7);

  const r = useMemo(
    () =>
      computeCoastFire({
        annualExpenses,
        swrPercent,
        currentAge,
        retirementAge,
        currentSavings,
        expectedReturnPercent: expectedReturn,
      }),
    [annualExpenses, swrPercent, currentAge, retirementAge, currentSavings, expectedReturn],
  );

  return (
    <ToolPanel desc={desc} seeded={ledgerSeedsAreOwn(seeds)}>
      <InputGrid>
        <NumberField
          label="Annual expenses"
          value={annualExpenses}
          onChange={setAnnualExpenses}
          prefix="$"
          step={1000}
          min={0}
        />
        <NumberField
          label="Safe withdrawal rate"
          value={swrPercent}
          onChange={setSwrPercent}
          suffix="%"
          step={0.25}
          min={0.1}
        />
        <NumberField
          label="Current age"
          value={currentAge}
          onChange={setCurrentAge}
          step={1}
          min={0}
        />
        <NumberField
          label="Retirement age"
          value={retirementAge}
          onChange={setRetirementAge}
          step={1}
          min={0}
        />
        <NumberField
          label="Current invested savings"
          value={currentSavings}
          onChange={setCurrentSavings}
          prefix="$"
          step={1000}
          min={0}
        />
        <NumberField
          label="Expected return"
          value={expectedReturn}
          onChange={setExpectedReturn}
          suffix="%"
          step={0.5}
          min={0}
        />
      </InputGrid>

      <div className="mt-5">
        <ResultChip
          label={r.isCoastFire ? "Coast-FIRE reached" : "Not coasting yet"}
          color={r.isCoastFire ? TIER_HEX.p90 : TIER_HEX.stretch}
        />
      </div>
      <StatGrid>
        <Stat
          label="FIRE number"
          value={formatCurrency(computeFireNumber(annualExpenses, swrPercent))}
          hint={`Annual expenses ÷ ${formatPercent(swrPercent, 2)} safe withdrawal rate`}
        />
        <Stat
          label="Coast number needed now"
          value={formatCurrency(r.coastFireNumberNeededNow)}
          hint="Invested today with no further contributions, it grows to the FIRE number by retirement age"
        />
        <Stat
          label="Projected at retirement"
          value={formatCurrency(r.projectedAtRetirement)}
          accent={r.isCoastFire ? TIER_HEX.p90 : COLORS.light}
          hint={
            r.coastFireAge !== null
              ? `Today's savings alone coast to the FIRE number at age ${Math.floor(r.coastFireAge)}`
              : "No coast trajectory from zero savings"
          }
        />
      </StatGrid>
    </ToolPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Roth Conversion — tax today vs tax avoided later (educational)      */
/* ------------------------------------------------------------------ */

export function RothPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [currentBalance, setCurrentBalance] = useState(
    seeds.invested > 0 ? Math.round(seeds.invested) : 0,
  );
  const [convertAmount, setConvertAmount] = useState(0);
  const [rateNow, setRateNow] = useState(24);
  const [rateRetirement, setRateRetirement] = useState(22);
  const [yearsToHorizon, setYearsToHorizon] = useState(25);
  const [growth, setGrowth] = useState(7);

  const r = useMemo(
    () =>
      computeRothConversion({
        currentBalance,
        convertAmount,
        marginalRateNowPercent: rateNow,
        expectedRateRetirementPercent: rateRetirement,
        yearsToHorizon,
        expectedGrowthPercent: growth,
      }),
    [currentBalance, convertAmount, rateNow, rateRetirement, yearsToHorizon, growth],
  );

  const net = r.netEducationalBenefit;

  return (
    <ToolPanel desc={desc} seeded={ledgerSeedsAreOwn(seeds)}>
      <InputGrid>
        <NumberField
          label="Traditional balance"
          value={currentBalance}
          onChange={setCurrentBalance}
          prefix="$"
          step={5000}
          min={0}
        />
        <NumberField
          label="Convert amount"
          value={convertAmount}
          onChange={setConvertAmount}
          prefix="$"
          step={1000}
          min={0}
        />
        <NumberField
          label="Marginal rate now"
          value={rateNow}
          onChange={setRateNow}
          suffix="%"
          step={1}
          min={0}
        />
        <NumberField
          label="Rate at retirement"
          value={rateRetirement}
          onChange={setRateRetirement}
          suffix="%"
          step={1}
          min={0}
        />
        <NumberField
          label="Years to horizon"
          value={yearsToHorizon}
          onChange={setYearsToHorizon}
          step={1}
          min={0}
        />
        <NumberField
          label="Expected growth"
          value={growth}
          onChange={setGrowth}
          suffix="%"
          step={0.5}
          min={0}
        />
      </InputGrid>

      <div className="mt-5">
        <ResultChip
          label={
            net >= 0
              ? `Net educational benefit: ${formatCurrency(net)}`
              : `Net educational cost: ${formatCurrency(Math.abs(net))}`
          }
          color={net >= 0 ? TIER_HEX.p90 : TIER_HEX.p10}
        />
      </div>
      <StatGrid>
        <Stat
          label="Tax cost today"
          value={formatCurrency(r.taxCostToday)}
          hint="Owed in the year of conversion, at your current marginal rate"
        />
        <Stat
          label="Grown value at horizon"
          value={formatCurrency(r.futureValueAtHorizon)}
          hint="The converted amount, grown tax-free in a Roth"
        />
        <Stat
          label="Tax avoided at horizon"
          value={formatCurrency(r.taxAvoidedAtHorizon)}
          accent={COLORS.cyan}
          hint="What would have been owed had it stayed traditional"
        />
      </StatGrid>

      <p className="mt-4 text-xs leading-relaxed text-dim">
        A nominal-dollar, undiscounted comparison — it does not model bracket compounding, state
        taxes, IRMAA, or your circumstances, and it is not a recommendation to convert.
      </p>
    </ToolPanel>
  );
}
