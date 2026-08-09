import type { ReactNode } from "react";

import { COLORS, withAlpha } from "@/lib/brand";
import { ToolBackLink } from "@/components/tools/ToolBackLink";

/**
 * Shared operate chrome for every calculator page.
 * Default back target is the **public** hub so anonymous SEO traffic is never
 * auth-walled. Decide arrivals pass `?from=money` (or an explicit backHref).
 */
export function ToolShell({
  title,
  description,
  eyebrow = "Calculator",
  children,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <ToolBackLink backHref={backHref} backLabel={backLabel} />

      <p className="eyebrow mt-5">{eyebrow === "Calculator" ? "Money · lens" : eyebrow}</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-dim">{description}</p>

      <div className="mt-8">{children}</div>
    </div>
  );
}

/**
 * Dominant result panel — one primary metric owns the right column.
 * Use score-numeral for the value; color via brand tokens only.
 */
export function ToolResultHero({
  label,
  value,
  color,
  footer,
  badge,
  children,
}: {
  label: string;
  value: ReactNode;
  color?: string;
  footer?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="glass relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40"
        style={{
          background: color
            ? `radial-gradient(circle, ${color}33, transparent 70%)`
            : `radial-gradient(circle, ${withAlpha(COLORS.cyan, 0.18)}, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-dim">{label}</p>
          {badge}
        </div>
        <div
          className="score-numeral mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
          style={color ? { color, textShadow: `0 0 40px ${color}44` } : undefined}
        >
          {value}
        </div>
        {footer && <div className="mt-3 text-sm text-dim">{footer}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

/** Two-column operate layout: inputs left, results right. */
export function ToolGrid({ inputs, results }: { inputs: ReactNode; results: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
      <div className="glass space-y-5 p-6">{inputs}</div>
      <div className="space-y-6">{results}</div>
    </div>
  );
}

/** Secondary metric tile inside result columns. */
export function ToolMetric({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-surface/60 bg-navy-light/40 px-4 py-3">
      <p className="text-xs text-dim">{label}</p>
      <p
        className="score-numeral mt-1 text-xl font-bold text-light"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-dim/80">{hint}</p>}
    </div>
  );
}
