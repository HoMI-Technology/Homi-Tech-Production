import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToRecurringRule,
  rowToTransaction,
  type FinanceRecurringRuleRow,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";
import {
  addDays,
  recurringGenerationKey,
  rulesDueInWindow,
} from "@/lib/finance/recurring";

export const runtime = "nodejs";

const RULE_COLS =
  "id, user_id, type, amount_cents, description, category_id, cadence, start_date, next_occurrence_date, end_date, generation_mode, is_active, detection_source, detection_confidence, created_at, updated_at, deleted_at";

const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

const bodySchema = z
  .object({
    /** How far ahead to generate. Default 31 days, max 92. */
    windowDays: z.number().int().min(1).max(92).default(31),
    /** Date-only window start; defaults to the server's current date. */
    fromDate: z.iso.date().optional(),
  })
  .strict()
  .default({ windowDays: 31 });

function serverError(scope: string, message: string | undefined) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-recurring-generate:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not generate recurring transactions right now.", correlationId },
    { status: 500 },
  );
}

/**
 * POST /api/finance/recurring-rules/generate
 *
 * For each active rule with generationMode = "create_pending", creates
 * `status: "pending"` transactions (source "recurring_rule") for the rule's
 * occurrences in the window. forecast_only rules are skipped — they feed the
 * forecast module only and must never write transactions.
 *
 * Idempotent: each occurrence's external_transaction_id is the stable dedupe
 * key `rr-<ruleId>-<date>`, so retries and regeneration never duplicate.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-recurring-generate:${ip}`, {
    limit: 10,
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

  let json: unknown = {};
  if (request.headers.get("content-length") !== "0") {
    try {
      const text = await request.text();
      json = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fromDate = parsed.data.fromDate ?? new Date().toISOString().slice(0, 10);
  const toDate = addDays(fromDate, parsed.data.windowDays - 1);

  const { data: ruleRows, error: rulesError } = await supabase
    .from("finance_recurring_rules")
    .select(RULE_COLS)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("is_active", true)
    .eq("generation_mode", "create_pending")
    .limit(100);

  if (rulesError) {
    if (rulesError.code && FINANCE_LEDGER_INFRA_MISSING.has(rulesError.code)) {
      return NextResponse.json({ deferred: true, created: 0, skipped: 0 }, { status: 202 });
    }
    return serverError("rules-read", rulesError.message);
  }

  const rules = ((ruleRows ?? []) as FinanceRecurringRuleRow[]).map(rowToRecurringRule);
  const due = rulesDueInWindow(rules, { fromDate, toDate });

  // Existing generated rows in the window → skip set.
  const { data: existingRows, error: existingError } = await supabase
    .from("finance_transactions")
    .select("external_transaction_id")
    .eq("user_id", user.id)
    .eq("source", "recurring_rule")
    .gte("transaction_date", fromDate)
    .lte("transaction_date", toDate)
    .like("external_transaction_id", "rr-%");

  if (existingError) {
    if (existingError.code && FINANCE_LEDGER_INFRA_MISSING.has(existingError.code)) {
      return NextResponse.json({ deferred: true, created: 0, skipped: 0 }, { status: 202 });
    }
    return serverError("existing-read", existingError.message);
  }

  const existingKeys = new Set(
    ((existingRows ?? []) as { external_transaction_id: string | null }[])
      .map((row) => row.external_transaction_id)
      .filter((key): key is string => key !== null),
  );

  const created: ReturnType<typeof rowToTransaction>[] = [];
  let skipped = 0;

  for (const { rule, dates } of due) {
    for (const date of dates) {
      const key = recurringGenerationKey(rule.id, date);
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      const insertRow = {
        id: crypto.randomUUID(),
        user_id: user.id,
        type: rule.type,
        status: "pending" as const,
        amount_cents: rule.amountCents,
        currency: "USD",
        description: rule.description,
        merchant_name: null,
        category_id: rule.categoryId,
        account_id: null,
        transaction_date: date,
        posted_at: null,
        source: "recurring_rule" as const,
        external_transaction_id: key,
        recurring_rule_id: rule.id,
        transfer_group_id: null,
        parent_transaction_id: null,
        is_excluded_from_budget: false,
        user_note: null,
      };
      const { data: createdRow, error: insertError } = await supabase
        .from("finance_transactions")
        .insert(insertRow)
        .select(TX_COLS)
        .single();

      if (insertError || !createdRow) {
        // Unique violation on a concurrent run — the row now exists, which
        // is the state we wanted; count it as skipped, not an error.
        if (insertError?.code === "23505") {
          skipped += 1;
          continue;
        }
        if (insertError?.code && FINANCE_LEDGER_INFRA_MISSING.has(insertError.code)) {
          return NextResponse.json({ deferred: true, created: 0, skipped: 0 }, { status: 202 });
        }
        return serverError("create", insertError?.message);
      }

      existingKeys.add(key);
      created.push(rowToTransaction(createdRow as FinanceTransactionRow));
    }
  }

  return NextResponse.json({ created: created.length, skipped, transactions: created });
}
