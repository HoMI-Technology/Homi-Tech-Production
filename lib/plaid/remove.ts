import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/crypto";

/**
 * Revokes every Plaid item a user has at Plaid itself (`/item/remove`), so
 * the bank linkage does not outlive the account. Row deletion is NOT done
 * here — the profiles ON DELETE CASCADE removes plaid_items/plaid_accounts
 * when the account is erased.
 *
 * Requires the service-role client: plaid_items has no authenticated
 * policies (by design — access_token_ct is service-role-only).
 *
 * Never throws; returns counts so the caller can fail the deletion loudly
 * when revocation didn't fully succeed (tokens must not be silently
 * orphaned at Plaid while we delete our copy of them).
 */
export async function revokeUserPlaidItems(
  db: SupabaseClient,
  userId: string,
): Promise<{ total: number; revoked: number; failed: number }> {
  const { data: items, error } = await db
    .from("plaid_items")
    .select("id, access_token_ct")
    .eq("user_id", userId);

  if (error) return { total: 0, revoked: 0, failed: 1 };
  if (!items || items.length === 0) return { total: 0, revoked: 0, failed: 0 };

  const credentials = getPlaidCredentials();
  if (!credentials) {
    // Items exist but Plaid isn't configured in this environment — we cannot
    // revoke, and deleting our rows anyway would orphan live tokens at Plaid.
    return { total: items.length, revoked: 0, failed: items.length };
  }

  let revoked = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = decryptToken(item.access_token_ct);
      const response = await plaidFetch("/item/remove", { access_token: accessToken }, credentials);
      if (response.ok) {
        revoked += 1;
        continue;
      }
      const body = (await response.json().catch(() => null)) as { error_code?: string } | null;
      if (body?.error_code === "ITEM_NOT_FOUND") {
        // Already removed at Plaid — the goal state, count it as revoked.
        revoked += 1;
      } else {
        failed += 1;
      }
    } catch {
      // Decryption or network failure — never log token material.
      failed += 1;
    }
  }

  return { total: items.length, revoked, failed };
}
