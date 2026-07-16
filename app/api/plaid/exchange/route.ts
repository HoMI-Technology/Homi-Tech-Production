import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { encryptToken } from "@/lib/plaid/crypto";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  public_token: z.string().min(1),
});

/** Shape of an account object from Plaid /accounts/get (subset we persist). */
interface PlaidAccountPayload {
  account_id: string;
  name: string;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balances?: {
    current?: number | null;
    available?: number | null;
    iso_currency_code?: string | null;
  };
}

/**
 * POST /api/plaid/exchange — exchanges a Plaid Link public_token for a
 * permanent access_token + item_id, then persists the connection:
 *   • plaid_items — access token stored ONLY as AES-256-GCM ciphertext
 *     (lib/plaid/crypto.ts), upserted on item_id via the service-role client
 *     (the table has no authenticated write policies by design).
 *   • plaid_accounts — the item's accounts from /accounts/get.
 * Institution metadata comes from /item/get. Auth required; gated on the
 * bankSync capability. The plaintext access_token is never logged and never
 * leaves this handler.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`plaid-exchange:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const response = await plaidFetch(
      "/item/public_token/exchange",
      { public_token: parsed.data.public_token },
      credentials,
    );

    if (!response.ok) {
      const details = await response.text();
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/exchange:${correlationId}]`, details);
      return NextResponse.json(
        { error: "Plaid token exchange failed.", correlationId },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { access_token?: string; item_id?: string };
    if (!data.access_token || !data.item_id) {
      return NextResponse.json(
        { error: "Plaid did not return an access_token/item_id." },
        { status: 502 },
      );
    }

    // Enrichment is best-effort: a failed /item/get or /accounts/get must not
    // lose the access_token we just exchanged — the sync path (Session 2)
    // refreshes institution metadata and accounts anyway.
    let institutionId: string | null = null;
    let institutionName: string | null = null;
    let accounts: PlaidAccountPayload[] = [];
    try {
      const itemRes = await plaidFetch("/item/get", { access_token: data.access_token }, credentials);
      if (itemRes.ok) {
        const itemData = (await itemRes.json()) as {
          item?: { institution_id?: string | null; institution_name?: string | null };
        };
        institutionId = itemData.item?.institution_id ?? null;
        institutionName = itemData.item?.institution_name ?? null;
      }
      const accountsRes = await plaidFetch("/accounts/get", { access_token: data.access_token }, credentials);
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as { accounts?: PlaidAccountPayload[] };
        accounts = accountsData.accounts ?? [];
      }
    } catch {
      // Best-effort only — persist the item regardless.
    }

    const admin = createAdminClient();
    if (!admin) {
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/exchange:${correlationId}] SUPABASE_SERVICE_ROLE_KEY missing — cannot store connection`);
      return NextResponse.json(
        { error: "Bank connections are not available right now.", correlationId },
        { status: 503 },
      );
    }

    let accessTokenCt: string;
    try {
      accessTokenCt = encryptToken(data.access_token);
    } catch (err) {
      const correlationId = crypto.randomUUID();
      // Log only the error message — never the token itself.
      console.error(
        `[plaid/exchange:${correlationId}] token encryption failed:`,
        err instanceof Error ? err.message : "unknown error",
      );
      return NextResponse.json(
        { error: "Bank connections are not available right now.", correlationId },
        { status: 503 },
      );
    }

    // Ownership guard: an item_id already claimed by a DIFFERENT user must
    // never be silently transferred by the upsert — that would hand user A's
    // bank connection (and future syncs) to user B. Conflict is a hard 409.
    const { data: existingItem } = await admin
      .from("plaid_items")
      .select("user_id")
      .eq("item_id", data.item_id)
      .maybeSingle();
    if (existingItem && existingItem.user_id !== userId) {
      const correlationId = crypto.randomUUID();
      console.error(
        `[plaid/exchange:${correlationId}] item_id already linked to another user — refusing ownership transfer`,
      );
      return NextResponse.json(
        { error: "This bank connection is already linked to another account.", correlationId },
        { status: 409 },
      );
    }

    const { data: itemRow, error: itemError } = await admin
      .from("plaid_items")
      .upsert(
        {
          user_id: userId,
          item_id: data.item_id,
          access_token_ct: accessTokenCt,
          key_version: 1,
          institution_id: institutionId,
          institution_name: institutionName,
          status: "healthy",
        },
        { onConflict: "item_id" },
      )
      .select("id")
      .single();

    if (itemError || !itemRow) {
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/exchange:${correlationId}] plaid_items upsert failed`, itemError?.message);
      return NextResponse.json(
        { error: "Could not save the bank connection.", correlationId },
        { status: 500 },
      );
    }

    if (accounts.length > 0) {
      const accountRows = accounts.map((account) => ({
        item_id: itemRow.id,
        account_id: account.account_id,
        name: account.name,
        mask: account.mask ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        current_balance: account.balances?.current ?? null,
        available_balance: account.balances?.available ?? null,
        iso_currency: account.balances?.iso_currency_code ?? null,
      }));
      const { error: accountsError } = await admin
        .from("plaid_accounts")
        .upsert(accountRows, { onConflict: "account_id" });
      if (accountsError) {
        // The item (and token) are saved; accounts refresh on the next sync.
        const correlationId = crypto.randomUUID();
        console.error(`[plaid/exchange:${correlationId}] plaid_accounts upsert failed`, accountsError.message);
      }
    }

    try {
      await supabase.from("audit_log").insert({
        user_id: userId,
        action_type: "plaid_exchange",
        metadata: { item_id: data.item_id, institution_id: institutionId },
      });
    } catch {
      // Audit logging is best-effort — never block the user on it.
    }

    return NextResponse.json({
      ok: true,
      item_id: data.item_id,
      institution_name: institutionName,
      accounts_count: accounts.length,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Plaid." }, { status: 502 });
  }
}
