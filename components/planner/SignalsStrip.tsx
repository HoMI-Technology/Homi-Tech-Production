"use client";

import type { PlannerSignal } from "@/lib/planner/signals";

const SEVERITY_BORDER: Record<PlannerSignal["severity"], string> = {
  crimson: "border-crimson/35 bg-crimson/[0.07]",
  amber: "border-amber/35 bg-amber/[0.07]",
  yellow: "border-yellow/35 bg-yellow/[0.07]",
  cyan: "border-cyan/35 bg-cyan/[0.07]",
  emerald: "border-emerald/35 bg-emerald/[0.07]",
};

const SEVERITY_DOT: Record<PlannerSignal["severity"], string> = {
  crimson: "bg-crimson",
  amber: "bg-amber",
  yellow: "bg-yellow",
  cyan: "bg-cyan",
  emerald: "bg-emerald",
};

export function SignalsStrip({
  signals,
  onDismiss,
  onAction,
}: {
  signals: PlannerSignal[];
  onDismiss: (id: string) => void;
  onAction: (signal: PlannerSignal) => void;
}) {
  if (signals.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-slate-surface/25 px-4 py-3.5 backdrop-blur-sm">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">Always-on signals</p>
        <p className="mt-1.5 text-sm text-dim">No active signals - keep numbers honest.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">Always-on signals</p>
        <p className="text-xs text-dim">{signals.length} active · stress · cash · path</p>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {signals.map((s) => (
          <article
            key={s.id}
            className={`min-w-[248px] max-w-[300px] shrink-0 rounded-2xl border p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${SEVERITY_BORDER[s.severity]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[s.severity]}`}
                    aria-hidden
                  />
                  {s.meta ? (
                    <p className="truncate text-3xs font-semibold uppercase tracking-wide text-dim">
                      {s.meta}
                    </p>
                  ) : null}
                </div>
                <h3 className="mt-1 text-sm font-semibold leading-snug text-light">{s.title}</h3>
              </div>
              <button
                type="button"
                aria-label={`Dismiss ${s.title}`}
                className="shrink-0 rounded-md px-1.5 text-base leading-none text-dim transition-colors hover:bg-white/5 hover:text-light"
                onClick={() => onDismiss(s.id)}
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-dim">{s.body}</p>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-cyan transition-colors hover:text-cyan/80"
              onClick={() => onAction(s)}
            >
              {s.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
