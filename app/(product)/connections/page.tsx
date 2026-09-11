import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountsWorkspaceV4 } from "@/components/v4/accounts/AccountsWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  accountsV4VisualView,
  buildAccountsV4View,
  parseV4AccountsVisualState,
  type AccountsV4SourceAccount,
  type AccountsV4SourceItem,
} from "@/lib/v4/accounts-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Live bank connections — manage or disconnect. Never invent balances here.",
  robots: { index: false, follow: false },
};

const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

/**
 * Accounts v4 — V4_PENDING `/connections`. Plaid manage REUSE. Age honesty.
 * Never invent balances. Never writes a score.
 */
export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4AccountsVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <AccountsWorkspaceV4 view={accountsV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  const supabase = await getCachedClient();
  const reading = await loadSystemV4LastRead();

  const itemsR = user
    ? await supabase
        .from("plaid_items")
        .select("id, institution_name, status, last_successful_sync")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    : { data: [] as AccountsV4SourceItem[], error: null };

  const itemsError = itemsR.error;
  const itemsMissing = itemsError?.code != null && INFRA_MISSING_CODES.has(itemsError.code);
  const items = (itemsMissing ? [] : ((itemsR.data ?? []) as AccountsV4SourceItem[]));

  let accounts: AccountsV4SourceAccount[] = [];
  if (user && items.length > 0) {
    const accountsR = await supabase
      .from("plaid_accounts")
      .select("id, item_id, name, mask, type, subtype")
      .in(
        "item_id",
        items.map((item) => item.id).filter((id): id is string => typeof id === "string"),
      );
    if (!accountsR.error) {
      accounts = (accountsR.data ?? []) as AccountsV4SourceAccount[];
    }
  }

  const view = buildAccountsV4View({
    decisionType: reading?.decisionType,
    verdict: reading?.verdict ?? null,
    stopCode: reading?.stopCode ?? null,
    lastMoneyMonths: reading?.lastMoneyMonths,
    items,
    accounts,
  });

  return <AccountsWorkspaceV4 view={view} />;
}
