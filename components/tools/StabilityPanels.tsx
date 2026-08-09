"use client";

import { COLORS } from "@/lib/brand";

import { useMemo, useState } from "react";
import { compareStrategies } from "@/lib/tools/debt";
import type { Debt } from "@/lib/tools/debt";
import { computeBlindBudget } from "@/lib/tools/blindbudget";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
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

/* ------------------------------------------------------------------ */
/* Debt Payoff — avalanche vs snowball, month-by-month                 */
/* ------------------------------------------------------------------ */

function defaultDebts(seeds: LedgerSeeds): Debt[] {
  // Seed the working set from the ledger's total debt, split across three
  // typical balances (the ledger tracks aggregate debt, not per-account).
  const total = seeds.totalDebt > 0 ? seeds.totalDebt : 18400;
  return [
    {
      id: "d-card",
      name: "Credit card",
      balance: Math.round(total * 0.37),
      apr: 22.9,
      minPayment: 180,
    },
    {
      id: "d-auto",
      name: "Auto loan",
      balance: Math.round(total * 0.47),
      apr: 7.5,
      minPayment: 290,
    },
    {
      id: "d-personal",
      name: "Personal loan",
      balance: Math.round(total * 0.16),
      apr: 12.5,
      minPayment: 105,
    },
  ];
}

export function DebtPayoffPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const [debts, setDebts] = useState<Debt[]>(() => defaultDebts(seeds));
  const [extraMonthly, setExtraMonthly] = useState(
    seeds.monthlyCashFlow > 0 ? Math.round(seeds.monthlyCashFlow) : 300,
  );

  const comparison = useMemo(() => compareStrategies(debts, extraMonthly), [debts, extraMonthly]);
  const { avalanche, snowball, interestSaved } = comparison;

  const winner =
    interestSaved > 0
      ? { label: `Avalanche saves ${formatCurrency(interestSaved)}`, color: TIER_HEX.avalanche }
      : interestSaved < 0
        ? {
            label: `Snowball saves ${formatCurrency(Math.abs(interestSaved))}`,
            color: TIER_HEX.snowball,
          }
        : { label: "Identical interest cost", color: COLORS.dim };

  const patchDebt = (id: string, patch: Partial<Debt>) =>
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <ToolPanel desc={desc} seeded>
      <div className="grid gap-3 md:grid-cols-3">
        {debts.map((d) => (
          <div key={d.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="eyebrow !text-light">{d.name}</span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <NumberField
                label="Balance"
                value={d.balance}
                onChange={(v) => patchDebt(d.id, { balance: v })}
                prefix="$"
                step={100}
                min={0}
              />
              <NumberField
                label="APR"
                value={d.apr}
                onChange={(v) => patchDebt(d.id, { apr: v })}
                suffix="%"
                step={0.1}
                min={0}
              />
              <NumberField
                label="Min pay"
                value={d.minPayment}
                onChange={(v) => patchDebt(d.id, { minPayment: v })}
                prefix="$"
                step={5}
                min={0}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 max-w-xs">
        <NumberField
          label="Extra monthly payment"
          value={extraMonthly}
          onChange={setExtraMonthly}
          prefix="$"
          step={25}
          min={0}
        />
      </div>

      <div className="mt-5">
        <ResultChip label={winner.label} color={winner.color} />
      </div>
      <StatGrid>
        <Stat
          label="Avalanche — highest APR first"
          value={formatMonths(avalanche.months)}
          accent={TIER_HEX.avalanche}
          hint={`${formatCurrency(avalanche.totalInterest)} total interest`}
        />
        <Stat
          label="Snowball — smallest balance first"
          value={formatMonths(snowball.months)}
          accent={TIER_HEX.snowball}
          hint={`${formatCurrency(snowball.totalInterest)} total interest`}
        />
        <Stat
          label="Interest saved by the winner"
          value={formatCurrency(Math.abs(interestSaved))}
          hint="Both strategies roll freed minimums forward — they only differ in ordering"
        />
      </StatGrid>
    </ToolPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Blind Budget — ranges in, ranges out                                */
/* ------------------------------------------------------------------ */

export function BlindBudgetPanel({ seeds, desc }: { seeds: LedgerSeeds; desc: string }) {
  const income = seeds.monthlyIncome > 0 ? seeds.monthlyIncome : 5200;
  const outflow = seeds.monthlyOutflow > 0 ? seeds.monthlyOutflow : 2600;
  const savings = seeds.liquidSavings > 0 ? seeds.liquidSavings : 8000;

  const [incomeLow, setIncomeLow] = useState(Math.round(income * 0.85));
  const [incomeHigh, setIncomeHigh] = useState(Math.round(income * 1.15));
  const [fixedLow, setFixedLow] = useState(Math.round(outflow * 0.85));
  const [fixedHigh, setFixedHigh] = useState(Math.round(outflow * 1.15));
  const [savingsLow, setSavingsLow] = useState(Math.round(savings * 0.85));
  const [savingsHigh, setSavingsHigh] = useState(Math.round(savings * 1.15));

  const r = useMemo(
    () =>
      computeBlindBudget({
        incomeLow,
        incomeHigh,
        fixedCostsLow: fixedLow,
        fixedCostsHigh: fixedHigh,
        savingsLow,
        savingsHigh,
      }),
    [incomeLow, incomeHigh, fixedLow, fixedHigh, savingsLow, savingsHigh],
  );

  return (
    <ToolPanel desc={desc} seeded>
      <InputGrid>
        <NumberField
          label="Monthly income (low)"
          value={incomeLow}
          onChange={setIncomeLow}
          prefix="$"
          step={100}
          min={0}
        />
        <NumberField
          label="Monthly income (high)"
          value={incomeHigh}
          onChange={setIncomeHigh}
          prefix="$"
          step={100}
          min={0}
        />
        <NumberField
          label="Fixed costs (low)"
          value={fixedLow}
          onChange={setFixedLow}
          prefix="$"
          step={50}
          min={0}
        />
        <NumberField
          label="Fixed costs (high)"
          value={fixedHigh}
          onChange={setFixedHigh}
          prefix="$"
          step={50}
          min={0}
        />
        <NumberField
          label="Savings (low)"
          value={savingsLow}
          onChange={setSavingsLow}
          prefix="$"
          step={250}
          min={0}
        />
        <NumberField
          label="Savings (high)"
          value={savingsHigh}
          onChange={setSavingsHigh}
          prefix="$"
          step={250}
          min={0}
        />
      </InputGrid>

      <div className="mt-5">
        <ResultChip
          label={`Safe to spend: ${formatCurrency(r.safeToSpendLow)} – ${formatCurrency(r.safeToSpendHigh)} / mo`}
          color={TIER_HEX.p90}
        />
      </div>
      <StatGrid>
        <Stat
          label="Safe to spend (worst case)"
          value={formatCurrency(r.safeToSpendLow)}
          hint="Least income against the most fixed costs"
        />
        <Stat
          label="Safe to spend (best case)"
          value={formatCurrency(r.safeToSpendHigh)}
          hint="Most income against the least fixed costs"
        />
        <Stat
          label="Runway"
          value={`${formatMonths(r.runwayLowMonths)} – ${formatMonths(r.runwayHighMonths)}`}
          accent={TIER_HEX.stretch}
          hint="How long savings alone carry the fixed costs"
        />
      </StatGrid>

      <p className="mt-4 text-xs leading-relaxed text-dim">
        Every input is a range, so every answer is a range. A wide band you actually believe beats a
        false-precise number you don't.
      </p>
    </ToolPanel>
  );
}
