"use client";

import { useMemo, useState } from "react";
import { helocAvailability, helocTiers } from "@/lib/tools/heloc";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { CalcField } from "@/components/tools/CalcField";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";

function HelocPageInner() {
  const [homeValue, setHomeValue] = useState(500000);
  const [mortgageBalance, setMortgageBalance] = useState(280000);
  const [maxCltv, setMaxCltv] = useState(85);
  const [rate, setRate] = useState(8.5);

  const result = useMemo(
    () => helocAvailability({ homeValue, mortgageBalance, maxCltv: maxCltv / 100, rate }),
    [homeValue, mortgageBalance, maxCltv, rate],
  );
  const tiers = useMemo(
    () => helocTiers(homeValue, mortgageBalance, rate),
    [homeValue, mortgageBalance, rate],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Home Equity Line (HELOC)</h1>
      <p className="mt-2 max-w-2xl text-dim">
        How much you can actually borrow against your home — the honest number after the lender&rsquo;s
        combined loan-to-value cap, not just your paper equity.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass space-y-5 p-6">
          <CalcField label="Home value" value={homeValue} onChange={setHomeValue} min={100000} max={2000000} step={5000} format="currency" />
          <CalcField label="Mortgage balance" value={mortgageBalance} onChange={setMortgageBalance} min={0} max={homeValue} step={5000} format="currency" />
          <CalcField label="Lender max CLTV" value={maxCltv} onChange={setMaxCltv} min={70} max={90} step={5} format="percent" />
          <CalcField label="Line rate (variable)" value={rate} onChange={setRate} min={4} max={14} step={0.25} format="percent" />
        </div>

        <div className="space-y-6">
          <div className="glass p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-dim">Your equity</p>
                <p className="score-numeral mt-1 text-2xl font-bold text-emerald">{formatCurrency(result.equity)}</p>
                <p className="mt-1 text-xs text-dim">{formatPercent(result.equityPct * 100)} of your home</p>
              </div>
              <div>
                <p className="text-xs text-dim">Available line at {maxCltv}% CLTV</p>
                <p className="score-numeral mt-1 text-2xl font-bold text-cyan">{formatCurrency(result.availableLine)}</p>
                <p className="mt-1 text-xs text-dim">≈ {formatCurrency(result.interestOnlyMonthly)}/mo interest-only if fully drawn</p>
              </div>
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What each CLTV tier unlocks</h2>
            <p className="mt-1 text-xs text-dim">Lenders cap combined debt at a share of your home&rsquo;s value.</p>
            <div className="mt-5 space-y-4">
              {tiers.map(({ cltv, result: r }) => {
                const maxLine = Math.max(...tiers.map((t) => t.result.availableLine), 1);
                const pct = Math.max(3, (r.availableLine / maxLine) * 100);
                const active = Math.round(cltv * 100) === maxCltv;
                return (
                  <div key={cltv}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={active ? "font-semibold text-cyan" : "text-dim"}>{Math.round(cltv * 100)}% CLTV</span>
                      <span className="score-numeral text-light">{formatCurrency(r.availableLine)}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: active ? "#22d3ee" : "#334155" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              Your equity and your <em>borrowable</em> equity are different numbers. The lender caps total
              debt against the home at a combined loan-to-value ratio, so the line you can actually open is
              your home&rsquo;s value times that cap, minus what you still owe. A HELOC rate is usually
              variable — the interest-only figure above will move with rates, and drawing the full line puts
              your home on the hook. This is educational math, not a lending offer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelocPage() {
  return (
    <AdvancedToolGate>
      <HelocPageInner />
    </AdvancedToolGate>
  );
}
