"use client";

import { buildScoreExplanation } from "@/lib/advisor/explain";
import type { StoredAssessment } from "@/lib/assessment/storage";
import { COLORS } from "@/lib/brand";

const DIRECTION_COLOR: Record<string, string> = {
  up: COLORS.emerald,
  down: COLORS.yellow,
  flat: COLORS.dim,
};

/**
 * "Why did this change" — the explainability card on /results. Renders only
 * when there is a previous assessment to compare against. Movement is shown
 * in magnitude bands, never numeric weights; caveats state staleness and
 * hard stops honestly. The Companion receives the same explanation in its
 * context, so this card and the chat always tell one story.
 */
export function ScoreExplanation({ stored }: { stored: StoredAssessment }) {
  const explanation = buildScoreExplanation(stored);
  if (!explanation) return null;

  return (
    <div className="glass mt-8 p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-dim">Why did this change</p>
      <p className="mt-2 font-display text-xl font-semibold text-light">{explanation.headline}</p>

      {explanation.milestone && (
        <p
          className="mt-3 border-l-2 pl-3 text-sm font-medium text-light"
          style={{
            borderColor: explanation.milestone.direction === "up" ? COLORS.emerald : COLORS.yellow,
          }}
        >
          {explanation.milestone.line}
        </p>
      )}

      {explanation.movements.length > 0 && (
        <ul className="mt-4 space-y-2">
          {explanation.movements.map((m) => (
            <li key={m.key} className="flex items-start gap-2.5 text-sm text-light">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: DIRECTION_COLOR[m.direction] }}
              />
              {m.line}
            </li>
          ))}
        </ul>
      )}

      {explanation.caveats.length > 0 && (
        <div className="mt-4 border-t border-slate-surface/60 pt-4">
          {explanation.caveats.map((c) => (
            <p key={c} className="text-sm text-dim">
              {c}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
