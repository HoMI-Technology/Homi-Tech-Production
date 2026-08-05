import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { FINANCE_LEDGER_INFRA_MISSING, rowToSavingsGoal } from "@/lib/finance/db-map";
import type { FinanceSavingsGoalRow } from "@/types/database";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, name, goal_type, target_amount_cents, current_amount_cents, target_date, planned_monthly_contribution_cents, linked_decision_id, linked_account_id, status, created_at, updated_at";

const GOAL_TYPE = "home";

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  target_amount: z.number().finite().positive().max(100_000_000),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  current_amount: z.number().finite().min(0).max(100_000_000).nullish(),
  planned_monthly_contribution: z.number().finite().min(0).max(100_000_000).nullish(),
});

function dollarsToCents(dollars: number | null | undefined): number {
  if (dollars === null || dollars === undefined) return 0;
  return Math.round(dollars * 100);
}

function serverError(scope: string, message: string) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-savings-goals:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save your goal right now.", correlationId },
    { status: 500 },
  );
}

/** GET /api/finance/savings-goals — the caller's active savings goal, or null. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-read:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("finance_savings_goals")
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ goal: null });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-savings-goals:get:${correlationId}]`, error.message);
    return NextResponse.json({ error: "Could not load your goal.", correlationId }, { status: 500 });
  }

  return NextResponse.json({ goal: data ? rowToSavingsGoal(data as FinanceSavingsGoalRow) : null });
}

/** PUT /api/finance/savings-goals — creates or replaces the caller's active goal. */
export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-write:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
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

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A target amount greater than zero and a name are required." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Find the existing active goal so we can update it in place. The unique
  // index idx_finance_savings_goals_one_active guarantees at most one active
  // goal per user, so a second active insert would violate the constraint.
  const { data: existing } = await supabase
    .from("finance_savings_goals")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const base = {
    user_id: user.id,
    name: input.name,
    goal_type: GOAL_TYPE,
    target_amount_cents: dollarsToCents(input.target_amount),
    current_amount_cents: dollarsToCents(input.current_amount),
    target_date: input.target_date ?? null,
    planned_monthly_contribution_cents: dollarsToCents(input.planned_monthly_contribution),
    status: "active" as const,
  };

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .update({
        ...base,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select(SELECT_COLS)
      .single();
    if (error || !data) {
      return serverError("put", error?.message ?? "update returned no row");
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .insert({
        ...base,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !data) {
      return serverError("put", error?.message ?? "insert returned no row");
    }
    result = data;
  }

  return NextResponse.json({ goal: rowToSavingsGoal(result as FinanceSavingsGoalRow) });
}

/** DELETE /api/finance/savings-goals — archives the caller's active goal. Idempotent. */
export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-write:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase
    .from("finance_savings_goals")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error && !(error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code))) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-savings-goals:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not remove your goal right now.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
