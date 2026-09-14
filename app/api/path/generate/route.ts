import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getLens } from "@/lib/tools/registry";
import { generatePath } from "@/lib/path/generator";
import { generatePathBodySchema } from "@/lib/path/validation";
import { PATH_INFRA_MISSING } from "@/lib/path/db-map";
import { loadPathServerData } from "@/lib/path/server-metrics";
import {
  diagnosisFromAssessmentRow,
  diagnosisFingerprint,
  fingerprintFromPlanDiagnosis,
  loadActivePlan,
  persistGeneratedPlan,
} from "@/lib/path/server-plans";
import type { AssessmentRow } from "@/types/database";

export const runtime = "nodejs";

/**
 * POST /api/path/generate — generates a Build Path from the caller's latest
 * completed assessment + recorded ledger metrics.
 *
 * The stored verdict and hard-stops are consumed verbatim; the generator
 * never recomputes them. Idempotent per active plan: an unchanged diagnosis
 * returns the existing plan (200); a changed diagnosis supersedes it with
 * version + 1 (201). Works questionnaire-only when finance tables are empty
 * or unmigrated (metrics → null; milestones degrade to null amounts with
 * `insufficient_data` provenance, never invented numbers).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-generate:${ip}`, { limit: 10, windowMs: 60_000 });
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

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = generatePathBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // A goal_id must name one of the caller's own savings goals (same
  // ownership pattern as app/api/finance/savings-goals: user_id always from
  // the session, never the body). Unknown or not-owned → 400.
  if (parsed.data.goal_id) {
    const { data: goal, error: goalError } = await supabase
      .from("finance_savings_goals")
      .select("id")
      .eq("id", parsed.data.goal_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (goalError && !(goalError.code && PATH_INFRA_MISSING.has(goalError.code))) {
      const correlationId = crypto.randomUUID();
      console.error(`[path:generate:goal:${correlationId}]`, goalError.message);
      return NextResponse.json(
        { error: "Could not verify the goal.", correlationId },
        { status: 500 },
      );
    }
    if (!goal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 400 });
    }
  }

  const { data: assessmentRow, error: assessmentError } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .eq("is_shadow", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assessmentError) {
    const correlationId = crypto.randomUUID();
    console.error(`[path:generate:assessment:${correlationId}]`, assessmentError.message);
    return NextResponse.json(
      { error: "Could not load your assessment.", correlationId },
      { status: 500 },
    );
  }

  const diagnosis = assessmentRow
    ? diagnosisFromAssessmentRow(assessmentRow as AssessmentRow)
    : null;
  if (!diagnosis) {
    return NextResponse.json(
      { error: "No completed assessment found. The path starts from a recorded verdict." },
      { status: 409 },
    );
  }

  const { metrics, goals } = await loadPathServerData(supabase);
  const asOfDate = new Date().toISOString().slice(0, 10);

  const existing = await loadActivePlan(supabase);
  const fingerprint = diagnosisFingerprint(diagnosis);

  if (existing && fingerprintFromPlanDiagnosis(existing.plan.diagnosis) === fingerprint) {
    return NextResponse.json(
      { plan: existing.plan, milestones: existing.milestones, superseded: false },
      { status: 200 },
    );
  }

  const generated = generatePath({
    verdict: diagnosis.verdict,
    hardStops: diagnosis.hardStops,
    pillars: diagnosis.pillars,
    metrics,
    goals,
    asOfDate,
    assessmentId: assessmentRow ? (assessmentRow as AssessmentRow).id : null,
    version: existing ? existing.plan.version + 1 : 1,
  });

  // Tool slugs must reference real lenses from the locked registry — never
  // a dead link on a trust surface. Unknown slugs degrade to null.
  for (const m of generated.milestones) {
    if (m.toolSlug !== null && !getLens(m.toolSlug)) m.toolSlug = null;
  }

  if (existing) {
    const { error: archiveError } = await supabase
      .from("path_plans")
      .update({ status: "archived" })
      .eq("id", existing.plan.id)
      .eq("user_id", user.id);
    if (archiveError && !(archiveError.code && PATH_INFRA_MISSING.has(archiveError.code))) {
      const correlationId = crypto.randomUUID();
      console.error(`[path:generate:archive:${correlationId}]`, archiveError.message);
      return NextResponse.json(
        { error: "Could not update your existing path.", correlationId },
        { status: 500 },
      );
    }
  }

  const persisted = await persistGeneratedPlan(supabase, {
    userId: user.id,
    generated,
    goalId: parsed.data.goal_id ?? null,
    assessmentResultId: assessmentRow ? (assessmentRow as AssessmentRow).id : null,
    status: "active",
  });

  if ("error" in persisted) {
    if (persisted.code && PATH_INFRA_MISSING.has(persisted.code)) {
      // Deferred-fallback convention (same as finance routes): the path is
      // generated but storage is not migrated yet — defer, don't error.
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[path:generate:persist:${correlationId}]`, persisted.error);
    return NextResponse.json(
      { error: "Could not save your path. Path storage may not be available yet.", correlationId },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      plan: persisted.plan,
      milestones: persisted.milestones,
      bindingConstraint: generated.bindingConstraint,
      superseded: existing !== null,
    },
    { status: 201 },
  );
}
