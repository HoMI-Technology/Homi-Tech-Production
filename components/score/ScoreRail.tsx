import Link from "next/link";
import { COLORS, PILLARS, VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { PillarRing } from "@/components/dashboard/PillarRing";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

/**
 * Shared Decision Readiness Score rail — score numeral + public verdict word
 * + (hero only) the three pillar rings (Emotional · Financial · Timing).
 *
 * Compact (Home + Reality supporting rail): numeral + temperature ON + the
 * public verdict word once. No PillarRings. No 80–100 legend. Honest empty
 * is an em dash. Optional href tap-through (Home uses /results).
 *
 * Honesty rules:
 * - Pillars arrive as raw assessment points and render as normalized
 *   percentages, never raw points (hero only).
 * - A null pillar was never measured: the cell renders "—" with an
 *   "Unknown" accessible name, never a zero fill.
 * - A null score renders "—", never an invented number.
 * - Last AssessmentResult.score only. Never recalc in UI.
 */

export type ScoreRailPillars = {
  emotional: number | null;
  financial: number | null;
  timing: number | null;
};

export type ScoreRailReading = {
  score: number | null;
  verdict: VerdictKey | null;
  pillars: ScoreRailPillars;
};

type PillarKey = keyof ScoreRailPillars;

/** Spec §D fold order: Emotional · Financial · Timing. */
const PILLAR_ORDER: readonly PillarKey[] = ["emotional", "financial", "timing"];

const PILLAR_SHORT: Record<PillarKey, string> = {
  emotional: "Emotional",
  financial: "Financial",
  timing: "Timing",
};

function pillarMeta(key: PillarKey) {
  const brand = PILLARS.find((p) => p.key === key);
  return {
    name: brand?.name ?? PILLAR_SHORT[key],
    color: brand?.color ?? COLORS.cyan,
    max: PILLAR_MAX_POINTS[key],
  };
}

/** Normalized pillar strength 0–100, clamped; null stays unmeasured. */
function pillarPct(raw: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((raw / max) * 100)));
}

function PillarCell({
  pillarKey,
  raw,
  size,
}: {
  pillarKey: PillarKey;
  raw: number | null;
  size: number;
}) {
  const meta = pillarMeta(pillarKey);
  const labelClass = "text-3xs font-semibold uppercase tracking-[0.12em] text-dim";

  if (raw == null) {
    return (
      <div
        className="flex flex-col items-center gap-1.5"
        aria-label={`${meta.name} Unknown`}
        data-score-pillar={pillarKey}
        data-pillar-state="unknown"
      >
        <div
          aria-hidden
          className="flex items-center justify-center rounded-full border border-dashed border-white/10"
          style={{ width: size, height: size }}
        >
          <span className="score-numeral text-dim" style={{ fontSize: size * 0.24 }}>
            —
          </span>
        </div>
        <span aria-hidden className={labelClass}>
          {PILLAR_SHORT[pillarKey]}
        </span>
      </div>
    );
  }

  const pct = pillarPct(raw, meta.max);
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      aria-label={`${meta.name} ${pct} of 100`}
      data-score-pillar={pillarKey}
      data-pillar-state="measured"
    >
      <div aria-hidden>
        <PillarRing value={pct} max={100} size={size} color={meta.color} />
      </div>
      <span aria-hidden className={labelClass}>
        {PILLAR_SHORT[pillarKey]}
      </span>
    </div>
  );
}

export function ScoreRail({
  score,
  verdict,
  pillars,
  tint = COLORS.cyan,
  variant = "hero",
  href,
}: ScoreRailReading & {
  /** Instrument tint for the numeral — verdict color, crimson on hard stop. */
  tint?: string;
  /** hero = lead reading; compact = Home + Reality supporting rail. */
  variant?: "hero" | "compact";
  /** Compact tap-through. Home fold uses /results. */
  href?: string;
}) {
  const compact = variant === "compact";
  const ringSize = 72;
  const scoreLabel =
    score != null ? `Overall Decision Readiness Score ${score} out of 100` : "Decision Readiness Score Unknown";

  const numeral = (
    <span
      className={`score-numeral font-semibold tabular-nums ${
        compact ? "text-3xl" : "text-5xl sm:text-6xl"
      }`}
      style={{ color: tint, textShadow: `0 0 40px ${withAlpha(tint, 0.33)}` }}
      aria-label={scoreLabel}
    >
      {score != null ? score : "—"}
    </span>
  );

  const badge = verdict ? (
    // data-home-verdict is the Companion card-highlight hook (lib/advisor/
    // card-highlight.ts) — the attr name is a live contract, do not rename.
    <span
      data-home-verdict=""
      aria-label={`Last verdict ${VERDICT_META[verdict].label}`}
      className={compact ? "font-display italic font-normal tracking-normal" : undefined}
    >
      <VerdictBadge
        verdict={verdict}
        size={compact ? "sm" : "md"}
        hideTemperature={false}
        className={compact ? "border-0 bg-transparent px-0 py-0 font-display italic font-normal" : undefined}
      />
    </span>
  ) : null;

  const rings = (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {PILLAR_ORDER.map((key) => (
        <PillarCell key={key} pillarKey={key} raw={pillars[key]} size={ringSize} />
      ))}
    </div>
  );

  if (compact) {
    const body = (
      <section
        data-score-rail="compact"
        aria-label="Readiness score"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-white/8 bg-navy-light/40 px-4 py-3"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="text-2xs font-bold uppercase tracking-[0.16em] text-dim">
            Decision Readiness Score
          </span>
          {numeral}
          {badge}
        </div>
      </section>
    );

    if (href) {
      return (
        <Link href={href} className="block no-underline">
          {body}
        </Link>
      );
    }
    return body;
  }

  return (
    <section data-score-rail="hero" aria-label="Readiness score">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="eyebrow">Decision Readiness Score</p>
          <div className="mt-1 flex items-baseline gap-2">
            {numeral}
            {score != null ? (
              <span aria-hidden className="pb-1 text-sm font-medium tracking-wide text-dim">
                out of 100
              </span>
            ) : null}
          </div>
        </div>
        {badge ? <div className="mb-1">{badge}</div> : null}
      </div>
      <div className="mt-4">{rings}</div>
    </section>
  );
}
