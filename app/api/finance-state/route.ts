import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Postgres/PostgREST codes meaning "migration 00023 isn't applied yet". */
const INFRA_MISSING_CODES = new Set([
  "42P01", // undefined_table
  "PGRST205", // PostgREST: table not found in schema cache
]);

/**
 * Server side of the lib/persistence.ts contract for the LEGACY manual
 * Finance snapshot (migration 00023). One row per user.
 *
 * Phase-3 kill (docs/ops/MONEY-LEDGER-MIGRATION.md, kill date 2026-09-15):
 * this route is now READ-ONLY. The budget ledger (`finance_*` tables,
 * app/api/finance/*) is the money SSOT and the only writable store; the
 * Phase-1 dual-write was removed with it. GET stays live during the
 * transition window so the one-time legacy → ledger import
 * (lib/finance/migrate-from-legacy.ts) and old clients can still read the
 * historical snapshot. PUT answers 410 — no app code writes
 * `user_finance_state` anymore.
 *
 * Ownership is structural: user_id always comes from the session, and RLS
 * (00023) enforces the same rule in the database as defense-in-depth.
 */

/** GET /api/finance-state — the caller's manual finance numbers, or null. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-state-read:${ip}`, { limit: 30, windowMs: 60_000 });
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

/**
 * PUT /api/finance-state — retired at the Phase-3 kill. The ledger is the
 * only writable money store; legacy snapshots are historical read-only data.
 * Accepts (and ignores) the request so stale clients fail harmlessly.
 */
export async function PUT(_request: Request) {
  return NextResponse.json(
    {
      error: "The legacy finance snapshot is read-only. Money writes now go to the budget ledger.",
      replacedBy: "/api/finance/transactions",
    },
    { status: 410 },
  );
}
