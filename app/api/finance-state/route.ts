import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Postgres/PostgREST codes meaning "migration 00021 isn't applied yet". */
const INFRA_MISSING_CODES = new Set([
  "42P01", // undefined_table
  "PGRST205", // PostgREST: table not found in schema cache
]);

/**
 * Server side of the lib/persistence.ts contract for the manual Finance
 * dashboard state (audit T2.6). One row per user; last-write-wins by the
 * writing client's clock: a PUT carrying an older stamp than the stored row
 * is answered with `stale: true` plus the newer copy instead of clobbering
 * it. The read-compare-write window is acceptable for a single-author
 * resource — the loser of a same-user race converges on the next pull.
 *
 * Ownership is structural: user_id always comes from the session, and RLS
 * (00021) enforces the same rule in the database as defense-in-depth.
 */

const moneyLike = z.number().finite().min(-1_000_000_000).max(1_000_000_000);

const lineItemSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(80),
  amount: moneyLike,
});

/** Mirrors FinanceState (lib/finance/store.ts). Unknown keys are stripped. */
const financeStateSchema = z.object({
  monthlyIncome: moneyLike,
  monthlyExpenses: moneyLike,
  liquidSavings: moneyLike,
  totalDebt: moneyLike,
  monthlyDebtPayments: moneyLike,
  expenseCategories: z.array(lineItemSchema).max(100),
  downPaymentTarget: moneyLike,
  monteCarloYears: z.number().finite().min(0).max(100),
  expectedReturnPct: z.number().finite().min(-100).max(100),
  volatilityPct: z.number().finite().min(0).max(100),
  assets: z.array(lineItemSchema).max(200),
  liabilities: z.array(lineItemSchema).max(200),
});

const putSchema = z.object({
  state: financeStateSchema,
  // ms epoch, sanity-capped at year 2100.
  client_updated_at: z.number().int().min(0).max(4_102_444_800_000),
});

/** GET /api/finance-state — the caller's manual finance numbers, or null. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-state-read:${ip}`, { limit: 30, windowMs: 60_000 });
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
    .from("user_finance_state")
    .select("state, client_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      // Table not migrated yet — report honestly empty instead of erroring.
      return NextResponse.json({ state: null });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-state:get:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load your finance numbers.", correlationId },
      { status: 500 },
    );
  }

  if (!data) return NextResponse.json({ state: null });
  return NextResponse.json({
    state: data.state,
    // bigint arrives as a string from PostgREST.
    client_updated_at: Number(data.client_updated_at),
  });
}

/** PUT /api/finance-state — LWW upsert of the caller's manual numbers. */
export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-state-write:${ip}`, { limit: 30, windowMs: 60_000 });
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

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid finance state." }, { status: 400 });
  }

  // LWW guard: never let an older stamp overwrite a newer row.
  const { data: existing, error: readError } = await supabase
    .from("user_finance_state")
    .select("state, client_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError && !(readError.code && INFRA_MISSING_CODES.has(readError.code))) {
    const correlationId = crypto.randomUUID();
    console.error(`[finance-state:put-read:${correlationId}]`, readError.message);
    return NextResponse.json(
      { error: "Could not save your finance numbers.", correlationId },
      { status: 500 },
    );
  }

  if (existing && Number(existing.client_updated_at) > parsed.data.client_updated_at) {
    return NextResponse.json({
      stale: true,
      state: existing.state,
      client_updated_at: Number(existing.client_updated_at),
    });
  }

  const { error } = await supabase.from("user_finance_state").upsert(
    {
      user_id: user.id,
      state: parsed.data.state,
      client_updated_at: parsed.data.client_updated_at,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      // Table not migrated yet — the client keeps its local copy and retries
      // on a later edit; tell it "accepted" so it doesn't error the UI.
      return NextResponse.json({ ok: true, deferred: true });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-state:put:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not save your finance numbers.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
