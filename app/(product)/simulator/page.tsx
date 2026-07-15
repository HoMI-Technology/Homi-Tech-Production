import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ScoreSimulator } from "@/components/simulator/ScoreSimulator";
import type { AnchorAssessment } from "@/lib/simulator";

export const metadata: Metadata = {
  title: "Score Simulator | HōMI",
  description:
    "Test a money move before you make it — see how your own numbers shift your HōMI-Score, using the same engine as the real assessment.",
};

/**
 * Readiness-score simulator. The server side only gathers the seeds: the
 * latest financial snapshot (bank-synced baseline) and the latest completed
 * assessment (the held emotional/timing anchors). All math runs client-side
 * in lib/simulator.ts on top of the canonical scoring engine.
 */
export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">What-if instrument</p>
      <h1 className="mt-1 font-display text-3xl text-light">Simulate your score</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Move the levers — income, expenses, savings, debt — and watch your readiness respond. Same engine,
        same thresholds as the real assessment; every figure comes from your own numbers.
      </p>

      <div className="mt-8">
        <ScoreSimulator snapshotState={snapshotState} anchorAssessment={anchorAssessment} />
      </div>
    </div>
  );
}
