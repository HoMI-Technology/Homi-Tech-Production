"use client";

import { motion } from "framer-motion";
import type { FinanceNudge } from "@/lib/advisor/fallback";

const NUDGE_TITLE: Record<string, string> = {
  debt: "Pay down high-rate debt first",
  savings: "Build the emergency runway",
  spending: "Close the monthly cash-flow gap",
  goal: "Lock in the healthy rhythm",
};

const NUDGE_KIND_LABEL: Record<string, string> = {
  debt: "Debt",
  savings: "Savings",
  spending: "Spending",
  goal: "Goal",
};

function nudgeTitle(nudge: FinanceNudge): string {
  return NUDGE_TITLE[nudge.type] ?? "Suggested move";
}

function nudgeKindLabel(nudge: FinanceNudge): string {
  return NUDGE_KIND_LABEL[nudge.type] ?? nudge.type;
}

/**
 * Primary behavioral nudge card plus up to two secondary nudges. Protective,
 * not pressure — each suggestion points at one sequenced action the user can
 * take next.
 */
export function NudgeRail({
  nudges,
  onAction,
}: {
  nudges: FinanceNudge[];
  onAction: (nudge: FinanceNudge) => void;
}) {
  if (!nudges.length) return null;
  const primary = nudges[0];
  const rest = nudges.slice(1, 3);

  return (
    <section
      className="glass relative overflow-hidden p-4 sm:p-5"
      aria-label="Behavior nudges"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cyan">
          <SparklesIcon />
          Suggested move
        </p>
        <p className="text-[0.65rem] text-dim">Protective nudges · not pressure tactics</p>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <article className="flex min-w-0 flex-1 flex-col rounded-xl border border-cyan/30 bg-cyan/8 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan/35 bg-navy/50 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-cyan">
              {nudgeKindLabel(primary)}
            </span>
          </div>
          <h3 className="mt-2 font-display text-base font-semibold text-light sm:text-lg">
            {nudgeTitle(primary)}
          </h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-light/85">
            {primary.message}
          </p>
          {primary.action && (
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 sm:w-auto"
              onClick={() => onAction(primary)}
            >
              {primary.action.label}
              <ArrowRightIcon />
            </button>
          )}
        </article>

        {rest.length > 0 && (
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-md lg:grid-cols-1">
            {rest.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onAction(n)}
                className="group rounded-xl border border-slate-surface/60 bg-navy/45 p-3.5 text-left transition-colors hover:border-cyan/35 hover:bg-navy/65"
              >
                <span className="text-[0.6rem] font-bold uppercase tracking-wide text-dim">
                  {nudgeKindLabel(n)}
                </span>
                <p className="mt-1 text-sm font-semibold text-light group-hover:text-cyan">
                  {nudgeTitle(n)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">
                  {n.message}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 01-.367-.367L.416 6.079A2 2 0 011.937 4.5l6.135-1.582a.5.5 0 01.367-.367L9.062.416a2 2 0 013.876 0l1.582 6.135a.5.5 0 01.367.367l6.135 1.582a2 2 0 010 3.876l-6.135 1.582a.5.5 0 01-.367.367l-1.582 6.135a2 2 0 01-3.876 0z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <path d="M4 18v3" />
      <path d="M5.5 19.5h-3" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
