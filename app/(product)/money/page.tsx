import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MoneyWorkspaceV4 } from "@/components/v4/money/MoneyWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import {
  hardStopCodes,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import {
  buildMoneyV4View,
  parseV4MoneyVisualState,
  moneyV4VisualView,
  type MoneyV4SourceAccount,
  type MoneyV4SourceItem,
} from "@/lib/v4/money-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Money",
  description:
    "Where cash sits — live connected accounts only. Educational. Facts under the verdict.",
  robots: { index: false, follow: false },
};

const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lastMoneyMonths(inputs: Record<string, unknown> | null): number | null {
  if (!inputs) return null;
  const money: LastReadMoneyInputs = {
    debtToIncomeRatio: finiteNumber(inputs.debtToIncomeRatio),
    emergencyFundMonths: finiteNumber(inputs.emergencyFundMonths),
    savingsRate: finiteNumber(inputs.savingsRate),
    liquidDollars: finiteNumber(inputs.liquidDollars) ?? finiteNumber(inputs.liquidSavings),
  };
  return money.emergencyFundMonths;
}

/**
 * Money v4 — V4_PENDING `/money` in Shell v4 `main#main`.
 * Live Plaid rows only. UI adapts; tokens/math stay. Never writes a score.
 */
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4MoneyVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <MoneyWorkspaceV4 view={moneyV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const [assessmentsR, itemsR] = await Promise.all([
    user
      ? supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as AssessmentRow[], error: null }),
    user
      ? supabase
          .from("plaid_items")
          .select("id, institution_name, status, last_successful_sync")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as MoneyV4SourceItem[], error: null }),
  ]);

  const latest = (assessmentsR.data ?? [])[0] ?? null;
  const itemsError = itemsR.error;
  const itemsMissing =
    itemsError?.code != null && INFRA_MISSING_CODES.has(itemsError.code);
  const loadError = Boolean(itemsError && !itemsMissing);
  const items = (itemsMissing ? [] : ((itemsR.data ?? []) as MoneyV4SourceItem[]));

  let accounts: MoneyV4SourceAccount[] = [];
  if (user && items.length > 0) {
    const accountsR = await supabase
      .from("plaid_accounts")
      .select(
        "id, item_id, name, type, subtype, current_balance, available_balance, iso_currency",
      )
      .in(
        "item_id",
        items.map((item) => item.id).filter((id): id is string => typeof id === "string"),
      );
    if (accountsR.error) {
      accounts = [];
    } else {
      accounts = (accountsR.data ?? []) as MoneyV4SourceAccount[];
    }
  }

  const stopCodes = hardStopCodes(latest?.hard_stops);

  const view = buildMoneyV4View({
    decisionType: latest?.decision_type ?? undefined,
    verdict: (latest?.verdict as VerdictKey | null) ?? null,
    stopCode: latest ? leadingFoldHardStopCode(stopCodes) : null,
    lastMoneyMonths: lastMoneyMonths(latest?.inputs ?? null),
    items,
    accounts,
    loadError,
  });

  return <MoneyWorkspaceV4 view={view} />;
}
