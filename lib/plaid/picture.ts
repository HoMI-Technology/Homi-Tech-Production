/**
 * Pulls Identity, Investments, and Liabilities for one Item after
 * Transactions sync. Soft-skips Plaid errors that mean "this Item does not
 * have that product / those accounts" so a checking-only link never fails
 * the cash-flow sync.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/crypto";
import { mapIdentityOwners } from "@/lib/plaid/identity";
import {
  mapHoldingRow,
  mapInvestmentTransactionRow,
  mapSecurityRow,
  type PlaidHoldingInput,
  type PlaidInvestmentTxnInput,
  type PlaidSecurityInput,
} from "@/lib/plaid/investments";
import {
  anyAccountNeedsInvestments,
  anyAccountNeedsLiabilities,
} from "@/lib/plaid/products";
import type { SyncableItem } from "@/lib/plaid/sync";

const SKIPPABLE = new Set([
  "PRODUCTS_NOT_SUPPORTED",
  "PRODUCT_NOT_READY",
  "PRODUCT_NOT_ENABLED",
  "NO_INVESTMENT_ACCOUNTS",
  "NO_LIABILITY_ACCOUNTS",
  "ADDITIONAL_CONSENT_REQUIRED",
  "ACCESS_NOT_GRANTED",
]);

const INV_TXN_PAGE = 500;

export interface PictureOutcome {
  identityAccounts: number;
  holdings: number;
  investmentTransactions: number;
  liabilities: number;
}

interface NamedAccount {
  account_id: string;
  type?: string | null;
  subtype?: string | null;
  owners?: Parameters<typeof mapIdentityOwners>[0]["accounts"][number]["owners"];
}

async function plaidJson(
  path: string,
  body: Record<string, unknown>,
  credentials: NonNullable<ReturnType<typeof getPlaidCredentials>>,
): Promise<{ ok: true; data: unknown } | { ok: false; skipped: boolean; code?: string }> {
  const res = await plaidFetch(path, body, credentials);
  if (res.ok) return { ok: true, data: await res.json() };
  let code: string | undefined;
  try {
    code = ((await res.json()) as { error_code?: string }).error_code;
  } catch {
    // ignore
  }
  return { ok: false, skipped: Boolean(code && SKIPPABLE.has(code)), code };
}

export async function syncItemPicture(
  admin: SupabaseClient,
  item: SyncableItem,
  accounts: NamedAccount[],
): Promise<PictureOutcome> {
  const credentials = getPlaidCredentials();
  if (!credentials) {
    return { identityAccounts: 0, holdings: 0, investmentTransactions: 0, liabilities: 0 };
  }
  const accessToken = decryptToken(item.access_token_ct);
  const outcome: PictureOutcome = {
    identityAccounts: 0,
    holdings: 0,
    investmentTransactions: 0,
    liabilities: 0,
  };

  const identity = await plaidJson("/identity/get", { access_token: accessToken }, credentials);
  if (identity.ok) {
    const data = identity.data as { accounts?: NamedAccount[] };
    const rows = mapIdentityOwners({
      itemId: item.id,
      userId: item.user_id,
      accounts: data.accounts ?? [],
    });
    if (rows.length > 0) {
      const { error } = await admin
        .from("plaid_account_owners")
        .upsert(rows, { onConflict: "account_id" });
      if (!error) outcome.identityAccounts = rows.length;
    }
  }

  if (anyAccountNeedsInvestments(accounts)) {
    const holdingsRes = await plaidJson(
      "/investments/holdings/get",
      { access_token: accessToken },
      credentials,
    );
    if (holdingsRes.ok) {
      const data = holdingsRes.data as {
        holdings?: PlaidHoldingInput[];
        securities?: PlaidSecurityInput[];
      };
      const securities = (data.securities ?? []).map(mapSecurityRow);
      if (securities.length > 0) {
        await admin.from("plaid_securities").upsert(securities, { onConflict: "security_id" });
      }
      await admin.from("plaid_holdings").delete().eq("item_id", item.id);
      const holdingRows = (data.holdings ?? []).map((holding) =>
        mapHoldingRow({ id: item.id, user_id: item.user_id }, holding),
      );
      if (holdingRows.length > 0) {
        const { error } = await admin.from("plaid_holdings").insert(holdingRows);
        if (!error) outcome.holdings = holdingRows.length;
      }
    }

    const startDate = new Date();
    startDate.setUTCFullYear(startDate.getUTCFullYear() - 2);
    const endDate = new Date().toISOString().slice(0, 10);
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    let stored = 0;
    while (offset < total) {
      const page = await plaidJson(
        "/investments/transactions/get",
        {
          access_token: accessToken,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate,
          options: { count: INV_TXN_PAGE, offset },
        },
        credentials,
      );
      if (!page.ok) break;
      const data = page.data as {
        investment_transactions?: PlaidInvestmentTxnInput[];
        securities?: PlaidSecurityInput[];
        total_investment_transactions?: number;
      };
      const moreSecurities = (data.securities ?? []).map(mapSecurityRow);
      if (moreSecurities.length > 0) {
        await admin.from("plaid_securities").upsert(moreSecurities, { onConflict: "security_id" });
      }
      const rows = (data.investment_transactions ?? []).map((txn) =>
        mapInvestmentTransactionRow({ id: item.id, user_id: item.user_id }, txn),
      );
      if (rows.length > 0) {
        const { error } = await admin
          .from("plaid_investment_transactions")
          .upsert(rows, { onConflict: "investment_transaction_id" });
        if (!error) stored += rows.length;
      }
      total = data.total_investment_transactions ?? offset + rows.length;
      if (rows.length === 0) break;
      offset += rows.length;
    }
    outcome.investmentTransactions = stored;
  }

  if (anyAccountNeedsLiabilities(accounts)) {
    const liab = await plaidJson("/liabilities/get", { access_token: accessToken }, credentials);
    if (liab.ok) {
      const data = liab.data as {
        liabilities?: {
          credit?: Array<{ account_id?: string } & Record<string, unknown>>;
          student?: Array<{ account_id?: string } & Record<string, unknown>>;
          mortgage?: Array<{ account_id?: string } & Record<string, unknown>>;
        };
      };
      const rows: Record<string, unknown>[] = [];
      for (const [kind, list] of [
        ["credit", data.liabilities?.credit ?? []],
        ["student", data.liabilities?.student ?? []],
        ["mortgage", data.liabilities?.mortgage ?? []],
      ] as const) {
        for (const entry of list) {
          if (!entry.account_id) continue;
          rows.push({
            item_id: item.id,
            user_id: item.user_id,
            account_id: entry.account_id,
            kind,
            payload: entry,
            updated_at: new Date().toISOString(),
          });
        }
      }
      if (rows.length > 0) {
        const { error } = await admin
          .from("plaid_liabilities")
          .upsert(rows, { onConflict: "account_id" });
        if (!error) outcome.liabilities = rows.length;
      }
    }
  }

  return outcome;
}

export async function syncItemPictureFromDb(
  admin: SupabaseClient,
  item: SyncableItem,
): Promise<PictureOutcome> {
  const { data } = await admin
    .from("plaid_accounts")
    .select("account_id, type, subtype")
    .eq("item_id", item.id);
  return syncItemPicture(admin, item, data ?? []);
}
