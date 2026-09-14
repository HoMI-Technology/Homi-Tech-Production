import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { budgetPeriodCreateSchema } from "@/lib/finance/validation";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";
import type {
  FinanceBudgetAllocationRow,
  FinanceBudgetPeriodRow,
} from "@/types/database";
import type { BudgetCategoryAllocation, BudgetPeriod } from "@/lib/finance/ledger";

export const runtime = "nodejs";

const PERIOD_COLS =
  "id, user_id, period_start, period_end, expected_income_cents, goal_reserve_cents, status, created_at, updated_at";
const ALLOCATION_COLS =
  "id, budget_period_id, category_id, planned_cents, rollover_mode, created_at, updated_at";

const MAX_PERIODS = 100;

function rowToPeriod(row: FinanceBudgetPeriodRow): BudgetPeriod {
  return {
    id: row.id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    expectedIncomeCents:
      row.expected_income_cents === null ? null : Number(row.expected_income_cents),
    goalReserveCents: Number(row.goal_reserve_cents),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToAllocation(row: FinanceBudgetAllocationRow): BudgetCategoryAllocation {
  return {
    id: row.id,
    budgetPeriodId: row.budget_period_id,
    categoryId: row.category_id,
    plannedCents: Number(row.planned_cents),
    rolloverMode: row.rollover_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serverError(scope: string, message: string | undefined) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-budget-periods:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save the budget period right now.", correlationId },
    { status: 500 },
  );
}

/**
 * GET /api/finance/budget-periods — the caller's periods, newest first, each
 * with its category allocations. Query: ?limit=50
 *
 * POST /api/finance/budget-periods — create a period with its allocations,
 * idempotent by client key. userId always from the session.
 */

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-budget-periods-read:${ip}`, {
    limit: 60,
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

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_PERIODS)
    : 50;

  const { data: periodRows, error: periodError } = await supabase
    .from("finance_budget_periods")
    .select(PERIOD_COLS)
    .eq("user_id", user.id)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (periodError) {
    if (periodError.code && FINANCE_LEDGER_INFRA_MISSING.has(periodError.code)) {
      return NextResponse.json({ periods: [], deferred: true });
    }
    return serverError("list", periodError.message);
  }

  const periods = ((periodRows ?? []) as FinanceBudgetPeriodRow[]).map(rowToPeriod);
  if (periods.length === 0) {
    return NextResponse.json({ periods: [] });
  }

  const { data: allocationRows, error: allocationError } = await supabase
    .from("finance_budget_allocations")
    .select(ALLOCATION_COLS)
    .in(
      "budget_period_id",
      periods.map((p) => p.id),
    );

  if (allocationError) {
    if (allocationError.code && FINANCE_LEDGER_INFRA_MISSING.has(allocationError.code)) {
      return NextResponse.json({ periods: [], deferred: true });
    }
    return serverError("list-allocations", allocationError.message);
  }

  const allocationsByPeriod = new Map<string, BudgetCategoryAllocation[]>();
  for (const row of (allocationRows ?? []) as FinanceBudgetAllocationRow[]) {
    const allocation = rowToAllocation(row);
    const list = allocationsByPeriod.get(allocation.budgetPeriodId) ?? [];
    list.push(allocation);
    allocationsByPeriod.set(allocation.budgetPeriodId, list);
  }

  return NextResponse.json({
    periods: periods.map((period) => ({
      period,
      allocations: allocationsByPeriod.get(period.id) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-budget-periods-write:${ip}`, {
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

  const parsed = budgetPeriodCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid budget period.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Idempotency: return the prior response body when the key was already used.
  const { data: prior, error: priorError } = await supabase
    .from("finance_mutation_idempotency")
    .select("resource_id, response_status, response_body")
    .eq("user_id", user.id)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (priorError && !(priorError.code && FINANCE_LEDGER_INFRA_MISSING.has(priorError.code))) {
    return serverError("idem-read", priorError.message);
  }

  if (prior) {
    return NextResponse.json(prior.response_body, { status: prior.response_status });
  }

  const { data: created, error: insertError } = await supabase
    .from("finance_budget_periods")
    .insert({
      id: input.id,
      user_id: user.id,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      expected_income_cents: input.expectedIncomeCents,
      goal_reserve_cents: input.goalReserveCents,
      status: "open" as const,
    })
    .select(PERIOD_COLS)
    .single();

  if (insertError || !created) {
    if (insertError?.code && FINANCE_LEDGER_INFRA_MISSING.has(insertError.code)) {
      // Migration not applied — client keeps its local ledger.
      return NextResponse.json({ deferred: true, period: null }, { status: 202 });
    }
    // Unique violation on (user, start, end) or id — the period already exists.
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "Budget period already exists." }, { status: 409 });
    }
    return serverError("create", insertError?.message);
  }

  const period = rowToPeriod(created as FinanceBudgetPeriodRow);

  let allocations: BudgetCategoryAllocation[] = [];
  if (input.allocations.length > 0) {
    const { data: allocationRows, error: allocationError } = await supabase
      .from("finance_budget_allocations")
      .insert(
        input.allocations.map((allocation) => ({
          budget_period_id: period.id,
          category_id: allocation.categoryId,
          planned_cents: allocation.plannedCents,
          rollover_mode: allocation.rolloverMode,
        })),
      )
      .select(ALLOCATION_COLS);

    if (allocationError) {
      if (allocationError.code && FINANCE_LEDGER_INFRA_MISSING.has(allocationError.code)) {
        return NextResponse.json({ deferred: true, period: null }, { status: 202 });
      }
      return serverError("create-allocations", allocationError.message);
    }
    allocations = ((allocationRows ?? []) as FinanceBudgetAllocationRow[]).map(rowToAllocation);
  }

  const body = { period, allocations };
  const status = 201;

  // Best-effort idempotency record — if this fails we still return the create.
  await supabase.from("finance_mutation_idempotency").insert({
    user_id: user.id,
    idempotency_key: input.idempotencyKey,
    resource_type: "budget_period",
    resource_id: period.id,
    response_status: status,
    response_body: body,
  });

  return NextResponse.json(body, { status });
}
