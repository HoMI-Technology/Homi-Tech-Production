/**
 * ReasoningTrail v1 — explainability builder (Companion / lib consumers).
 * UI mount on /results was removed in F8; this module stays for explain payloads.
 *
 * Composes E4 data-quality confidence, pillar blockers, hard stops, and
 * (when a previous assessment exists) ScoreExplanation magnitude bands into
 * one short protective trail. Never quotes WEIGHTS/curves; never calls
 * computeScore / lib/scoring/engine*.
 *
 * Path to Ready sequences action; this trail only explains the read.
 */

import { buildScoreExplanation, type MagnitudeBand } from "@/lib/advisor/explain";
import type { StoredAssessment } from "@/lib/assessment/storage";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS, type AssessmentResult, type HardStopCode } from "@/lib/scoring/public";
import {
  HARD_STOP_ORDER,
  bindingConstraintLabel,
  type PathReasonCode,
} from "@/lib/readiness/path";
import type { DataQualityBand, DataQualityConfidence } from "@/lib/readiness/confidence";

export type ReasoningTrailKind =
  | "verdict"
  | "confidence"
  | "hard_stop"
  | "pillar_blocker"
  | "movement"
  | "milestone"
  | "caveat"
  | "bridge";

export interface ReasoningTrailItem {
  id: string;
  kind: ReasoningTrailKind;
  /** Short protective line — no invented money, no formula leak. */
  line: string;
  /** Magnitude band when the item is a movement or pillar-gap read. */
  band?: MagnitudeBand | null;
}

export interface ReasoningTrail {
  /** Section eyebrow. */
  title: string;
  /** One-line framing under the title. */
  lead: string;
  items: ReasoningTrailItem[];
}

const PILLAR_NAMES = {
  financial: "Financial Reality",
  emotional: "Emotional Truth",
  timing: "Perfect Timing",
} as const;

type PillarKey = keyof typeof PILLAR_NAMES;

const CONFIDENCE_LINE: Record<DataQualityBand, string> = {
  high: "Data quality is high — assessment is current and a money picture backs the read.",
  medium: "Data quality is medium — stand behind the score cautiously until gaps close.",
  low: "Data quality is low — treat this as a partial read until freshness and completeness improve.",
};

/** Gap from pillar max → magnitude band (display honesty only; not scoring weights). */
export function pillarGapBand(pctOfMax: number): MagnitudeBand {
  const safe = Number.isFinite(pctOfMax) ? Math.max(0, Math.min(100, pctOfMax)) : 0;
  const deficit = 100 - safe;
  if (deficit <= 15) return "small";
  if (deficit <= 35) return "moderate";
  return "large";
}

