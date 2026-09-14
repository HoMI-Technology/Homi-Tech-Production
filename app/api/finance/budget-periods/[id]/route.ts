import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { budgetPeriodPatchSchema } from "@/lib/finance/validation";
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

type RouteCtx = { params: Promise<{ id: string }> };

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

function rowToAllocation(row: FinanceBudgetAllocationRow): BudgetCategoryAllocation {
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
    { error: "Could not update the budget period right now.", correlationId },
    { status: 500 },
  );
}

/**
 * PATCH /api/finance/budget-periods/:id — optimistic concurrency via
 * expectedUpdatedAt (ISO). Stale stamp → 409 with the current row.
 *
 * Move-money is expressed as an updated `allocations` set (the source and
 * destination plannedCents both change); the route replaces the period's
 * allocation rows with the provided set. Closed periods are immutable here —
 * editing a closed month would rewrite the record of what was planned.
 *
 * DELETE /api/finance/budget-periods/:id — hard delete; periods carry no
 * deleted_at column in the schema, and their allocations cascade.
 */

export async function PATCH(request: Request, ctx: RouteCtx) {
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

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid budget period id." }, { status: 400 });
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

  const parsed = budgetPeriodPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { expectedUpdatedAt, ...fields } = parsed.data;

  const { data: existing, error: readError } = await supabase
    .from("finance_budget_periods")
    .select(PERIOD_COLS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    if (readError.code && FINANCE_LEDGER_INFRA_MISSING.has(readError.code)) {
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    return serverError("patch-read", readError.message);
  }

  if (!existing) {
    return NextResponse.json({ error: "Budget period not found." }, { status: 404 });
  }

  const row = existing as FinanceBudgetPeriodRow;
  // Optimistic concurrency: client must present the last seen updated_at.
  if (new Date(row.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return NextResponse.json(
      { error: "Stale write.", period: rowToPeriod(row) },
      { status: 409 },
    );
  }

  if (row.status === "closed") {
    return NextResponse.json(
      { error: "Closed periods are read-only." },
      { status: 409 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (fields.expectedIncomeCents !== undefined) {
    patch.expected_income_cents = fields.expectedIncomeCents;
  }
  if (fields.goalReserveCents !== undefined) patch.goal_reserve_cents = fields.goalReserveCents;
  if (fields.status !== undefined) patch.status = fields.status;

  let period = rowToPeriod(row);
  if (Object.keys(patch).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from("finance_budget_periods")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(PERIOD_COLS)
      .single();

    if (updateError || !updated) {
      if (updateError?.code && FINANCE_LEDGER_INFRA_MISSING.has(updateError.code)) {
        return NextResponse.json({ deferred: true }, { status: 202 });
      }
      return serverError("patch", updateError?.message);
    }
    period = rowToPeriod(updated as FinanceBudgetPeriodRow);
  }

  let allocations: BudgetCategoryAllocation[] | null = null;
  if (fields.allocations !== undefined) {
    // Replace the allocation set. Not transactional at the PostgREST layer;
    // a retried PATCH converges on the same set because the input is the
    // whole desired state.
    const { error: deleteError } = await supabase
      .from("finance_budget_allocations")
      .delete()
      .eq("budget_period_id", id);

    if (deleteError) {
      if (deleteError.code && FINANCE_LEDGER_INFRA_MISSING.has(deleteError.code)) {
        return NextResponse.json({ deferred: true }, { status: 202 });
      }
      return serverError("patch-allocations-clear", deleteError.message);
    }

    if (fields.allocations.length > 0) {
      const { data: allocationRows, error: allocationError } = await supabase
        .from("finance_budget_allocations")
        .insert(
          fields.allocations.map((allocation) => ({
            budget_period_id: id,
            category_id: allocation.categoryId,
            planned_cents: allocation.plannedCents,
            rollover_mode: allocation.rolloverMode,
          })),
        )
        .select(ALLOCATION_COLS);

      if (allocationError) {
        if (allocationError.code && FINANCE_LEDGER_INFRA_MISSING.has(allocationError.code)) {
          return NextResponse.json({ deferred: true }, { status: 202 });
        }
        return serverError("patch-allocations", allocationError.message);
      }
      allocations = ((allocationRows ?? []) as FinanceBudgetAllocationRow[]).map(rowToAllocation);
    } else {
      allocations = [];
    }
  }

  return NextResponse.json({ period, allocations });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
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

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid budget period id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: deleted, error } = await supabase
    .from("finance_budget_periods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-budget-periods:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not delete the budget period.", correlationId },
      { status: 500 },
    );
  }

  if (!deleted) {
    // Idempotent: already gone counts as success.
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  return NextResponse.json({ ok: true });
}
