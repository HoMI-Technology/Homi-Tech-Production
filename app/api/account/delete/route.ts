import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { revokeUserPlaidItems } from "@/lib/plaid/remove";

/**
 * POST /api/account/delete — full account erasure.
 *
 * Order matters, and every failure is loud (audit fix — the previous
 * implementation's profiles delete silently matched 0 rows under RLS and
 * the route reported "Data deleted" regardless):
 *
 *   1. Revoke Plaid items AT PLAID first (`/item/remove`). If revocation
 *      fails we stop before deleting anything — otherwise our copy of the
 *      tokens would be erased while the bank linkage stays live at Plaid.
 *   2. Service-role `auth.admin.deleteUser()`: auth.users → profiles →
 *      ON DELETE CASCADE erases every user table (00002/00017).
 *   3. Fallback without a service key: delete the caller's own profiles row
 *      (policy `profiles_delete_own`, migration 00026) — same cascade for
 *      data rows — and say honestly that the sign-in credential remains.
 *
 * Success is only ever reported after verifying rows were actually removed.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`account-delete:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = user.id;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    try {
      const admin = createSupabaseJsClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Revoke bank linkage at Plaid before touching any rows. On failure
      //    nothing has been deleted, so the user can simply retry.
      const plaid = await revokeUserPlaidItems(admin, userId);
      if (plaid.failed > 0) {
        return NextResponse.json(
          {
            error:
              "We couldn't disconnect your linked bank accounts. Nothing was deleted — try again in a moment.",
          },
          { status: 502 },
        );
      }

      // 2. Erase the auth user; profiles + every user table cascade from it.
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        return NextResponse.json(
          { error: "Account deletion failed. Nothing was removed — try again or contact support." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        authUserRemoved: true,
        plaidItemsRevoked: plaid.revoked,
      });
    } catch {
      return NextResponse.json(
        { error: "Account deletion failed. Nothing was removed — try again or contact support." },
        { status: 500 },
      );
    }
  }

  // Fallback (no service role configured): erase the data tree via the
  // caller's own profiles row. Verify rows-affected — a silent 0-row delete
  // must never be reported as success.
  const { data: deleted, error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .select("id");

  if (deleteError || !deleted || deleted.length === 0) {
    return NextResponse.json(
      { error: "Account deletion failed. Nothing was removed — try again or contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    authUserRemoved: false,
    note: "Your data has been erased. Your sign-in credential could not be removed automatically — contact support to finish removing it, and re-link any bank accounts you reconnect in future.",
  });
}
