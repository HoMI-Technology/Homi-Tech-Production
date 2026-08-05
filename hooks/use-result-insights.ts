/**
 * Resolve insight copy for /results and /plan without importing the scoring
 * engine on the client (Plans.md 6.3 / F.15).
 *
 * Preference order:
 * 1. Stored insights from the scoring response (or DB row)
 * 2. One-shot backfill via POST /api/scoring for legacy local payloads
 * 3. Empty strings while loading / if backfill fails (never crash)
 */

"use client";

import { useEffect, useState } from "react";
import type { StoredAssessment, StoredInsights } from "@/lib/assessment/storage";
import { fetchServerScore } from "@/lib/scoring/client-score";

export function useResultInsights(stored: StoredAssessment | null | undefined): {
  insights: StoredInsights | null;
  loading: boolean;
} {
  const [insights, setInsights] = useState<StoredInsights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stored) {
      setInsights(null);
      setLoading(false);
      return;
    }

    if (stored.insights?.keyInsight && Array.isArray(stored.insights.nextSteps)) {
      setInsights(stored.insights);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchServerScore(stored.inputs)
      .then((scored) => {
        if (cancelled) return;
        setInsights({ keyInsight: scored.keyInsight, nextSteps: scored.nextSteps });
      })
      .catch(() => {
        if (cancelled) return;
        setInsights({ keyInsight: "", nextSteps: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stored]);

  return { insights, loading };
}
