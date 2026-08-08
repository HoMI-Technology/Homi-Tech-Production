import type { ReactNode } from "react";
import type { VerdictKey } from "@/lib/brand";
import { VERDICT_META } from "@/lib/brand";
import { verdictClasses } from "@/lib/planner/verdict-ui";

/* ------------------------------------------------------------------ */
/* Shared chrome for the Plan tab (PLAN LAB) sub-panels.               */
/* ------------------------------------------------------------------ */

/** Canon verdict chip — label from VERDICT_META, tone from the E3 SSOT. */
export function VerdictChip({ verdict }: { verdict: VerdictKey }) {
  const c = verdictClasses(verdict);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${c.border} ${c.bg} ${c.text}`}
    >
      {VERDICT_META[verdict].label}
    </span>
  );
}

/** Sub-panel header: eyebrow + display title + optional right slot. */
export function PlanSectionHeader({
  eyebrow,
  title,
  caption,
  right,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan">
          {eyebrow}
        </p>
        <h3 className="mt-1.5 font-display text-[1.35rem] leading-tight tracking-tight text-light sm:text-[22px]">
          {title}
        </h3>
        {caption && (
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-dim">
            {caption}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

/** Output tile — dim label over score numeral. */
export function PlanTile({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "cyan" | "emerald" | "amber" | "crimson";
  hint?: string;
}) {
  const toneClass =
    tone === "cyan"
      ? "text-cyan"
      : tone === "emerald"
        ? "text-emerald"
        : tone === "amber"
          ? "text-amber"
          : tone === "crimson"
            ? "text-crimson"
            : "text-light";
  return (
    <div className="planner-tile px-3.5 py-3">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-dim">
        {label}
      </p>
      <p
        className={`mt-1.5 font-score text-[17px] font-semibold tracking-tight tabular-nums ${toneClass}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-dim">{hint}</p>
      )}
    </div>
  );
}

/** Panel shell for plan lab sub-surfaces. */
export function PlanPanel({ children }: { children: ReactNode }) {
  return <div className="card-chrome p-5 sm:p-6">{children}</div>;
}

/** Thin protective footer used across Plan sub-panels. */
export function PlanFooter({ lines = [] }: { lines?: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-6 border-t border-white/[0.06] pt-3">
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-[11px] leading-relaxed text-dim/80">
          {line}
        </p>
      ))}
    </div>
  );
}
