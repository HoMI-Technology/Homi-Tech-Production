import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";
import { MAX_MONEY_CENTS } from "@/lib/finance/money";

export const runtime = "nodejs";

const allocationSchema = z.object({
  goalId: z.string().uuid(),
  /** Date-only month the allocation belongs to (YYYY-MM-DD). */
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int().positive().max(MAX_MONEY_CENTS),
});

function isInfraMissing(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code));
}

/**
 * POST /api/finance/savings-goals/allocations — records cash allocated to a
 * goal for one period. Idempotent: the (goal_id, period_start) unique key
 * upserts, so recording the same month's allocation twice keeps one row.
 *
 * A goal allocation is a cash assignment, never spending — it does not
 * create a transaction.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-goal-allocations-write:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
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

  const parsed = allocationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid goal allocation.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // The goal must be the caller's own (RLS also enforces; this gives a
  // clean 404 instead of an FK violation).
  const { data: goal, error: goalError } = await supabase
    .from("finance_savings_goals")
    .select("id")
    .eq("id", input.goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (goalError) {
    if (isInfraMissing(goalError)) {
      return NextResponse.json({ deferred: true, allocation: null }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-goal-allocations:goal:${correlationId}]`, goalError.message);
    return NextResponse.json(
      { error: "Could not record the allocation.", correlationId },
      { status: 500 },
    );
  }
  if (!goal) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("finance_goal_allocations")
    .upsert(
      {
        user_id: user.id,
        goal_id: input.goalId,
        period_start: input.periodStart,
        amount_cents: input.amountCents,
      },
      { onConflict: "goal_id,period_start" },
    )
    .select("id, goal_id, period_start, amount_cents, created_at")
    .single();

  if (error) {
    if (isInfraMissing(error)) {
      return NextResponse.json({ deferred: true, allocation: null }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-goal-allocations:upsert:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not record the allocation.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      allocation: {
        id: data.id,
        goalId: data.goal_id,
        periodStart: data.period_start,
        amountCents: Number(data.amount_cents),
        createdAt: data.created_at,
      },
    },
    { status: 201 },
  );
}
