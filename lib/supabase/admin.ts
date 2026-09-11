import "server-only";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS, so it must never
 * be imported from client components; use it exclusively inside API routes /
 * server code for tables that have no authenticated write policies (e.g.
 * plaid_items / plaid_accounts, whose access_token_ct column is deliberately
 * unreachable from the user-scoped client).
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't configured so callers can
 * degrade gracefully (same contract as the webhook/email service helpers).
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
