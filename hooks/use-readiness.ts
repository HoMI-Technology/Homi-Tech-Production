/**
 * useReadinessAnchors — loads the simulator baseline + raw anchor assessment
 * for POST /api/simulator housing bands (Plans.md 6.4).
 *
 * Seeds pure baseline client-side (no engine). Server derives anchors and
 * scores. Public Lighthouse routes never have saved finance, so this stays
 * off the §11 script budget.
 */

"use client";

import { useEffect, useState } from "react";
import type { AnchorAssessment, SimulatorBaseline } from "@/lib/simulator/public";
import { seedBaseline } from "@/lib/simulator/public";
import { hasSavedFinanceState, loadFinanceState } from "@/lib/finance/store";
import { loadLocalResult } from "@/lib/assessment/storage";

export interface ReadinessContext {
  baseline: SimulatorBaseline;
  /** Latest local assessment (or null) — server derives held pillars. */
  anchorAssessment: AnchorAssessment | null;
}

export function useReadinessAnchors(): ReadinessContext | null {
  const [ctx, setCtx] = useState<ReadinessContext | null>(null);

  useEffect(() => {
    if (!hasSavedFinanceState()) return;
    const baseline = seedBaseline(null, loadFinanceState());
    const stored = loadLocalResult();
    const anchorAssessment: AnchorAssessment | null = stored
      ? {
          emotional_score: stored.result.emotional.total,
          timing_score: stored.result.timing.total,
          inputs: stored.inputs as unknown as Record<string, unknown>,
        }
      : null;
    setCtx({ baseline, anchorAssessment });
  }, []);

  return ctx;
}
