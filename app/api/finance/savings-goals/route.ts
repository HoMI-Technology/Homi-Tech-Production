import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { FINANCE_LEDGER_INFRA_MISSING, rowToSavingsGoal } from "@/lib/finance/db-map";
import { dollarsToCents } from "@/lib/finance/money";
import { summarizeGoals, type GoalAllocation } from "@/lib/finance/goals";
import type { FinanceSavingsGoalRow } from "@/types/database";

export const runtime = "nodejs";

/**
 * Savings goals for the finance ledger. Ownership is RLS-shaped: user_id always
 * comes from the session, never the body.
 *
 * This route was written when idx_finance_savings_goals_one_active held every
 * user to one active goal, so it addressed "the" goal implicitly. #184 dropped
 * that index — people save for a deposit and an emergency reserve at once — and
 * the implicit addressing became unsafe:
 *
 *   PUT    resolved the goal with .maybeSingle(), which errors on two rows. The
 *          error was destructured away, so it read as "no goal exists" and
 *          inserted another one on every save.
 *   DELETE archived every active row, so removing a down-payment goal would
 *          have taken the emergency reserve with it.
 *
 * Every write now addresses exactly one row: by `id` when the caller names one,
 * otherwise the oldest active goal of that goal_type. Scoping the fallback by
 * type is what stops a down-payment save from overwriting a reserve.
 *
 * V2 (Phase 2): goals may link a plaid account (linked_account_id — the
 * account's live balance is the funded figure of record) and accept
 * per-period allocation records (finance_goal_allocations). GET with
 * `?progress=true` returns computeGoalProgress output per active goal plus
 * the multi-goal summary. All v1 fields and the v1 body shape are unchanged.
 */

/** Cap on goals returned — a sane upper bound, not a product limit. */
const MAX_GOALS = 50;

const SELECT_COLS =
  "id, user_id, name, goal_type, target_amount_cents, current_amount_cents, target_date, planned_monthly_contribution_cents, linked_decision_id, linked_account_id, status, created_at, updated_at";

/** Mirrors the finance_savings_goals_goal_type_check constraint. */
const GOAL_TYPES = [
  "emergency_reserve",
  "home",
  "vehicle",
  "education",
  "family",
  "travel",
  "custom",
] as const;

/** The dashboard card is a down-payment surface, so an untyped write is a home goal. */
const DEFAULT_GOAL_TYPE = "home";

const upsertSchema = z.object({
  /** Names the goal to write. Omitted by the single-goal dashboard card. */
  id: z.string().uuid().nullish(),
  name: z.string().trim().min(1).max(80),
  goal_type: z.enum(GOAL_TYPES).nullish(),
  target_amount: z.number().finite().positive().max(100_000_000),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  current_amount: z.number().finite().min(0).max(100_000_000).nullish(),
  planned_monthly_contribution: z.number().finite().min(0).max(100_000_000).nullish(),
  /** V2: link a plaid account as the balance of record. Must be one of the
   * caller's own accounts (checked below); null unlinks. Omitted = unchanged. */
  linked_account_id: z.string().uuid().nullish(),
});

function dollarsToCentsOrZero(dollars: number | null | undefined): number {
  if (dollars === null || dollars === undefined) return 0;
  return Math.round(dollars * 100);
}

function isInfraMissing(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code));
}

function serverError(scope: string, message: string) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-savings-goals:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save your goal right now.", correlationId },
    { status: 500 },
  );
}

/**
 * The id of the single goal an untyped write should address: the caller's
 * oldest active goal of this type. `.limit(1)` rather than `.maybeSingle()` —
 * more than one active goal is now normal and must not read as an error.
 */
