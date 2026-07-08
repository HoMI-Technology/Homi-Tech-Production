import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/plaid/accounts — lists connected bank accounts.
 *
 * TODO(bank-sync-ga): there is no `plaid_items` table yet to store
 * access_tokens (see app/api/plaid/exchange/route.ts), so there is
 * nothing to look up here. Once that table exists, this route should
 * fetch the user's stored items, call Plaid's /accounts/get for each,
 * and return the real account list.
 *
 * For now this always reports an empty, unconfigured list so the
 * client renders its "coming soon" / manual-entry state honestly.
 */
export async function GET() {
  return NextResponse.json({ configured: false, accounts: [] });
}
