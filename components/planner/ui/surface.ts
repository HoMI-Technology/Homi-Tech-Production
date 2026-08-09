/**
 * Planner shell surface tokens — locked to HōMI brand (navy / cyan / glass).
 * Prefer CSS classes from globals (`.card-chrome`, `.planner-panel`) when
 * markup is static; use these strings for dynamic className composition.
 */

/** Primary instrument panel (score hero, plan labs, wealth cards). */
export const PLANNER_PANEL =
  "card-chrome relative overflow-hidden p-5 sm:p-6";

/** Nested KPI / metric tile. */
export const PLANNER_TILE =
  "planner-tile px-3 py-2.5";

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

/** Primary cyan CTA. */
export const PLANNER_CTA =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan/15 px-4 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";

/** Solid primary CTA (high emphasis). */
export const PLANNER_CTA_SOLID =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-navy shadow-glow-cyan transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";

/** Ghost / secondary action. */
export const PLANNER_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-navy/30 px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:border-white/20 hover:text-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";

/** Form control. */
export const PLANNER_INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-navy/70 px-3 py-2 text-sm text-light outline-none transition-colors placeholder:text-dim/60 focus:border-cyan/50";
