import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { computeReassessment, type ReassessMilestoneInput } from "@/lib/path/reassess";
import { loadActivePlan } from "@/lib/path/server-plans";
import { loadPathServerData } from "@/lib/path/server-metrics";

export const runtime = "nodejs";

/**
 * Maps a milestone's recorded provenance back to the hard-stop code it
 * resolves (set at generation time from the recorded diagnosis).
 */
function reasonCodeFor(m: {
  kind: string;
  fundingSource: { metric?: string | null; basis?: string } | null;
}): string | null {
  if (m.kind !== "hard_stop") return null;
  switch (m.fundingSource?.metric) {
    case "dti":
      return "DTI_OVER_50";
    case "runway":
      return "RUNWAY_UNDER_1_MONTH";
    case "housing_ratio":
      return "HOUSING_RATIO_OVER_45";
    default:
      return m.fundingSource?.basis === "assessment" ? "CREDIT_UNDER_620" : null;
  }
}

/**
 * POST /api/path/reassess — compares the active plan's milestone targets
 * against CURRENT recorded metrics and marks progress. A milestone is done
 * only when recorded data meets its target. When every hard-stop milestone
 * is done, `readyToReassess` prompts a fresh assessment — the verdict itself
 * never changes here; only the scoring engine can move it.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-reassess:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const active = await loadActivePlan(supabase);
  if (!active) {
    return NextResponse.json({ error: "No active path to reassess." }, { status: 404 });
  }

  const { metrics, goals } = await loadPathServerData(supabase);
  const asOfDate = new Date().toISOString().slice(0, 10);

  const inputs: ReassessMilestoneInput[] = active.milestones.map((m) => ({
    id: m.id,
    kind: m.kind,
    status: m.status,
    targetAmountCents: m.targetAmountCents,
    reasonCode: reasonCodeFor(m),
    fundingSourceMetric: m.fundingSource?.metric ?? null,
    fundingSourceGoalId: m.fundingSource?.goalId ?? null,
  }));

  const result = computeReassessment({ milestones: inputs }, { metrics, goals }, asOfDate);

  // Apply only transitions to done; manual states are never overridden.
  const newlyDone = result.updates.filter(
    (u) =>
      u.status === "done" &&
      active.milestones.find((m) => m.id === u.id)?.status !== "done",
  );
  const nowIso = new Date().toISOString();
  for (const update of newlyDone) {
    const { error } = await supabase
      .from("path_milestones")
      .update({ status: "done", completed_at: nowIso })
      .eq("id", update.id)
      .eq("user_id", user.id)
      .neq("status", "done");
    if (error) {
      const correlationId = crypto.randomUUID();
      console.error(`[path:reassess:update:${correlationId}]`, error.message);
      return NextResponse.json(
        { error: "Could not save reassessment progress.", correlationId },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    updates: result.updates,
    readyToReassess: result.readyToReassess,
    completedMilestoneIds: newlyDone.map((u) => u.id),
  });
}
