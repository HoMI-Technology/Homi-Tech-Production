import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import { pickResult } from "@/lib/assessment/resolveResult";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { createClient } from "@/lib/supabase/client";
import type { AssessmentRow } from "@/types/database";

/**
 * Latest readiness result for signed-in surfaces.
 * Prefers the newer of localStorage and `/api/assessments/latest`.
 */
export async function fetchLatestStoredAssessment(): Promise<StoredAssessment | null> {
  const local = loadLocalResult();
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return local;
    const res = await fetch("/api/assessments/latest");
    const json = (await res.json().catch(() => ({ assessment: null }))) as {
      assessment?: AssessmentRow | null;
    };
    const remote = json.assessment ? mapAssessmentRowToStored(json.assessment) : null;
    return pickResult(local, remote);
  } catch {
    return local;
  }
}
