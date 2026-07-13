import type { ReactNode } from "react";

/**
 * Premium stat tile — eyebrow label, hero numeral, optional delta chip and
 * sparkline. Glass surface with a per-accent top hairline and hover lift.
 * Server-safe.
 */
export function StatTile({
  label,
  value,
  unit,
  accent = "#22d3ee",
  delta,
  deltaTone = "flat",
  footer,
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
  /** e.g. "+6 since May" */
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  footer?: string;
  spark?: ReactNode;
}) {
  const deltaClass =
    deltaTone === "up" ? "text-emerald" : deltaTone === "down" ? "text-crimson" : "text-dim";

  return (
    <div className="glass glass-hover sweep relative overflow-hidden p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }}
      />
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="score-numeral text-3xl font-bold leading-none text-light" style={{ textShadow: `0 0 28px ${accent}44` }}>
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-dim">{unit}</span>}
        </p>
        {spark && <div className="shrink-0 opacity-90">{spark}</div>}
      </div>
      {(delta || footer) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && <span className={`score-numeral font-semibold ${deltaClass}`}>{delta}</span>}
          {footer && <span className="text-dim">{footer}</span>}
        </div>
      )}
    </div>
  );
}
