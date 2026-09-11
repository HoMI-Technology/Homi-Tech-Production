/**
 * Shared last-read loader for Shell v4 system surfaces.
 * AssessmentResult is read-only. Never writes a score.
 */

import {
  hardStopCodes,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";
import type { SystemV4LastRead } from "@/lib/v4/system-surfaces";

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function loadSystemV4LastRead(): Promise<SystemV4LastRead | null> {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await getCachedClient();
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = ((data ?? [])[0] ?? null) as AssessmentRow | null;
  if (!latest) return null;
  const inputs = (latest.inputs ?? null) as Record<string, unknown> | null;
  return {
    decisionType: latest.decision_type ?? undefined,
    verdict: (latest.verdict as VerdictKey | null) ?? null,
    stopCode: leadingFoldHardStopCode(hardStopCodes(latest.hard_stops)),
    lastMoneyMonths: inputs ? finiteNumber(inputs.emergencyFundMonths) : null,
    scoredAt: latest.completed_at ?? latest.created_at ?? null,
  };
}