function pillarPcts(result: AssessmentResult): Record<PillarKey, number> {
  return {
    financial: (result.financial.total / PILLAR_MAX_POINTS.financial) * 100,
    emotional: (result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100,
    timing: (result.timing.total / PILLAR_MAX_POINTS.timing) * 100,
  };
}

function orderedHardStops(result: AssessmentResult): HardStopCode[] {
  const present = new Set(result.hardStops.map((h) => h.code));
  return HARD_STOP_ORDER.filter((code) => present.has(code));
}

function softPillarBlocker(result: AssessmentResult): {
  key: PillarKey;
  band: MagnitudeBand;
  reasonCode: PathReasonCode;
} | null {
  if (result.verdict === "READY" && result.hardStops.length === 0) return null;
  const pcts = pillarPcts(result);
  const ranked = (Object.keys(pcts) as PillarKey[])
    .map((key) => ({ key, pct: pcts[key] }))
    .sort((a, b) => a.pct - b.pct);
  const weakest = ranked[0];
  if (!weakest) return null;
  const reasonCode: PathReasonCode =
    weakest.key === "financial"
      ? "PILLAR_FINANCIAL"
      : weakest.key === "emotional"
        ? "PILLAR_EMOTIONAL"
        : "PILLAR_TIMING";
  return {
    key: weakest.key,
    band: pillarGapBand(weakest.pct),
    reasonCode,
  };
}

function verdictLead(verdict: VerdictKey, score: number): string {
  const label = VERDICT_META[verdict].label;
  switch (verdict) {
    case "READY":
      return `Score ${score} · ${label}. The three pillars are aligned enough to proceed with care.`;
    case "ALMOST_THERE":
      return `Score ${score} · ${label}. Close — name the remaining gap before you stretch.`;
    case "BUILD_FIRST":
      return `Score ${score} · ${label}. Not failure — a map of what still needs footing.`;
    case "NOT_YET":
      return `Score ${score} · ${label}. Protection first; the number waits behind the binding constraint.`;
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

function gapSizePhrase(band: MagnitudeBand): string {
  switch (band) {
    case "small":
      return "a small gap";
    case "moderate":
      return "a moderate gap";
    case "large":
      return "a large gap";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export type BuildReasoningTrailInput = {
  stored: StoredAssessment;
  /** E4 confidence — omit only in tests that isolate other branches. */
  confidence?: Pick<DataQualityConfidence, "band" | "pathMode" | "reasons" | "isDampened"> | null;
};

/**
 * Pure trail construction from assessment + optional E4 confidence.
 * Always returns a trail (first assessments included) — never invents a prior story.
 */
export function buildReasoningTrail(input: BuildReasoningTrailInput): ReasoningTrail {
  const { stored, confidence = null } = input;
  const { result } = stored;
  const items: ReasoningTrailItem[] = [];

  items.push({
    id: "verdict",
    kind: "verdict",
    line: verdictLead(result.verdict, result.score),
  });

  if (confidence) {
    const modeBit =
      confidence.pathMode === "assessment_plus_finance"
        ? "Assessment + finance mode."
        : "Assessment-only mode.";
    const dampenBit = confidence.isDampened
      ? " A cautious context view may sit below the raw score until gaps close — raw stays canonical."
      : "";
    items.push({
      id: `confidence-${confidence.band}`,
      kind: "confidence",
      line: `${CONFIDENCE_LINE[confidence.band]} ${modeBit}${dampenBit}`,
    });
  }

  const stops = orderedHardStops(result);
  for (const code of stops) {
    items.push({
      id: `hard-stop-${code}`,
      kind: "hard_stop",
      line: `Protective stop active: ${bindingConstraintLabel(code)}. Clear this before trusting the number alone.`,
    });
  }

  // Soft pillar blocker only when no hard stop is already naming the binding constraint.
  if (stops.length === 0) {
    const blocker = softPillarBlocker(result);
    if (blocker) {
      const name = PILLAR_NAMES[blocker.key];
      items.push({
        id: `pillar-${blocker.key}`,
        kind: "pillar_blocker",
        band: blocker.band,
        line: `${name} is the furthest from ready — ${gapSizePhrase(blocker.band)}. Path to Ready starts here.`,
      });
    }
  } else {
    // Still name the softest pillar as context, not as the binding plan.
    const blocker = softPillarBlocker(result);
    if (blocker) {
      items.push({
        id: `pillar-${blocker.key}`,
        kind: "pillar_blocker",
        band: blocker.band,
        line: `After the protective stop, ${PILLAR_NAMES[blocker.key]} shows ${gapSizePhrase(blocker.band)} versus the other pillars.`,
      });
    }
  }

  const explanation = buildScoreExplanation(stored);
  if (explanation) {
    if (explanation.milestone) {
      items.push({
        id: "milestone",
        kind: "milestone",
        line: explanation.milestone.line,
      });
    }
    const movers = explanation.movements.filter((m) => m.direction !== "flat");
    for (const m of movers.slice(0, 2)) {
      items.push({
        id: `movement-${m.key}`,
        kind: "movement",
        band: m.band,
        line: `Since last time: ${m.line}`,
      });
    }
    if (movers.length === 0 && explanation.headline) {
      items.push({
        id: "movement-held",
        kind: "movement",
        band: null,
        line: `Since last time: ${explanation.headline}`,
      });
    }
    for (const [i, caveat] of explanation.caveats.entries()) {
      // Hard-stop caveats are already covered by trail hard_stop items.
      if (/hard stop/i.test(caveat)) continue;
      items.push({
        id: `caveat-${i}`,
        kind: "caveat",
        line: caveat,
      });
    }
  }

  items.push({
    id: "bridge",
    kind: "bridge",
    line: "Path to Ready below sequences the protective next steps — this trail only explains the read.",
  });

  return {
    title: "How we read this",
    lead: "Honest magnitude and blockers — never the scoring formula.",
    items,
  };
}
