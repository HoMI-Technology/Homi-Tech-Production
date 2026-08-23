import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyStand } from "@/components/money/MoneyStand";
import type { ScoreRailReading } from "@/components/score/ScoreRail";
import type { VerdictKey } from "@/lib/brand";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Money",
  description:
    "Where cash sits — surplus, runway, and liquid. Educational only. Decision math is one click deeper.",
  alternates: { canonical: "/money" },
};

/**
 * Money Reality — Stand mode (canonical money depth, not a second Path home).
 * Replaces the dual /finance + /tools chrome split.
 *
 * Reality redesign (Phase 2): the latest completed assessment is read
 * server-side and handed to MoneyStand as the compact ScoreRail top rail
 * (Homie Score + verdict + three pillars above the Steady Cash instrument).
 * No assessment → the rail renders an honest Unknown with the Assess close.
 */
export default async function MoneyPage() {
  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const { data } = user
    ? await supabase
        .from("assessments")
        .select("overall_score, verdict, financial_score, emotional_score, timing_score")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] as never[] };

  const latest = data?.[0] ?? null;
  const readiness: ScoreRailReading | null = latest
    ? {
        score: latest.overall_score ?? null,
        verdict: (latest.verdict as VerdictKey | null) ?? null,
        pillars: {
          emotional: latest.emotional_score,
          financial: latest.financial_score,
          timing: latest.timing_score,
        },
      }
    : null;

  return (
    <MoneyShell>
      <MoneyStand readiness={readiness} />
    </MoneyShell>
  );
}
