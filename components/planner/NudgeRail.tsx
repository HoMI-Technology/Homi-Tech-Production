"use client";

import type { BehaviorNudge } from "@/lib/planner/nudges";

export { useBehaviorNudges } from "@/components/planner/hooks";

export function NudgeRail({
  nudges,
  onAction,
}: {
  nudges: BehaviorNudge[];
  onAction: (nudge: BehaviorNudge) => void;
}) {
  if (nudges.length === 0) return null;

  const primary = nudges[0]!;
  const secondary = nudges.slice(1);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-dim">
          ✦ Suggested move
        </p>
        <p className="text-xs text-dim">Protective nudges · not pressure tactics</p>
      </div>
      <article className="rounded-xl border border-cyan/30 bg-cyan/5 p-4 sm:p-5">
        {primary.chip && (
          <p className="text-[10px] uppercase tracking-wide text-cyan">{primary.chip}</p>
        )}
        <h3 className="mt-1 font-display text-xl italic text-light">
          {primary.title}
        </h3>
        <p className="mt-2 text-sm text-dim">{primary.body}</p>
        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-cyan/20 py-2.5 text-sm font-medium text-cyan hover:bg-cyan/30 sm:w-auto sm:px-6"
          onClick={() => onAction(primary)}
        >
          {primary.actionLabel} →
        </button>
      </article>
      {secondary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {secondary.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-line bg-slate-surface/30 p-4"
            >
              {n.chip && (
                <p className="text-[10px] uppercase tracking-wide text-dim">{n.chip}</p>
              )}
              <h4 className="mt-1 text-sm font-medium text-light">{n.title}</h4>
              <p className="mt-1 text-xs text-dim">{n.body}</p>
              <button
                type="button"
                className="mt-2 text-xs text-cyan hover:underline"
                onClick={() => onAction(n)}
              >
                {n.actionLabel}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
