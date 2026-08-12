"use client";

import { useEffect, useState } from "react";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import { pickResult } from "@/lib/assessment/resolveResult";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { createClient } from "@/lib/supabase/client";
import type { AssessmentRow } from "@/types/database";

/**
 * Latest readiness result for signed-in product surfaces.
 * Prefers the newer of localStorage (anonymous / just-finished) and the
 * production `/api/assessments/latest` row. Never recomputes a score.
 */
export function useLatestAssessment(): {
  assessment: StoredAssessment | null | undefined;
} {
  const [local, setLocal] = useState<StoredAssessment | null | undefined>(undefined);
  const [remote, setRemote] = useState<StoredAssessment | null>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);

  useEffect(() => {
    setLocal(loadLocalResult());
  }, []);

  useEffect(() => {
    let active = true;
    async function loadRemote(): Promise<void> {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          if (active) setRemoteChecked(true);
          return;
        }
        const res = await fetch("/api/assessments/latest");
        const json = (await res.json().catch(() => ({ assessment: null }))) as {
          assessment?: AssessmentRow | null;
        };
        const mapped = json.assessment ? mapAssessmentRowToStored(json.assessment) : null;
        if (active) {
          setRemote(mapped);
          setRemoteChecked(true);
        }
      } catch {
        if (active) setRemoteChecked(true);
      }
    }
    void loadRemote();
    return () => {
      active = false;
    };
  }, []);

  if (local === undefined || !remoteChecked) {
    return { assessment: undefined };
  }
  return { assessment: pickResult(local, remote) };
}
