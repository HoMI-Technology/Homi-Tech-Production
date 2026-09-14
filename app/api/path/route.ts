import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { PATH_INFRA_MISSING, rowToPathPartnerState } from "@/lib/path/db-map";
import { loadActivePlan } from "@/lib/path/server-plans";
import { buildPathSummary } from "@/lib/path/path-summary";
import { resolveBindingConstraint } from "@/lib/path/constraints";
import type { PathPartnerStateRow } from "@/types/database";
import type { PathPillarSnapshot, PathVerdict, RecordedHardStop } from "@/lib/path/types";

export const runtime = "nodejs";

/**
 * GET /api/path — the caller's active Build Path with milestones, progress
 * counts, partner states, and the neutral summary block. 200 with
 * `{ plan: null }` when no path exists yet.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-read:${ip}`, { limit: 30, windowMs: 60_000 });
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
    return NextResponse.json({ plan: null, milestones: [], partnerStates: [] });
  }

  const { data: partnerRows, error: partnerError } = await supabase
    .from("path_partner_states")
    .select("*")
    .eq("plan_id", active.plan.id);
  if (partnerError && !(partnerError.code && PATH_INFRA_MISSING.has(partnerError.code))) {
    const correlationId = crypto.randomUUID();
    console.error(`[path:get:partners:${correlationId}]`, partnerError.message);
    return NextResponse.json(
      { error: "Could not load your path.", correlationId },
      { status: 500 },
    );
  }

  const statusById = new Map(active.milestones.map((m) => [m.id, m.status]));
  const doneCount = active.milestones.filter((m) => m.status === "done").length;
  const hardStopsRemaining = active.milestones.filter(
    (m) => m.kind === "hard_stop" && m.status !== "done" && m.status !== "skipped",
  ).length;

  const diagnosis = active.plan.diagnosis as {
    verdict?: PathVerdict;
    hardStops?: RecordedHardStop[];
    pillars?: PathPillarSnapshot;
  };
  const binding =
    diagnosis.pillars && diagnosis.hardStops
      ? resolveBindingConstraint(diagnosis.hardStops, diagnosis.pillars)
      : null;

  const summary = binding
    ? buildPathSummary({
        status: active.plan.status,
        bindingConstraint: binding,
        milestones: active.milestones,
        statusById,
      })
    : null;

  return NextResponse.json({
    plan: active.plan,
    milestones: active.milestones,
    partnerStates: ((partnerRows ?? []) as PathPartnerStateRow[]).map(rowToPathPartnerState),
    progress: {
      total: active.milestones.length,
      done: doneCount,
      hardStopsRemaining,
    },
    summary,
  });
}
