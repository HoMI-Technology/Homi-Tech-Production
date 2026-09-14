import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { partnerStateBodySchema } from "@/lib/path/validation";
import { canTransitionPartnerState } from "@/lib/path/partner";
import { PATH_INFRA_MISSING, rowToPathPartnerState } from "@/lib/path/db-map";
import type { PathPartnerStateRow } from "@/types/database";

export const runtime = "nodejs";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** True when caller and partner share at least one household (00039). */
async function shareHousehold(
  supabase: Supabase,
  userId: string,
  partnerId: string,
): Promise<boolean> {
  const { data: mine, error: mineError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId);
  if (mineError || !mine || mine.length === 0) return false;
  const householdIds = (mine as { household_id: string }[]).map((r) => r.household_id);
  const { data: theirs, error: theirsError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", partnerId)
    .in("household_id", householdIds);
  if (theirsError) return false;
  return (theirs ?? []).length > 0;
}

/**
 * GET /api/path/partner — partner alignment states visible to the caller
 * (as plan owner or as the recorded partner; RLS enforces both directions).
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-partner-read:${ip}`, { limit: 30, windowMs: 60_000 });
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

  const { data, error } = await supabase
    .from("path_partner_states")
    .select("*")
    .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
    .order("noted_at", { ascending: false })
    .limit(50);

  if (error) {
    if (error.code && PATH_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ partnerStates: [] });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[path:partner:get:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load partner states.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    partnerStates: ((data ?? []) as PathPartnerStateRow[]).map(rowToPathPartnerState),
  });
}

/**
 * POST /api/path/partner — records the partner alignment state for a plan.
 *
 * Disagreement is first-class: "diverged" is stored with its snapshot, never
 * smoothed into "aligned". Only the plan owner writes (RLS), and only when
 * both users share a household. Idempotent upsert on (plan, owner, partner).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-partner-write:${ip}`, { limit: 20, windowMs: 60_000 });
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = partnerStateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid partner state payload." }, { status: 400 });
  }
  const input = parsed.data;

  if (input.partner_user_id === user.id) {
    return NextResponse.json({ error: "Partner must be someone else." }, { status: 400 });
  }

  if (!(await shareHousehold(supabase, user.id, input.partner_user_id))) {
    return NextResponse.json(
      { error: "Partner states require a shared household." },
      { status: 403 },
    );
  }

  // The plan must be the caller's own active/draft plan.
  const { data: plan, error: planError } = await supabase
    .from("path_plans")
    .select("id")
    .eq("id", input.plan_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (planError) {
    if (planError.code && PATH_INFRA_MISSING.has(planError.code)) {
      // Deferred-fallback convention (same as finance routes).
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[path:partner:plan:${correlationId}]`, planError.message);
    return NextResponse.json({ error: "Could not load the path.", correlationId }, { status: 500 });
  }
  if (!plan) {
    return NextResponse.json({ error: "Path not found." }, { status: 404 });
  }

  // Transition guard (all explicit transitions are allowed today; the check
  // keeps the contract in one place if rules tighten later).
  const { data: existing } = await supabase
    .from("path_partner_states")
    .select("state")
    .eq("plan_id", input.plan_id)
    .eq("user_id", user.id)
    .eq("partner_user_id", input.partner_user_id)
    .maybeSingle();
  if (
    existing &&
    !canTransitionPartnerState(
      (existing as { state: "aligned" | "diverged" | "pending" }).state,
      input.state,
    )
  ) {
    return NextResponse.json({ error: "That state transition is not allowed." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("path_partner_states")
    .upsert(
      {
        plan_id: input.plan_id,
        user_id: user.id,
        partner_user_id: input.partner_user_id,
        state: input.state,
        partner_snapshot: input.partner_snapshot ?? null,
        noted_at: new Date().toISOString(),
      },
      { onConflict: "plan_id,user_id,partner_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    if (error.code && PATH_INFRA_MISSING.has(error.code)) {
      // Deferred-fallback convention (same as finance routes).
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[path:partner:upsert:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not record the partner state.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ partnerState: rowToPathPartnerState(data as PathPartnerStateRow) });
}
