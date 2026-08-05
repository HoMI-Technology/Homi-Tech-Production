"use client";

import type { PlannerSignal } from "@/lib/planner/signals";

const SEVERITY_BORDER: Record<PlannerSignal["severity"], string> = {
  crimson: "border-crimson/40 bg-crimson/5",
  amber: "border-amber/40 bg-amber/5",
  yellow: "border-yellow/40 bg-yellow/5",
  cyan: "border-cyan/40 bg-cyan/5",
  emerald: "border-emerald/40 bg-emerald/5",
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
      <section className="rounded-xl border border-line/60 bg-slate-surface/20 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-dim">Always-on signals</p>
        <p className="mt-1 text-sm text-dim">No active signals — keep numbers honest.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-dim">Always-on signals</p>
        <p className="text-xs text-dim">
          {signals.length} active · stress · cash · path
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {signals.map((s) => (
          <article
            key={s.id}
            className={`min-w-[240px] max-w-[280px] shrink-0 rounded-xl border p-3 ${SEVERITY_BORDER[s.severity]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {s.meta && (
                  <p className="text-[10px] uppercase tracking-wide text-dim">{s.meta}</p>
                )}
                <h3 className="text-sm font-medium text-light">{s.title}</h3>
              </div>
              <button
                type="button"
                aria-label={`Dismiss ${s.title}`}
                className="text-dim hover:text-light"
                onClick={() => onDismiss(s.id)}
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-dim">{s.body}</p>
            <button
              type="button"
              className="mt-3 text-xs font-medium text-cyan hover:underline"
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
