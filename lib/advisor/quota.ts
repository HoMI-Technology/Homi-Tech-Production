import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserEntitlements } from "@/lib/entitlements";

/**
 * Server-authoritative gate for the AI Companion endpoints (advisor / twin /
 * trinity). Prefers the monthly-aware v2 consume RPC; falls back to daily-only
 * v1 when v2 isn't applied yet.
 *
 * Behavior:
 *  - Anonymous (no session) → 401 `auth_required`.
 *  - Signed-in → consume one message from the tier's daily+monthly quota.
 *  - Neither RPC applied → fail open (product stays up; IP limiter is the floor).
 *  - Other DB errors → fail closed with 503.
 */
export type CompanionGate =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

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

  // Prefer the monthly-aware v2 consume. If it isn't applied yet, fall back to
  // the daily-only v1 so a mid-migration deploy still enforces the daily cap.
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
      return { ok: true, userId };
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

  return { ok: true, userId };
}
