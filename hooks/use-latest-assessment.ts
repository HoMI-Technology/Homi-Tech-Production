"use client";

import { useEffect, useState } from "react";
import { fetchLatestStoredAssessment } from "@/lib/assessment/latest";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";

/**
 * Latest readiness result for signed-in product surfaces.
 * Prefers the newer of localStorage (anonymous / just-finished) and the
 * production `/api/assessments/latest` row. Never recomputes a score.
 */
export function useLatestAssessment(): {
  assessment: StoredAssessment | null | undefined;
} {
  const [assessment, setAssessment] = useState<StoredAssessment | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setAssessment(loadLocalResult());
    void fetchLatestStoredAssessment().then((latest) => {
      if (active) setAssessment(latest);
    });
    return () => {
      active = false;
    };
  }, []);

  return { assessment };
}
