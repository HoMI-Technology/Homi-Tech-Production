"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCfm } from "@/hooks/use-cfm";
import { COLORS } from "@/lib/brand";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger, type NamedMoneyMetrics } from "@/lib/finance/metrics";

/**
 * Money picture — Stand job on live `/money`.
 * Facts under the Home verdict. No surplus hero, no score rail, no compass.
 */
export function MoneyStand() {
  const { hydrated: cfmHydrated } = useCfm();
  const [metrics, setMetrics] = useState<NamedMoneyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const nowIso = new Date().toISOString();
    if (!hasSavedBudgetLedger()) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    const ledger = loadBudgetLedger(nowIso);
    const m = metricsFromLedger(ledger, nowIso, budgetLedgerSavedAt());
    if (!m.evidence.hasIncome && !m.evidence.hasExpenses && m.evidence.monthsWithData === 0) {
      setMetrics(null);
    } else {
      setMetrics(m);
    }
    setLoading(false);
  }, []);

  const ready = metrics !== null;
  const linked = metrics !== null && metrics.evidence.sourceMode !== "manual";
  const runwayMonths = metrics?.runway.months ?? null;
  const liquid = metrics?.runway.liquidDollars ?? 0;
  const runwayShort = ready && runwayMonths != null && runwayMonths < 1;

  const asOf = metrics?.asOf ?? null;
  const asOfLabel = useMemo(() => {
    if (!asOf) return ready ? "Age unknown" : null;
    const days = Math.floor((Date.now() - new Date(asOf).getTime()) / 86_400_000);
    if (!Number.isFinite(days) || days < 0) return "Age unknown";
    if (days === 0) return "Updated today";
    if (days === 1) return "Updated yesterday";
    return `Updated ${days}d ago`;
  }, [asOf, ready]);

  const flags = useMemo(() => {
    if (!ready || !metrics) return "None invented · ledger only";
    const parts: string[] = [];
    if (metrics.evidence.pendingTransactionCount > 0) {
      parts.push(`${metrics.evidence.pendingTransactionCount} pending`);
    }
    if (metrics.evidence.completeness === "low") {
      parts.push("Thin evidence");
    }
    if (metrics.evidence.hasDebtSignal !== true) {
      parts.push("Debt not recorded");
    }
    return parts.length > 0 ? `${parts.join(" · ")} · ledger only` : "None invented · ledger only";
  }, [metrics, ready]);

  const liquidLine = !ready
    ? "—"
    : linked
      ? "Connected · honest balance"
      : "Recorded manually · ledger";

  const runwayLine =
    !ready || runwayMonths == null
      ? ready
        ? "Unknown · Path evidence"
        : "—"
      : runwayShort
        ? "Under 1 month · Path evidence"
        : `${runwayMonths.toFixed(1)} mo · Path evidence`;

  if (loading || !cfmHydrated) {
    return (
      <div className="space-y-6" aria-busy="true" data-money-job="stand">
        <div className="h-24 animate-pulse rounded-xl bg-slate-surface/40" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-6" data-money-job="stand" data-money-empty="">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
          Money · live route depth
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-light">
          Connect accounts to see money reality
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-dim">
          Ledger truth lives here when accounts are real. No estimated net worth.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/connections" className="btn btn-ghost border-cyan/50 text-cyan">
            Connect accounts
          </Link>
          <Link href="/money/budget" className="text-sm text-dim underline-offset-2 hover:underline">
            Record manually
          </Link>
        </div>
        <p className="max-w-2xl pt-4 text-xs leading-relaxed text-dim/70">
          HōMI Money is educational. It does not provide financial, tax, mortgage, or investment
          advice. Confirm critical numbers with qualified professionals before you act.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-money-job="stand" data-money-picture="">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Quiet picture · accounts real
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-light">Your money picture</h1>
      <p className="max-w-xl text-sm leading-relaxed text-dim">
        Facts under the verdict — Path evidence, not a second home.
      </p>
      {asOfLabel && <p className="text-xs text-dim/80">{asOfLabel}</p>}

      <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        <FactRow label="Liquid cash" value={liquidLine} detail={formatQuietMoney(liquid)} />
        <FactRow
          label="Emergency runway"
          value={runwayLine}
          tone={runwayShort ? "warn" : "quiet"}
        />
        <FactRow label="Flags" value={flags} />
      </dl>

      <p>
        <Link
          href="/timeline"
          className="text-sm text-dim underline decoration-white/20 underline-offset-4 hover:text-light"
        >
        Score history · age as evidence
          </Link>
        </p>

      <p className="max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI Money is educational. It does not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}

function formatQuietMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function FactRow({
  label,
  value,
  detail,
  tone = "quiet",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "quiet" | "warn";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-dim">{label}</dt>
      <dd
        className="max-w-[60%] text-right text-sm leading-relaxed"
        style={{ color: tone === "warn" ? COLORS.yellow : undefined }}
      >
        <span className={tone === "warn" ? "text-yellow" : "text-dim"}>{value}</span>
        {detail ? <span className="mt-0.5 block text-xs text-dim/70">{detail}</span> : null}
      </dd>
    </div>
  );
}
