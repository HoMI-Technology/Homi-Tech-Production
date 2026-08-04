"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { useFinanceDashboard, type FinanceDashboard } from "@/hooks/use-finance-dashboard";
import { formatCurrency, formatPercent } from "@/lib/tools/format";

/**
 * Spend digest for the premium finance overview. Surfaces this period's spend,
 * the delta vs last period, top categories with simple bars, rising/falling
 * category trends, and a copyable readiness receipt summary.
 *
 * Accepts an optional `dashboard` prop so tests can inject data without
 * mounting the full hook.
 */
export function SpendDigestPanel({
  dashboard: injected,
}: {
  dashboard?: FinanceDashboard;
}) {
  const hookedDashboard = useFinanceDashboard();
  const dashboard = injected ?? hookedDashboard;
  const { kpis, monthlySeries, categoryBreakdown, categoryTrends, ready } = dashboard;

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { currentSpend, priorSpend, delta, deltaPct } = useMemo(() => {
    const current = monthlySeries[monthlySeries.length - 1]?.spending ?? 0;
    const prior = monthlySeries[monthlySeries.length - 2]?.spending ?? 0;
    const d = current - prior;
    return {
      currentSpend: current,
      priorSpend: prior,
      delta: d,
      deltaPct: prior > 0 ? Math.round((d / prior) * 1000) / 10 : null,
    };
  }, [monthlySeries]);

  const receiptText = useMemo(() => {
    const date = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const run = kpis.runwayMonths != null ? `${kpis.runwayMonths.toFixed(1)} months` : "—";
    return [
      `HōMI Finance Readiness Receipt — ${date}`,
      `Monthly income: ${formatCurrency(kpis.monthlyIncome)}`,
      `Net cash flow: ${formatCurrency(kpis.netCashFlow)}`,
      `Savings rate: ${formatPercent(kpis.savingsRate)}`,
      `Runway: ${run}`,
      `DTI: ${formatPercent(kpis.dti)}`,
      `Top spending: ${categoryBreakdown[0]?.name ?? "—"} ${formatCurrency(categoryBreakdown[0]?.amount ?? 0)}`,
      "",
      "Band-only share summary. No balances, no identity token.",
    ].join("\n");
  }, [kpis, categoryBreakdown]);

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const maxCategoryAmount = categoryBreakdown[0]?.amount ?? 1;

  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan">Spend digest</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-light">What changed this month</h2>
          <p className="mt-1 max-w-md text-sm text-dim">
            {ready
              ? "A quick read on where cash went and what's shifting."
              : "Add a few transactions to see your spending pattern here."}
          </p>
        </div>
        <div className="rounded-lg border border-slate-surface/60 bg-navy/50 px-3 py-2 text-right">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-dim">
            This period
          </p>
          <p className="score-numeral text-lg font-semibold text-light">
            {formatCurrency(currentSpend)}
          </p>
          {deltaPct != null && (
            <p
              className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold ${
                delta > 0 ? "text-crimson" : "text-emerald"
              }`}
            >
              {delta > 0 ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
              {delta > 0 ? "+" : ""}
              {deltaPct.toFixed(0)}% vs prior
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim">
            Top categories
          </p>
          <ul className="space-y-2">
            {categoryBreakdown.map((c) => (
              <li key={c.name}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <span className="font-medium text-light">{c.name}</span>
                  <span className="score-numeral text-dim">
                    {formatCurrency(c.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-surface/60">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (c.amount / maxCategoryAmount) * 100)}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </li>
            ))}
            {categoryBreakdown.length === 0 && (
              <li className="text-sm text-dim">No expenses in range.</li>
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-surface/60 bg-navy/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim">
              <TrendingIcon className="text-emerald" />
              Rising / falling
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="mb-1 font-semibold text-crimson">Up</p>
                {categoryTrends.rising.length === 0 && <p className="text-dim">None</p>}
                {categoryTrends.rising.map((r) => (
                  <p key={r.name} className="text-light/90">
                    {r.name}{" "}
                    <span className="score-numeral text-crimson">+{formatCurrency(r.delta)}</span>
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-1 font-semibold text-emerald">Down</p>
                {categoryTrends.falling.length === 0 && <p className="text-dim">None</p>}
                {categoryTrends.falling.map((r) => (
                  <p key={r.name} className="text-light/90">
                    {r.name}{" "}
                    <span className="score-numeral text-emerald">{formatCurrency(r.delta)}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-surface/60 bg-navy/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim">
              <ReceiptIcon className="text-cyan" />
              Readiness receipt
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-dim">
              Band-only share summary — verdict + coarse pillars. No balances,
              no identity token.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-surface/60 bg-navy/55 px-3 py-2 text-sm font-semibold text-cyan transition-colors hover:border-cyan/40 hover:bg-navy/70"
              onClick={() => {
                setReceiptOpen(true);
                setCopied(false);
              }}
            >
              Issue receipt
            </button>
            {receiptOpen && (
              <div className="mt-3 rounded-lg border border-cyan/25 bg-cyan/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald">
                    {kpis.netCashFlow >= 0 && kpis.runwayMonths != null && kpis.runwayMonths >= 3
                      ? "Steady"
                      : "Building"}{" "}
                    · Finance
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan"
                    onClick={copyReceipt}
                  >
                    <CopyIcon />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="score-numeral mt-2 whitespace-pre-wrap break-all text-[0.7rem] text-light/80">
                  {receiptText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function ArrowDownRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 7l10 10" />
      <path d="M17 7v10H7" />
    </svg>
  );
}

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M22 7l-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
