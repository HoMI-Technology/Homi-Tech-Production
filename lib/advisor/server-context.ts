import type { SupabaseClient } from "@supabase/supabase-js";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import type { AdvisorAssessmentContext } from "@/lib/advisor/fallback";
import type { VerdictKey } from "@/lib/brand";

/**
 * Server-authoritative Companion context (integrity fix).
 *
 * The client used to send its own `assessment` block to /api/advisor, so a
 * user (or a shared device) could feed the Companion forged numbers and get
 * earnest counsel on fiction. For a signed-in user we instead read their
 * latest real assessment from the DB under RLS — the same server-authoritative
 * principle that governs scoring. Client-supplied context is now demo-only.
 *
 * Returns undefined when the user has no assessment yet; the system prompt
 * already handles the no-context case ("invite them to the Shadow Score").
 */
export async function loadServerAssessmentContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdvisorAssessmentContext | undefined> {
  const { data } = await supabase
    .from("assessments")
    .select("overall_score, verdict, financial_score, emotional_score, timing_score, hard_stops")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return undefined;

  const row = data as {
    overall_score: number | null;
    verdict: VerdictKey | null;
    financial_score: number | null;
    emotional_score: number | null;
    timing_score: number | null;
    hard_stops: unknown;
  };

  if (row.overall_score === null || row.verdict === null) return undefined;

  const hardStops = Array.isArray(row.hard_stops)
    ? row.hard_stops
        .map((h) =>
          typeof h === "string"
            ? h
            : h && typeof h === "object" && "message" in h
              ? String((h as { message: unknown }).message)
              : null,
        )
        .filter((h): h is string => h !== null)
    : [];

  return {
    score: row.overall_score,
    verdict: row.verdict,
    pillars: {
      financial: Math.round(((row.financial_score ?? 0) / PILLAR_MAX_POINTS.financial) * 100),
      emotional: Math.round(((row.emotional_score ?? 0) / PILLAR_MAX_POINTS.emotional) * 100),
      timing: Math.round(((row.timing_score ?? 0) / PILLAR_MAX_POINTS.timing) * 100),
    },
    hardStops,
  };
}
