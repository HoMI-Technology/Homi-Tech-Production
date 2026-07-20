import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserEntitlements } from "@/lib/entitlements";

/**
 * Server-authoritative gate for the AI Companion endpoints (advisor / twin /
 * trinity). Replaces the earlier boolean hard-gate, which returned 402 to every
 * non-paying user and — because the globally-mounted CompanionWidget can't parse
 * that response — surfaced as a fake "something interrupted that thought" error
 * across the whole product surface, including anonymous public pages.
 *
 * Behavior:
 *  - Anonymous (no session) → 401 `auth_required`. The client renders a sign-in
 *    CTA: for the Companion, "sign in to keep talking" IS the conversion moment.
 *  - Signed-in → consume one message from the tier's daily quota via an atomic
 *    Postgres RPC (try_consume_advisor_message). Over quota → 402 `over_quota`,
 *    which the client renders as an upgrade nudge.
 *  - Usage infra not yet applied (migration 00013 pending the T0.6 repair) → the
 *    RPC is missing; we FAIL OPEN and allow, so the Companion keeps working and
 *    quota enforcement switches on automatically the moment the migration lands.
 *    Spend during that window stays bounded by each route's per-IP limiter.
 *  - Any other DB error → fail closed with 503 to protect LLM spend, logged with
 *    a correlation id.
 *
 * Returns a discriminated union so callers do: `if (!gate.ok) return gate.response;`
 */
export type CompanionGate = { ok: true } | { ok: false; response: NextResponse };

/** Postgres/PostgREST codes that mean "the usage infra isn't there yet". */
const INFRA_MISSING_CODES = new Set([
  "42883", // undefined_function
  "42P01", // undefined_table
  "PGRST202", // PostgREST: function not found in schema cache
  "PGRST205", // PostgREST: table not found in schema cache
]);

export async function gateCompanion(supabase: SupabaseClient): Promise<CompanionGate> {
  const { userId, entitlements } = await getUserEntitlements(supabase);

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in to talk with your Companion.", code: "auth_required" },
        { status: 401 },
      ),
    };
  }

  // Prefer the monthly-aware v2 consume (00023). If it isn't applied yet, fall
  // back to the daily-only v1 (00013) so a mid-migration deploy still enforces
  // the daily cap instead of failing open entirely.
  let { data, error } = await supabase.rpc("try_consume_advisor_message_v2", {
    p_daily_limit: entitlements.advisorMessagesPerDay,
    p_monthly_limit: entitlements.advisorMessagesPerMonth,
  });

  if (error && error.code && INFRA_MISSING_CODES.has(error.code)) {
    ({ data, error } = await supabase.rpc("try_consume_advisor_message", {
      p_limit: entitlements.advisorMessagesPerDay,
    }));
  }

  if (error) {
    if (error.code && INFRA_MISSING_CODES.has(error.code)) {
      // Neither quota RPC is applied yet — don't block the product.
      return { ok: true };
    }
    const correlationId = crypto.randomUUID();
    console.error(`[companion-gate:${correlationId}] usage rpc failed`, error.code, error.message);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Couldn't reach your Companion. Try again in a moment.", code: "gate_error", correlationId },
        { status: 503 },
      ),
    };
  }

  if (data === false) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "You've used today's Companion messages. Upgrade to keep going.",
          code: "over_quota",
        },
        { status: 402 },
      ),
    };
  }

  return { ok: true };
}
