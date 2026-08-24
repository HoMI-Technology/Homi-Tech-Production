"use client";

import { useCallback, useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { LensField } from "@/components/tools/LensField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { SaveScenarioButton } from "@/components/tools/SaveScenarioButton";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { getLens } from "@/lib/tools/registry";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { ToolShell } from "@/components/tools/ToolShell";
import type { LensDigestInput } from "@/lib/tools/digest";

const LENS = getLens("down-payment")!;

interface GrowthPoint {
  month: number;
  saved: number;
}

function simulateGrowth(
  saved: number,
  monthly: number,
  apy: number,
  goal: number,
): { points: GrowthPoint[]; monthsToGoal: number | null } {
  const monthlyRate = apy / 100 / 12;
  const points: GrowthPoint[] = [{ month: 0, saved }];
  let balance = saved;
  let monthsToGoal: number | null = balance >= goal ? 0 : null;
  const cap = 600; // 50 years safety
  for (let m = 1; m <= cap; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    points.push({ month: m, saved: balance });
    if (monthsToGoal === null && balance >= goal) {
      monthsToGoal = m;
    }
    if (monthsToGoal !== null && m > monthsToGoal + 6) break; // enough tail past goal
  }
  return { points, monthsToGoal };
}

export default function DownPaymentPage() {
  const [price, setPrice] = useState(400000);
  const [targetPct, setTargetPct] = useState(20);
  const [saved, setSaved] = useState(15000);
  const [monthly, setMonthly] = useState(800);
  const [apy, setApy] = useState(4);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "price") setPrice(v);
    else if (key === "saved") setSaved(v);
    else if (key === "monthly") setMonthly(v);
  }, []);
  const { prefilled, markAll } = useLensPrefill("down-payment", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const goal = (price * targetPct) / 100;
  const remaining = Math.max(0, goal - saved);

  const { points, monthsToGoal } = useMemo(
    () => simulateGrowth(saved, monthly, apy, goal),
    [saved, monthly, apy, goal],
  );

  const targetDate = useMemo(() => {
    if (monthsToGoal === null) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [monthsToGoal]);

  // The lens digest the Companion reads — a savings plan, not a payment,
  // so there are no obligation deltas by design. When the goal is
  // unreachable inside 50 years the headline says what is still missing
  // instead of quoting a capped month count.
  const digest = useMemo<LensDigestInput>(
    () => ({
      lensId: "down-payment",
      path: "/tools/down-payment",
      headline:
        monthsToGoal !== null
          ? { label: "Time to goal", value: monthsToGoal, unit: "months" as const }
          : { label: "Remaining to save", value: Math.round(remaining), unit: "currency" as const },
      keyInputs: { price, targetPct, saved, monthly, apy },
      deltas: null,
    }),
    [monthsToGoal, remaining, price, targetPct, saved, monthly, apy],
  );

  const width = 640;
  const height = 220;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxSaved = Math.max(goal, points[points.length - 1]?.saved || goal) * 1.05;
  const maxMonth = points[points.length - 1]?.month || 1;

  const linePoints = points
    .map((p) => {
      const x = padding + (p.month / maxMonth) * chartWidth;
      const y = padding + chartHeight - (p.saved / maxSaved) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");
  const goalY = padding + chartHeight - (goal / maxSaved) * chartHeight;

  return (
    <ToolShell
      relatedGuide={LENS.relatedGuide}
      title="Down Payment Goal"
      description={`How long it will actually take to hit your down payment target, given what you have saved and what you're realistically able to set aside each month.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <LensField
            label="Target home price"
            value={price}
            onChange={setPrice}
            min={100000}
            max={1500000}
            step={5000}
            format="currency"
            source={sourceFor("price")}
          />
          <LensField
            label="Target down payment %"
            value={targetPct}
            onChange={setTargetPct}
            min={3}
            max={30}
            step={1}
            format="percent"
          />
          <LensField
            label="Already saved"
            value={saved}
            onChange={setSaved}
            min={0}
            max={goal * 1.5 || 200000}
            step={500}
            format="currency"
            source={sourceFor("saved")}
          />
          <LensField
            label="Monthly contribution"
            value={monthly}
            onChange={setMonthly}
            min={0}
            max={10000}
            step={50}
            format="currency"
            source={sourceFor("monthly")}
          />
          <LensField
            label="Savings APY"
            value={apy}
            onChange={setApy}
            min={0}
            max={10}
            step={0.1}
            format="percent"
          />

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({ targetPrice: price, downPaymentSaved: saved })}
            onSaved={() => markAll(["price", "saved"])}
          />
          <SaveScenarioButton
            lensId="down-payment"
            getInputs={() => ({ price, targetPct, saved, monthly, apy })}
          />
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-dim">Goal</p>
                <p className="score-numeral mt-1 text-lg font-bold text-light">
                  {formatCurrency(goal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dim">Remaining</p>
                <p className="score-numeral mt-1 text-lg font-bold text-light">
                  {formatCurrency(remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dim">Time to goal</p>
                <p className="score-numeral mt-1 text-lg font-bold text-cyan">
                  {monthsToGoal !== null ? formatMonths(monthsToGoal) : "50+ yrs"}
                </p>
              </div>
            </div>
            {targetDate && (
              <p className="mt-3 text-center text-sm text-dim">Estimated: {targetDate}</p>
            )}
          </div>

          <LensSynthesis digest={digest} />

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Growth curve</h2>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width="100%"
              height={height}
              className="mt-4"
              role="img"
              aria-label="Down payment savings growth curve"
            >
              <line
                x1={padding}
                x2={width - padding}
                y1={goalY}
                y2={goalY}
                stroke={COLORS.yellow}
                strokeDasharray="6 4"
                strokeWidth="1.5"
              />
              <text
                x={width - padding}
                y={goalY - 6}
                textAnchor="end"
                fontSize="11"
                fill={COLORS.yellow}
              >
                Goal
              </text>
              <polyline
                points={linePoints}
                fill="none"
                stroke={COLORS.cyan}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {LENS.chains && <ChainLinks chains={LENS.chains} />}
        </div>
      </div>
    </ToolShell>
  );
}
