"use client";

import { useEffect, useState } from "react";
import type { StoredAssessment } from "@/lib/assessment/storage";
import { COLORS } from "@/lib/brand";
import { buildClientDataQuality } from "@/lib/readiness/collect-data-quality";
import type { DataQualityConfidence } from "@/lib/readiness/confidence";
import {
  buildReasoningTrail,
  type ReasoningTrailItem,
  type ReasoningTrailKind,
} from "@/lib/readiness/reasoning-trail";

const KIND_DOT: Record<ReasoningTrailKind, string> = {
  verdict: COLORS.cyan,
  confidence: COLORS.yellow,
  hard_stop: COLORS.crimson,
  pillar_blocker: COLORS.amber,
  movement: COLORS.emerald,
  milestone: COLORS.emerald,
  caveat: COLORS.dim,
  bridge: COLORS.dim,
};

function TrailRow({ item }: { item: ReasoningTrailItem }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-light">
      <span
        aria-hidden="true"
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: KIND_DOT[item.kind] }}
      />
      <span className={item.kind === "bridge" || item.kind === "caveat" ? "text-dim" : undefined}>
        {item.line}
      </span>
    </li>
  );
}

/**
 * ReasoningTrail v1 on /results — confidence + pillar blockers + optional
 * score movement (magnitude bands). Explains the read; does not rebuild Path.
 * Evolves the ScoreExplanation precursor into an always-on protective trail.
 */
export function ReasoningTrail({ stored }: { stored: StoredAssessment }) {
  const [confidence, setConfidence] = useState<DataQualityConfidence | null>(null);

  useEffect(() => {
    setConfidence(buildClientDataQuality(stored.result.score, stored.completedAt));
  }, [stored.result.score, stored.completedAt]);

  // First paint can omit confidence; trail still explains verdict / blockers.
  const trail = buildReasoningTrail({ stored, confidence });

  return (
    <section
      className="glass mt-8 p-6 sm:p-8"
      aria-label="Reasoning trail"
      data-reasoning-trail="v1"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-dim">{trail.title}</p>
      <p className="mt-2 font-display text-xl font-semibold text-light">{trail.lead}</p>
      <ol className="mt-4 space-y-2.5">
        {trail.items.map((item) => (
          <TrailRow key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}