async function oldestActiveGoalId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goalType: string,
): Promise<{ id: string | null; failed: boolean }> {
  const { data, error } = await supabase
    .from("finance_savings_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("goal_type", goalType)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error && !isInfraMissing(error)) return { id: null, failed: true };
  const rows = (data ?? []) as { id: string }[];
  return { id: rows[0]?.id ?? null, failed: false };
}

/**
 * GET /api/finance/savings-goals — the caller's active savings goals.
 * With `?progress=true`, each goal carries a `progress` object from
 * lib/finance/goals.ts (linked-account balance or allocation sums; null
 * projections when there is no trailing rate — never invented dates).
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-read:${ip}`, {
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

  const { data, error } = await supabase
    .from("finance_savings_goals")
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(MAX_GOALS);

  if (error) {
    if (isInfraMissing(error)) {
      return NextResponse.json({ goals: [], goal: null });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-savings-goals:get:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load your goals.", correlationId },
      { status: 500 },
    );
  }

  const goals = ((data ?? []) as FinanceSavingsGoalRow[]).map(rowToSavingsGoal);

  const url = new URL(request.url);
  if (url.searchParams.get("progress") !== "true") {
    // `goal` is kept for clients written against the single-goal response and
    // will be dropped once none remain; it is the first goal, not "the" goal.
    return NextResponse.json({ goals, goal: goals[0] ?? null });
  }

  const goalIds = goals.map((g) => g.id);
  const linkedAccountIds = goals
    .map((g) => g.linkedAccountId)
    .filter((id): id is string => id !== null);

  const [{ data: allocRows, error: allocError }, { data: accountRows, error: accountError }] =
    await Promise.all([
      goalIds.length > 0
        ? supabase
            .from("finance_goal_allocations")
            .select("goal_id, period_start, amount_cents")
            .eq("user_id", user.id)
            .in("goal_id", goalIds)
            .order("period_start", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      linkedAccountIds.length > 0
        ? supabase
            .from("plaid_accounts")
            .select("id, current_balance")
            .in("id", linkedAccountIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const [scope, err] of [
    ["allocations", allocError],
    ["accounts", accountError],
  ] as const) {
    if (err) {
      if (isInfraMissing(err)) {
        // Allocations table not migrated yet: goals still load, progress omitted.
        return NextResponse.json({ goals, goal: goals[0] ?? null, progress: null, deferred: true });
      }
      const correlationId = crypto.randomUUID();
      console.error(`[finance-savings-goals:get-${scope}:${correlationId}]`, err.message);
      return NextResponse.json(
        { error: "Could not load your goals.", correlationId },
        { status: 500 },
      );
    }
  }

  const allocations: GoalAllocation[] = (
    (allocRows ?? []) as { goal_id: string; period_start: string; amount_cents: number | string }[]
  ).map((row) => ({
    goalId: row.goal_id,
    periodStart: row.period_start,
    amountCents: Number(row.amount_cents),
  }));

  const linkedBalances = new Map<string, number | null>();
  for (const row of (accountRows ?? []) as { id: string; current_balance: number | null }[]) {
    // Floating plaid dollars → cents at the boundary; null stays null
    // (unknown balance is unknown, never zero).
    linkedBalances.set(
      row.id,
      row.current_balance === null ? null : dollarsToCents(row.current_balance),
    );
  }

  const asOfDate = new Date().toISOString().slice(0, 10);
  const summary = summarizeGoals(goals, allocations, linkedBalances, asOfDate);
  const progressByGoal = new Map(summary.goals.map((p) => [p.goalId, p]));

  return NextResponse.json({
    goals: goals.map((goal) => ({ ...goal, progress: progressByGoal.get(goal.id) ?? null })),
    goal: goals[0] ?? null,
    summary: {
      totalMonthlyAllocationCents: summary.totalMonthlyAllocationCents,
      activeGoalCount: summary.activeGoalCount,
      goalsWithProjection: summary.goalsWithProjection,
    },
  });
}

/**
 * PUT /api/finance/savings-goals — creates or updates one goal.
 *
 * With `id`, upserts that goal: updates the caller's row of that id, or creates
 * it under that id when they have none. Client-chosen ids are how the sync
 * layer keeps a goal's identity stable across devices, so the id has to survive
 * the round trip.
 *
 * Without `id`, writes the caller's oldest active goal of this `goal_type`, or
 * creates one when they have none of that type.
 */
export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-write:${ip}`, {
    limit: 20,
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

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A target amount greater than zero and a name are required." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const goalType = input.goal_type ?? DEFAULT_GOAL_TYPE;

  // V2: a linked account must be one of the caller's own plaid accounts.
  // RLS scopes the lookup; no row means not theirs (or not existing).
  if (input.linked_account_id) {
    const { data: account, error: accountError } = await supabase
      .from("plaid_accounts")
      .select("id")
      .eq("id", input.linked_account_id)
      .maybeSingle();
    if (accountError) {
      return serverError("put:linked-account", accountError.message);
    }
    if (!account) {
      return NextResponse.json(
        { error: "That account is not available to link." },
        { status: 400 },
      );
    }
  }

  let targetId: string | null = input.id ?? null;
  if (!targetId) {
    const found = await oldestActiveGoalId(supabase, user.id, goalType);
    if (found.failed) return serverError("put:resolve", "could not resolve the existing goal");
    targetId = found.id;
  }

  const nowIso = new Date().toISOString();
  const base = {
    user_id: user.id,
    name: input.name,
    goal_type: goalType,
    target_amount_cents: dollarsToCentsOrZero(input.target_amount),
    current_amount_cents: dollarsToCentsOrZero(input.current_amount),
    target_date: input.target_date ?? null,
    planned_monthly_contribution_cents: dollarsToCentsOrZero(input.planned_monthly_contribution),
    status: "active" as const,
    // linked_account_id only written when provided; omitted leaves the
    // existing link untouched (backward compatible with v1 clients).
    ...(input.linked_account_id !== undefined && input.linked_account_id !== null
      ? { linked_account_id: input.linked_account_id }
      : {}),
  };

  let result = null;
  if (targetId) {
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .update({ ...base, updated_at: nowIso })
      .eq("id", targetId)
      .eq("user_id", user.id)
      .select(SELECT_COLS)
      .single();

    // An id the caller named that matches no row of theirs falls through to an
    // insert *under that id*, because this is how a client creates a goal it
    // has already given an id to — the sync layer needs the id it chose to
    // survive the round trip. That is not the duplicate risk the unnamed path
    // has: the id is the identity, so a retry updates the row it just created
    // rather than making a second one.
    if (error || !data) {
      if (!input.id) return serverError("put", error?.message ?? "update returned no row");
    } else {
      result = data;
    }
  }

  if (!result) {
    const { data, error } = await supabase
      .from("finance_savings_goals")
      .insert({
        ...base,
        ...(input.id ? { id: input.id } : {}),
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(SELECT_COLS)
      .single();
    if (error || !data) {
      // The id exists and is not this caller's. Never a leak — user_id comes
      // from the session and the update above was scoped to it — but the
      // caller must pick another id rather than be told it succeeded.
      if (error?.code === "23505") {
        return NextResponse.json({ error: "That goal id is already taken." }, { status: 409 });
      }
      // A dangling linked account hits the V2 FK.
      if (error?.code === "23503") {
        return NextResponse.json(
          { error: "That account is not available to link." },
          { status: 400 },
        );
      }
      return serverError("put", error?.message ?? "insert returned no row");
    }
    result = data;
  }

  return NextResponse.json({ goal: rowToSavingsGoal(result as FinanceSavingsGoalRow) });
}

/**
 * DELETE /api/finance/savings-goals?id=<uuid> — archives one goal. Idempotent.
 *
 * Without `id`, archives the oldest active goal of `?goal_type=` (default
 * home) — one row, never the whole set. The previous unfiltered update archived
 * every active goal, which only looked correct while a unique index held each
 * user to one.
 */
export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-savings-goals-write:${ip}`, {
    limit: 20,
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
  const requestedId = url.searchParams.get("id");
  const goalTypeParam = url.searchParams.get("goal_type");
  const goalType = GOAL_TYPES.find((t) => t === goalTypeParam) ?? DEFAULT_GOAL_TYPE;

  let targetId = requestedId;
  if (!targetId) {
    const found = await oldestActiveGoalId(supabase, user.id, goalType);
    if (found.failed) {
      const correlationId = crypto.randomUUID();
      console.error(`[finance-savings-goals:delete:resolve:${correlationId}]`, "resolve failed");
      return NextResponse.json(
        { error: "Could not remove your goal right now.", correlationId },
        { status: 500 },
      );
    }
    // Nothing to archive is the state the caller asked for.
    if (!found.id) return NextResponse.json({ ok: true });
    targetId = found.id;
  }

  const { error } = await supabase
    .from("finance_savings_goals")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", targetId)
    .eq("user_id", user.id);

  if (error && !isInfraMissing(error)) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-savings-goals:delete:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not remove your goal right now.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
