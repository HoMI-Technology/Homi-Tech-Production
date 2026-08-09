/**
 * Conversion funnel for the owner analytics dashboard — pure markup/CSS,
 * server-safe, no chart library. Each step is a gradient bar sized against
 * the top step, with distinct users, share of top step, and step-to-step
 * conversion. Matches the quiet premium bar language of BarSeries and the
 * verdict-distribution rows on the admin overview.
 */

export interface FunnelSeriesStep {
  /** Display label, e.g. "Assessment started". */
  label: string;
  /** Raw event name, shown in mono for traceability. */
  event: string;
  users: number;
  occurrences: number;
}

import { COLORS } from "@/lib/brand";

const STEP_COLOR = COLORS.cyan;

export function FunnelSeries({ steps }: { steps: FunnelSeriesStep[] }) {
  const top = Math.max(1, ...steps.map((s) => s.users));
  const allZero = steps.every((s) => s.users === 0);

  if (allZero) {
    return (
      <p className="py-10 text-center text-sm text-dim">
        No funnel events recorded in this window yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].users : null;
        const widthPct = Math.max(2, Math.round((step.users / top) * 100));
        const ofTop = Math.round((step.users / top) * 100);
        const conversion =
          prev !== null && prev > 0 ? Math.min(100, Math.round((step.users / prev) * 100)) : null;
        return (
          <li key={step.event}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="score-numeral shrink-0 text-xs text-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate font-semibold text-light">{step.label}</span>
                <span className="hidden truncate font-mono text-2xs text-dim/70 sm:inline">
                  {step.event}
                </span>
              </span>
              <span className="score-numeral shrink-0 text-dim">
                {step.users.toLocaleString()}
                <span className="text-dim/60"> · {ofTop}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${STEP_COLOR}55, ${STEP_COLOR})`,
                  boxShadow: `0 0 12px ${STEP_COLOR}44`,
                }}
              />
            </div>
            {conversion !== null && (
              <p className="mt-1 text-right text-2xs text-dim">{conversion}% from previous step</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
