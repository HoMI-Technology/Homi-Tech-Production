/**
 * Planner shell surface tokens — locked to HōMI brand (navy / cyan / glass).
 * Use these class strings so every planner panel matches product operate chrome.
 */

/** Primary instrument panel (score hero, plan labs). */
export const PLANNER_PANEL =
  "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-slate-surface/50 to-navy-light/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Nested KPI / metric tile. */
export const PLANNER_TILE =
  "rounded-xl border border-white/[0.06] bg-navy/50 px-3 py-2.5 transition-colors hover:border-cyan/20";

/** Soft strip for signals / empty rails. */
export const PLANNER_STRIP =
  "rounded-2xl border border-white/[0.06] bg-slate-surface/25 backdrop-blur-sm";

/** Pill tab rail container. */
export const PLANNER_TAB_RAIL =
  "flex w-full max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-slate-surface/40 p-1 sm:w-fit";

/** Active pill tab. */
export const PLANNER_TAB_ACTIVE =
  "bg-cyan/15 text-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]";

/** Idle pill tab. */
export const PLANNER_TAB_IDLE =
  "text-dim hover:bg-white/[0.04] hover:text-light";

/** Primary cyan CTA (load sample / suggested move). */
export const PLANNER_CTA =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan/15 px-4 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";

/** Ghost / secondary action. */
export const PLANNER_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-navy/30 px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:border-white/20 hover:text-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";
