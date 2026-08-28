/**
 * ScoreImpactCard — reusable "what would this plan do to my Decision Readiness Score?"
 * preview for calculator tools (Decision Lab).
 *
 * The card reads the last stored assessment as the baseline, applies the
 * tool's projection overrides, and asks the server (/api/scoring via
 * lib/tools/score-preview) to rescore. It is honest by construction:
 *
 * - No assessment on file → an empty state pointing at /assessment, never
 *   a preview built on placeholders.
 * - The server is unreachable / refuses → an error line, never a number.
 * - Every rendered preview carries SCORE_IMPACT_PROJECTED_LABEL verbatim.
 * - The preview is never persisted — re-taking the assessment is the only
 *   way to move the real score.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COLORS, VERDICT_META } from "@/lib/brand";
import type { AssessmentInputs } from "@/lib/scoring/public";
import { loadLocalResult } from "@/lib/assessment/storage";
import {
  previewScoreImpact,
  SCORE_IMPACT_PROJECTED_LABEL,
  type ScoreImpactPreview,
  type ScoreProjectionOverrides,
} from "@/lib/tools/score-preview";

/**
 * Builds the projection from the stored baseline inputs. Return null when
 * the tool has nothing grounded to project — the card renders nothing.
 * Pages must memoize this (useCallback) keyed on the inputs it reads.
 */
export type BuildScoreOverrides = (
  baseline: AssessmentInputs,
) => ScoreProjectionOverrides | null;

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; preview: ScoreImpactPreview }
  | { status: "error" };

/** Sliders and inputs stream changes; the scoring route is rate-limited. */
const DEBOUNCE_MS = 700;

export function ScoreImpactCard({
  title = "Score Impact Preview",
  note,
  buildOverrides,
  size = "default",
}: {
  title?: string;
  /** One honest sentence about the scenario being projected. */
  note?: string;
  buildOverrides: BuildScoreOverrides;
  /**
   * "compact" is for the inline Money · Decide panels: it drops the nested
   * glass card (the panel already is one) for the panels' inner-card idiom
   * and tightens type/spacing. The honesty contract is identical.
   */
  size?: "default" | "compact";
}) {
  const compact = size === "compact";
  const containerClass = compact
    ? "rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
    : "glass p-6";
  const titleClass = compact ? "text-sm font-semibold text-light" : "font-semibold text-light";
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  // null = still mounting; "none" = no stored assessment; "skip" = overrides
  // returned null so the card hides itself.
  const [mode, setMode] = useState<"mounting" | "none" | "skip" | "run">("mounting");
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const timer = setTimeout(() => {
      const stored = loadLocalResult();
      if (!stored) {
        if (seq.current === id) setMode("none");
        return;
      }
      const overrides = buildOverrides(stored.inputs);
      if (!overrides) {
        if (seq.current === id) setMode("skip");
        return;
      }
      setMode("run");
      setState({ status: "loading" });
      previewScoreImpact(stored.inputs, stored.result, overrides)
        .then((preview) => {
          if (seq.current === id) setState({ status: "ready", preview });
        })
        .catch(() => {
          if (seq.current === id) setState({ status: "error" });
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [buildOverrides]);

  if (mode === "mounting" || mode === "skip") return null;

  if (mode === "none") {
    return (
      <div className="glass p-6">
        <h2 className="font-semibold text-light">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          Take the assessment once and every tool can show how a plan like this would move your
          Decision Readiness Score.
        </p>
        <Link
          href="/assessment"
          className="mt-3 inline-block text-xs font-medium text-cyan hover:underline"
        >
          Take the assessment →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-light">{title}</h2>
        <span className="rounded-full border border-cyan/25 bg-cyan/5 px-2.5 py-0.5 text-xs font-medium text-cyan">
          {SCORE_IMPACT_PROJECTED_LABEL}
        </span>
      </div>
      {note && <p className="mt-2 text-xs leading-relaxed text-dim/80">{note}</p>}

      {state.status === "loading" && <p className="mt-4 text-sm text-dim">Projecting…</p>}

      {state.status === "error" && (
        <p className="mt-4 text-sm text-dim">
          The scoring service couldn&apos;t project this plan right now. Your plan above still
          stands — try again in a moment.
        </p>
      )}

      {state.status === "ready" && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ScoreChip
            label="Today"
            score={state.preview.baseline.score}
            verdict={state.preview.baseline.verdict}
          />
          <span aria-hidden className="text-lg text-dim">
            →
          </span>
          <ScoreChip
            label="If you follow through"
            score={state.preview.projected.score}
            verdict={state.preview.projected.verdict}
          />
          <DeltaBadge delta={state.preview.delta} />
        </div>
      )}
    </div>
  );
}

function ScoreChip({
  label,
  score,
  verdict,
}: {
  label: string;
  score: number;
  verdict: keyof typeof VERDICT_META;
}) {
  const meta = VERDICT_META[verdict];
  return (
    <div>
      <p className="text-xs text-dim">{label}</p>
      <p className="score-numeral mt-1 text-2xl font-bold" style={{ color: meta.color }}>
        {score}
      </p>
      <p className="text-xs font-semibold tracking-wide" style={{ color: meta.color }}>
        {meta.label}
      </p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const color = delta > 0 ? COLORS.emerald : delta < 0 ? COLORS.crimson : COLORS.dim;
  const text = delta > 0 ? `+${delta}` : `${delta}`;
  return (
    <span
      className="score-numeral rounded-full border px-3 py-1 text-sm font-bold"
      style={{ borderColor: `${color}55`, color }}
    >
      {text} pts
    </span>
  );
}
