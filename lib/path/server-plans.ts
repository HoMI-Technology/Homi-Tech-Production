import "server-only";

/**
 * Path to Ready v1 — server plan persistence helpers.
 *
 * Reads the STORED assessment diagnosis (verdict, hard-stops, pillar totals)
 * and persists generated plans with the depends_on chain resolved to real
 * milestone ids. Nothing here computes a score or verdict — the diagnosis
 * is copied from the assessments row the scoring engine wrote.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import type { AssessmentRow, PathMilestoneRow, PathPlanRow } from "@/types/database";
import { rowToPathMilestone, rowToPathPlan, type PathMilestone, type PathPlan } from "./db-map";
import type { GeneratedPath, RecordedHardStop } from "./types";
import type { GeneratePathInput } from "./types";

export interface StoredDiagnosis {
  verdict: GeneratePathInput["verdict"];
  hardStops: RecordedHardStop[];
  pillars: GeneratePathInput["pillars"];
}

const VALID_VERDICTS = new Set(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]);
const VALID_HARD_STOPS = new Set([
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "RUNWAY_UNDER_1_MONTH",
  "CREDIT_UNDER_620",
]);

/**
 * Extracts the diagnosis from a completed assessments row. Returns null when
 * the row lacks a stored verdict/pillars (in-progress or shadow rows).
 * Pure reshaping of already-computed values — same contract as
 * lib/assessment/remote.ts.
 */
export function diagnosisFromAssessmentRow(row: AssessmentRow): StoredDiagnosis | null {
  if (!row.verdict || !VALID_VERDICTS.has(row.verdict) || !row.sub_scores) return null;
  const sub = row.sub_scores as {
    financial?: { total?: number };
    emotional?: { total?: number };
    timing?: { total?: number };
  };
  if (
    typeof sub.financial?.total !== "number" ||
    typeof sub.emotional?.total !== "number" ||
    typeof sub.timing?.total !== "number"
  ) {
    return null;
  }
  const rawStops = Array.isArray(row.hard_stops) ? row.hard_stops : [];
  const hardStops: RecordedHardStop[] = rawStops
    .map((h) => h as { code?: unknown; message?: unknown })
    .filter(
      (h): h is { code: RecordedHardStop["code"]; message: string } =>
        typeof h.code === "string" && VALID_HARD_STOPS.has(h.code as string),
    )
    .map((h) => ({ code: h.code, message: typeof h.message === "string" ? h.message : h.code }));
  return {
    verdict: row.verdict,
    hardStops,
    pillars: {
      financial: { total: sub.financial.total, max: PILLAR_MAX_POINTS.financial },
      emotional: { total: sub.emotional.total, max: PILLAR_MAX_POINTS.emotional },
      timing: { total: sub.timing.total, max: PILLAR_MAX_POINTS.timing },
    },
  };
}

/**
 * Fingerprint of the diagnosis for idempotent generation: same recorded
 * diagnosis → same active plan returned; changed diagnosis → supersede with
 * version + 1. Timestamps are excluded deliberately.
 */
export function diagnosisFingerprint(d: StoredDiagnosis): string {
  return JSON.stringify({
    verdict: d.verdict,
    hardStops: d.hardStops.map((h) => h.code).sort(),
    pillars: {
      financial: d.pillars.financial.total,
      emotional: d.pillars.emotional.total,
      timing: d.pillars.timing.total,
    },
  });
}

export function fingerprintFromPlanDiagnosis(diagnosis: Record<string, unknown>): string {
  const d = diagnosis as {
    verdict?: string;
    hardStops?: { code?: string }[];
    pillars?: { financial?: { total?: number }; emotional?: { total?: number }; timing?: { total?: number } };
  };
  return JSON.stringify({
    verdict: d.verdict ?? null,
    hardStops: (d.hardStops ?? []).map((h) => h.code ?? "").sort(),
    pillars: {
      financial: d.pillars?.financial?.total ?? null,
      emotional: d.pillars?.emotional?.total ?? null,
      timing: d.pillars?.timing?.total ?? null,
    },
  });
}

/** Loads the caller's active (or draft) plan with its milestones, ordered. */
export async function loadActivePlan(
  supabase: SupabaseClient,
): Promise<{ plan: PathPlan; milestones: PathMilestone[] } | null> {
  const { data: planRow, error: planError } = await supabase
    .from("path_plans")
    .select("*")
    .in("status", ["active", "draft"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planError || !planRow) return null;

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from("path_milestones")
    .select("*")
    .eq("plan_id", (planRow as PathPlanRow).id)
    .order("sort_order", { ascending: true });
  if (milestoneError) return null;

  return {
    plan: rowToPathPlan(planRow as PathPlanRow),
    milestones: ((milestoneRows ?? []) as PathMilestoneRow[]).map(rowToPathMilestone),
  };
}

/**
 * Persists a generated path: one plan row + milestones inserted in sort
 * order so each depends_on resolves to the real id of an already-inserted
 * earlier milestone (the generator guarantees backward-only references).
 */
export async function persistGeneratedPlan(
  supabase: SupabaseClient,
  input: {
    userId: string;
    generated: GeneratedPath;
    goalId: string | null;
    assessmentResultId: string | null;
    status: "draft" | "active";
  },
): Promise<{ plan: PathPlan; milestones: PathMilestone[] } | { error: string; code: string | null }> {
  const { generated, userId } = input;

  const { data: planRow, error: planError } = await supabase
    .from("path_plans")
    .insert({
      user_id: userId,
      goal_id: input.goalId,
      status: input.status,
      diagnosis: generated.diagnosis,
      binding_constraint: generated.bindingConstraint.code,
      assessment_result_id: input.assessmentResultId,
      version: generated.version,
    })
    .select("*")
    .single();
  if (planError || !planRow) {
    return { error: planError?.message ?? "plan insert returned no row", code: planError?.code ?? null };
  }
  const plan = rowToPathPlan(planRow as PathPlanRow);

  const idByDraftId = new Map<string, string>();
  const milestones: PathMilestone[] = [];
  for (const m of [...generated.milestones].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const dependsOn = m.dependsOn !== null ? (idByDraftId.get(m.dependsOn) ?? null) : null;
    const { data: row, error } = await supabase
      .from("path_milestones")
      .insert({
        plan_id: plan.id,
        user_id: userId,
        title: m.title,
        description: m.description,
        milestone_kind: m.kind,
        target_date: m.targetDate,
        target_amount_cents: m.targetAmountCents,
        funding_source: m.fundingSource,
        tool_slug: m.toolSlug,
        depends_on: dependsOn,
        sort_order: m.sortOrder,
        status: "pending",
      })
      .select("*")
      .single();
    if (error || !row) {
      return { error: error?.message ?? "milestone insert returned no row", code: error?.code ?? null };
    }
    const milestone = rowToPathMilestone(row as PathMilestoneRow);
    idByDraftId.set(m.id, milestone.id);
    milestones.push(milestone);
  }

  return { plan, milestones };
}
