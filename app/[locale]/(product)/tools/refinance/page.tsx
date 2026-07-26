"use client";

import { useCallback, useMemo, useState } from "react";
import { analyzeRefinance } from "@/lib/tools/refinance";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { CalcField } from "@/components/tools/CalcField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { getLens } from "@/lib/tools/registry";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell } from "@/components/tools/ToolShell";

const LENS = getLens("refinance")!;

function RefinancePageInner() {
  const [balance, setBalance] = useState(320000);
  const [currentRate, setCurrentRate] = useState(7.5);
  const [currentTermYears, setCurrentTermYears] = useState(27);
  const [newRate, setNewRate] = useState(6.0);
  const [newTermYears, setNewTermYears] = useState(30);
  const [closingCosts, setClosingCosts] = useState(6000);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "balance") setBalance(v);
    else if (key === "currentRate") setCurrentRate(v);
    else if (key === "newRate") setNewRate(v);
  }, []);
  const { prefilled, markAll } = useLensPrefill("refinance", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const r = useMemo(
    () => analyzeRefinance({ balance, currentRate, currentTermYears, newRate, newTermYears, closingCosts }),
    [balance, currentRate, currentTermYears, newRate, newTermYears, closingCosts],
  );

  const worthIt = r.breakEvenMonths !== null;

  return (
    <ToolShell
      title="Refinance Break-Even"
      description={`A lower rate isn't automatically a better deal. This shows the month your payment savings finally pay back the closing costs — and whether you'll still be in the home by then.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <CalcField label="Loan balance" value={balance} onChange={setBalance} min={50000} max={1500000} step={5000} format="currency" source={sourceFor("balance")} />
          <CalcField label="Current rate" value={currentRate} onChange={setCurrentRate} min={2} max={12} step={0.125} format="percent" source={sourceFor("currentRate")} />
          <CalcField label="Years left on current loan" value={currentTermYears} onChange={setCurrentTermYears} min={5} max={30} step={1} format="years" />
          <CalcField label="New rate" value={newRate} onChange={setNewRate} min={2} max={12} step={0.125} format="percent" source={sourceFor("newRate")} />
          <CalcField label="New loan term" value={newTermYears} onChange={setNewTermYears} min={10} max={30} step={5} format="years" />
          <CalcField label="Closing costs" value={closingCosts} onChange={setClosingCosts} min={0} max={20000} step={250} format="currency" />

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({
              currentMortgageBalance: balance,
              currentMortgageRatePct: currentRate,
              assumedRatePct: newRate,
            })}
            onSaved={() => markAll(["balance", "currentRate", "newRate"])}
          />
        </div>

        <div className="space-y-6">
          <div className={`glass p-6 ${worthIt ? "" : "opacity-95"}`}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-dim">Current payment</p>
                <p className="score-numeral mt-1 text-xl font-bold text-light">{formatCurrency(r.currentMonthly)}</p>
              </div>
              <div>
                <p className="text-xs text-dim">New payment</p>
                <p className="score-numeral mt-1 text-xl font-bold text-cyan">{formatCurrency(r.newMonthly)}</p>
              </div>
              <div>
                <p className="text-xs text-dim">Monthly savings</p>
                <p className={`score-numeral mt-1 text-xl font-bold ${r.monthlySavings > 0 ? "text-emerald" : "text-crimson"}`}>
                  {r.monthlySavings > 0 ? "+" : ""}{formatCurrency(r.monthlySavings)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass panel-focus p-6">
            <p className="eyebrow">Break-even</p>
            {worthIt ? (
              <>
                <p className="score-numeral mt-2 text-4xl font-bold text-light">{formatMonths(r.breakEvenMonths as number)}</p>
                <p className="mt-2 text-sm leading-relaxed text-dim">
                  That&rsquo;s how long until the lower payment repays your {formatCurrency(closingCosts)} in
                  closing costs. Stay past that and the refinance is money ahead; sell or refinance again
                  before it, and you&rsquo;d have lost money on the switch.
                </p>
              </>
            ) : (
              <>
                <p className="score-numeral mt-2 text-2xl font-bold text-crimson">No monthly savings</p>
                <p className="mt-2 text-sm leading-relaxed text-dim">
                  The new payment isn&rsquo;t lower, so there&rsquo;s nothing to recover the closing costs —
                  this refinance doesn&rsquo;t pay for itself on payment alone. (A shorter term or cashing out
                  are different goals than lowering the payment.)
                </p>
              </>
            )}
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Lifetime interest</h2>
            <p className="mt-1 text-xs text-dim">Total interest across each full term, before closing costs.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-dim">Current loan</p>
                <p className="score-numeral mt-1 text-lg font-bold text-light">{formatCurrency(r.currentLifetimeInterest)}</p>
              </div>
              <div>
                <p className="text-xs text-dim">New loan</p>
                <p className="score-numeral mt-1 text-lg font-bold text-light">{formatCurrency(r.newLifetimeInterest)}</p>
              </div>
            </div>
            <div className="hairline my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">Net lifetime change (incl. closing costs)</span>
              <span className={`score-numeral text-sm font-bold ${r.lifetimeInterestDelta >= 0 ? "text-emerald" : "text-crimson"}`}>
                {r.lifetimeInterestDelta >= 0 ? "Save " : "Cost "}{formatCurrency(Math.abs(r.lifetimeInterestDelta))}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-dim">
              A longer new term can lower the payment while costing more interest over time — the two lines
              above are why &ldquo;lower rate&rdquo; and &ldquo;cheaper loan&rdquo; aren&rsquo;t the same thing.
            </p>
          </div>

          {LENS.chains && <ChainLinks chains={LENS.chains} />}
        </div>
      </div>
    </ToolShell>
  );
}

export default function RefinancePage() {
  return (
    <AdvancedToolGate>
      <RefinancePageInner />
    </AdvancedToolGate>
  );
}
