import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ScoreSimulator } from "@/components/simulator/ScoreSimulator";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import { getUserEntitlements } from "@/lib/entitlements";
import type { AnchorAssessment } from "@/lib/simulator/public";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = {
  title: "Score Simulator | HōMI",
  description:
    "Test a money move before you make it — see how your own numbers shift your HōMI-Score, using the same engine as the real assessment.",
};

/**
 * Readiness-score simulator. This RSC gathers seeds (latest snapshot +
 * assessment anchors). ScoreSimulator seeds levers client-side and scores
 * via POST /api/simulator (Plans.md 6.4) — the engine never ships to the client.
 */
export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.advancedTools) {
    return (
      <UpgradePanel
        feature="score-simulator"
        body="The readiness score simulator lets you test money moves before you make them — part of HōMI Pro."
        minTier="pro"
      />
    );
  }

  const [{ data: snapshots }, { data: assessments }] = await Promise.all([
    user
      ? supabase
          .from("financial_snapshots")
          .select("state, completed_at")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("assessments")
          .select("emotional_score, timing_score, inputs")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
  ]);

  const snapshotState = (snapshots?.[0]?.state as Record<string, unknown> | undefined) ?? null;
  const anchorAssessment = (assessments?.[0] as AnchorAssessment | undefined) ?? null;

  return (
    <ToolShell
      eyebrow="What-if instrument"
      title="Simulate your score"
      description="Move the levers — income, expenses, savings, debt — and watch your readiness respond. Same engine, same thresholds as the real assessment; every figure comes from your own numbers."
      backHref="/money/decide"
      backLabel="Money · Decide"
    >
      <ScoreSimulator snapshotState={snapshotState} anchorAssessment={anchorAssessment} />
    </ToolShell>
  );
}
