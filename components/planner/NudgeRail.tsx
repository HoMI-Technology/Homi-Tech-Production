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
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">
          Suggested move
        </p>
        <p className="text-xs text-dim">Protective nudges · not pressure</p>
      </div>
      <article className="relative overflow-hidden rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/[0.12] via-cyan/[0.05] to-transparent p-5 shadow-[inset_0_1px_0_rgba(34,211,238,0.15)] sm:p-6">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-cyan/10 blur-2xl"
          aria-hidden
        />
        {primary.chip ? (
          <p className="relative text-3xs font-bold uppercase tracking-[0.14em] text-cyan">
            {primary.chip}
          </p>
        ) : null}
        <h3 className="relative mt-1.5 font-display text-xl leading-snug tracking-tight text-light sm:text-2xl">
          {primary.title}
        </h3>
        <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-dim">
          {primary.body}
        </p>
        <button
          type="button"
          className="relative mt-5 w-full rounded-xl bg-cyan/20 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:w-auto sm:px-7"
          onClick={() => onAction(primary)}
        >
          {primary.actionLabel}
        </button>
      </article>
      {secondary.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {secondary.map((n) => (
            <article
              key={n.id}
              className="rounded-2xl border border-white/[0.07] bg-slate-surface/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              {n.chip ? (
                <p className="text-3xs font-bold uppercase tracking-wide text-dim">
                  {n.chip}
                </p>
              ) : null}
              <h4 className="mt-1 text-sm font-semibold text-light">{n.title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-dim">{n.body}</p>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-cyan hover:text-cyan/80"
                onClick={() => onAction(n)}
              >
                {n.actionLabel}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
