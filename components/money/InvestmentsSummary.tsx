"use client";

/**
 * Investments summary — the Reality fold of the retired Invest peer tab
 * (Home + Money Reality redesign, Phase 5).
 *
 * A compact read of the two sources the full /money/investments surface
 * already owns, reusing its exact aggregates rather than duplicating its UI:
 *
 *   - linked brokerage positions via summarizePlaidHoldings — the same
 *     aggregate PlaidHoldingsPanel renders (one quiet fetch; signed-out,
 *     plan-gated, unconfigured, and failed fetches all land on "no linked
 *     picture" without nag chrome — the sub-route owns the full state
 *     machine);
 *   - on-device marked holdings via summarizePortfolio — PortfolioPanel's
 *     own selector over the planner store.
 *
 * The full investments UI (holdings table, allocation donut, add/edit) stays
 * on /money/investments; this panel is summary + entry point only. The deep
 * link stays live and MoneyModeNav lights Reality for it.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import {
  summarizePlaidHoldings,
  type HoldingsSummary,
  type PlaidHoldingView,
} from "@/lib/plaid/holdings-view";
import { summarizePortfolio } from "@/lib/planner/derived";
import { usePlannerStore } from "@/lib/planner/store";
import { formatCurrency } from "@/lib/tools/format";
import { formatSignedGain } from "@/components/planner/wealth/wealth-derive";

/** Backstop for a persist layer that never fires its hydration callback. */
const HYDRATION_CAP_MS = 800;

interface HoldingsResponse {
  configured?: boolean;
  holdings?: PlaidHoldingView[];
}

function SummaryTile({
  label,
  value,
  footer,
  color,
}: {
  label: string;
  value: string;
  footer?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
      <p className="text-label">{label}</p>
      <p className="num-money mt-1 font-display text-lg font-semibold tnum" style={{ color }}>
        {value}
      </p>
      {footer != null && <p className="mt-1 text-3xs leading-tight text-dim/60">{footer}</p>}
    </div>
  );
}

export function InvestmentsSummary() {
  const holdings = usePlannerStore((s) => s.holdings);
  const setHasHydrated = usePlannerStore((s) => s.setHasHydrated);
  const [hydrated, setHydrated] = useState(false);
  const [linked, setLinked] = useState<HoldingsSummary | null>(null);

  /**
   * Same deliberate hydration dance as InvestmentsSurface: the persist
   * callback, the already-hydrated check, and the cap all settle one flag,
   * because a store that never announces hydration must still render.
   */
  useEffect(() => {
    const settle = () => {
      setHasHydrated(true);
      setHydrated(true);
    };
    const unsub = usePlannerStore.persist.onFinishHydration(settle);
    if (usePlannerStore.persist.hasHydrated()) settle();
    const cap = window.setTimeout(settle, HYDRATION_CAP_MS);
    return () => {
      unsub();
      window.clearTimeout(cap);
    };
  }, [setHasHydrated]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/plaid/holdings");
        if (!res.ok) return;
        const json = (await res.json()) as HoldingsResponse;
        if (json.configured === false) return;
        const summary = summarizePlaidHoldings(json.holdings ?? []);
        if (!cancelled && summary.positionCount > 0) setLinked(summary);
      } catch {
        /* quiet — /money/investments surfaces the real error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const portfolio = useMemo(() => summarizePortfolio(holdings), [holdings]);
  const hasMarked = portfolio.count > 0;
  const positionCount = portfolio.count + (linked?.positionCount ?? 0);

  return (
    <section
      className="card-chrome p-5 sm:p-6"
      data-investments-summary=""
      aria-label="Investments summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-light">Investments</h2>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
            Linked and marked positions at a glance — the full portfolio lives in Investments.
            Educational guidance only: HōMI does not move money or tell you to buy or sell.
          </p>
        </div>
        <Link href="/money/investments" className="btn btn-ghost btn-sm">
          Open Investments
        </Link>
      </div>

      {!hydrated ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-surface/30" />
      ) : hasMarked || linked !== null ? (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {linked !== null && (
            <SummaryTile
              label="Linked market value"
              value={formatCurrency(linked.marketValue, { decimals: 2 })}
              color={COLORS.cyan}
            />
          )}
          {hasMarked && (
            <>
              <SummaryTile
                label="Portfolio value"
                value={formatCurrency(portfolio.marketValue, { decimals: 2 })}
                footer="Marked prices, not a live feed"
                color={COLORS.cyan}
              />
              <SummaryTile
                label="Unrealized"
                value={formatSignedGain(portfolio.gain, portfolio.gainPct)}
                color={portfolio.gain >= 0 ? COLORS.emerald : COLORS.crimson}
              />
            </>
          )}
          <SummaryTile
            label="Positions"
            value={String(positionCount)}
            footer={
              linked !== null && hasMarked
                ? `${linked.positionCount} linked · ${portfolio.count} marked`
                : linked !== null
                  ? "Verified by the linked institution"
                  : "Marked on this device"
            }
            color={COLORS.light}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-dim">
          No holdings connected yet. Link a brokerage on{" "}
          <Link href="/connections" className="text-cyan underline">
            Connections
          </Link>{" "}
          or open Investments to mark a position yourself.
        </p>
      )}
    </section>
  );
}

export default InvestmentsSummary;
