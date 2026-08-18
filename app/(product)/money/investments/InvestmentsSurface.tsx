"use client";

/**
 * Money · Invest — the portfolio tab, promoted out of Track · Wealth.
 *
 * components/planner/wealth/PortfolioPanel already is the educational holdings
 * instrument this route was specified to be: manual holdings, marked (not live)
 * prices, allocation donut, unrealized gain, all persisted on-device through
 * the planner store. Rebuilding it here would have given the product two
 * portfolios that disagree about the same money, so this surface reuses it.
 *
 * The hydration dance is PlannerApp's, and it is deliberate: the persist
 * callback, the already-hydrated check, and the timeout all settle the same
 * flag, because a store that never announces hydration must still render.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PlaidHoldingsPanel } from "@/components/money/PlaidHoldingsPanel";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { usePlannerStore } from "@/lib/planner/store";
import { hydratePlannerFromLedger } from "@/lib/planner/ledger-bridge";

const PortfolioPanel = dynamic(() => import("@/components/planner/wealth/PortfolioPanel"), {
  ssr: false,
  loading: () => <ProductLoadingSkeleton label="Loading portfolio" rows={3} />,
});

/** Backstop for a persist layer that never fires its hydration callback. */
const HYDRATION_CAP_MS = 800;

export function InvestmentsSurface() {
  const setHasHydrated = usePlannerStore((s) => s.setHasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const settle = () => {
      setHasHydrated(true);
      setReady(true);
      hydratePlannerFromLedger();
    };
    const unsub = usePlannerStore.persist.onFinishHydration(settle);
    if (usePlannerStore.persist.hasHydrated()) settle();
    const cap = window.setTimeout(settle, HYDRATION_CAP_MS);
    return () => {
      unsub();
      window.clearTimeout(cap);
    };
  }, [setHasHydrated]);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Money · invest</p>
        <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">
          What your holdings are worth
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
          Linked brokerage positions when you have connected an institution,
          plus optional manual marks. Educational guidance only — never an
          instruction to buy or sell.
        </p>
      </header>

      <PlaidHoldingsPanel />

      {ready ? <PortfolioPanel /> : <ProductLoadingSkeleton label="Loading portfolio" rows={3} />}

      <footer className="border-t border-white/[0.06] pt-6">
        <p className="text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
