import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { recurringRuleCreateSchema } from "@/lib/finance/validation";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToRecurringRule,
  type FinanceRecurringRuleRow,
} from "@/lib/finance/db-map";

export const runtime = "nodejs";

const SELECT_COLS =
  "id, user_id, type, amount_cents, description, category_id, cadence, start_date, next_occurrence_date, end_date, generation_mode, is_active, detection_source, detection_confidence, created_at, updated_at, deleted_at";

const MAX_RULES = 100;

function serverError(scope: string, message: string | undefined) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-recurring-rules:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not save the recurring rule right now.", correlationId },
    { status: 500 },
  );
}

/**
 * GET /api/finance/recurring-rules — the caller's live rules (soft-deleted
 * excluded), next occurrence first.
 *
 * POST /api/finance/recurring-rules — create a manual rule with idempotency.
 * A rule is a forecast plan, not a transaction; posting it never writes to
 * finance_transactions. plaid_detected rows are server-owned.
 */

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-recurring-rules-read:${ip}`, {
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
  const includeDeleted = url.searchParams.get("includeDeleted") === "1";

  let query = supabase
    .from("finance_recurring_rules")
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .order("next_occurrence_date", { ascending: true })
    .limit(MAX_RULES);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ rules: [], deferred: true });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-recurring-rules:list:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load recurring rules.", correlationId },
      { status: 500 },
    );
  }

  const rules = ((data ?? []) as FinanceRecurringRuleRow[]).map(rowToRecurringRule);
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-recurring-rules-write:${ip}`, {
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

  const parsed = recurringRuleCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recurring rule.", details: parsed.error.flatten() },
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
    .from("finance_recurring_rules")
    .insert({
      id: input.id,
      user_id: user.id,
      type: input.type,
      amount_cents: input.amountCents,
      description: input.description,
      category_id: input.categoryId,
      cadence: input.cadence,
      start_date: input.startDate,
      next_occurrence_date: input.nextOccurrenceDate,
      end_date: input.endDate ?? null,
      generation_mode: input.generationMode,
      is_active: input.isActive,
      detection_source: "manual" as const,
      detection_confidence: null,
    })
    .select(SELECT_COLS)
    .single();

  if (insertError || !created) {
    if (insertError?.code && FINANCE_LEDGER_INFRA_MISSING.has(insertError.code)) {
      // Migration not applied — client keeps its local rules.
      return NextResponse.json({ deferred: true, rule: null }, { status: 202 });
    }
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "Recurring rule id already exists." }, { status: 409 });
    }
    return serverError("create", insertError?.message);
  }

  const rule = rowToRecurringRule(created as FinanceRecurringRuleRow);
  const body = { rule };
  const status = 201;

  // Best-effort idempotency record — if this fails we still return the create.
  await supabase.from("finance_mutation_idempotency").insert({
    user_id: user.id,
    idempotency_key: input.idempotencyKey,
    resource_type: "recurring_rule",
    resource_id: rule.id,
    response_status: status,
    response_body: body,
  });

  return NextResponse.json(body, { status });
}
