/**
 * useReadinessAnchors — loads the simulator baseline + anchors for the
 * readiness band. Mount-only, SSR-safe. Null when the user has no saved
 * finance state (the band shows nothing rather than a verdict on air).
 */

"use client";

import { useEffect, useState } from "react";
import { seedBaseline, deriveAnchors, type SimulatorAnchors, type SimulatorBaseline } from "@/lib/simulator";
import { hasSavedFinanceState, loadFinanceState } from "@/lib/finance/store";
import { loadLocalResult } from "@/lib/assessment/storage";

export interface ReadinessContext {
  baseline: SimulatorBaseline;
  anchors: SimulatorAnchors;
}

export function useReadinessAnchors(): ReadinessContext | null {
  const [ctx, setCtx] = useState<ReadinessContext | null>(null);

  useEffect(() => {
    if (!hasSavedFinanceState()) return;
    const baseline = seedBaseline(null, loadFinanceState());
    const stored = loadLocalResult();
    const anchors = deriveAnchors(
      stored
        ? {
            emotional_score: stored.result.emotional.total,
            timing_score: stored.result.timing.total,
            inputs: stored.inputs as unknown as Record<string, unknown>,
          }
        : null,
    );
    setCtx({ baseline, anchors });
  }, []);

  return ctx;
}
