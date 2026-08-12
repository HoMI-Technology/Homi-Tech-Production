"use client";

/**
 * Mobile Track bottom strip — dogfood → Production PR #3.
 * Compact LINKED CASH / PORTFOLIO / OPEN BILLS + Plan / Wealth / Banks.
 * Embedded Money · Track only; md+ hidden; honors prefers-reduced-motion.
 */

import Link from "next/link";
import { fmtUsd0, usePlannerReality } from "@/components/planner/hooks";
import { usePlannerStore } from "@/lib/planner/store";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type TrackBottomStripSection = "wealth" | "banking";

function honestMoney(hasSource: boolean, amount: number): string {
  return hasSource ? fmtUsd0(amount) : "—";
}

export function TrackBottomStrip({
  onSection,
}: {
  onSection: (section: TrackBottomStripSection) => void;
}) {
  const accounts = usePlannerStore((s) => s.accounts);
  const holdings = usePlannerStore((s) => s.holdings);
  const bills = usePlannerStore((s) => s.bills);
  const { cash, portfolio, billsOpen } = usePlannerReality();
  const reducedMotion = useReducedMotion();

  const metrics = [
    {
      label: "Linked cash",
      value: honestMoney(accounts.length > 0, cash),
      tone: "text-cyan",
    },
    {
      label: "Portfolio",
      value: honestMoney(holdings.length > 0, portfolio.marketValue),
      tone: "text-cyan",
    },
    {
      label: "Open bills",
      value: honestMoney(bills.length > 0, billsOpen),
      tone: "text-amber",
    },
  ] as const;

  return (
    <>
      {/* Spacer so fixed strip does not cover the last planner rows on mobile. */}
      <div className="h-[4.75rem] md:hidden" aria-hidden />
      <nav
        data-testid="track-bottom-strip"
        aria-label="Track quick metrics"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-white/[0.1] bg-navy/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden data-[reduced-motion=false]:transition-[transform,opacity] data-[reduced-motion=false]:duration-200 data-[reduced-motion=false]:ease-out"
      >
        <div className="mx-auto flex max-w-3xl items-stretch gap-2 px-3 pt-2">
          <div
            className="grid min-w-0 flex-1 grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.06]"
            role="group"
            aria-label="Track balances"
          >
            {metrics.map((m) => (
              <div key={m.label} className="min-w-0 bg-navy/90 px-1.5 py-1.5 text-center">
                <p className="truncate text-3xs font-semibold uppercase tracking-[0.1em] text-dim">
                  {m.label}
                </p>
                <p
                  className={`mt-0.5 truncate font-score text-sm tabular-nums leading-none tracking-tight ${m.tone}`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div
            className="flex shrink-0 items-center gap-1"
            role="group"
            aria-label="Track quick links"
          >
            <Link
              href="/money/plan"
              className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-cyan transition-colors hover:bg-cyan/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              Plan
            </Link>
            <button
              type="button"
              onClick={() => onSection("wealth")}
              className="rounded-md border border-white/15 bg-navy/60 px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-light/90 transition-colors hover:border-white/25 hover:text-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              Wealth
            </button>
            <button
              type="button"
              onClick={() => onSection("banking")}
              className="rounded-md border border-white/15 bg-navy/60 px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-light/90 transition-colors hover:border-white/25 hover:text-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              Banks
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
