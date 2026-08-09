import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { getCachedClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";
import { formatCurrency, formatCurrencyTile } from "@/lib/tools/format";
import { buildFinanceContextFromLedgerTables } from "@/lib/advisor/finance-context";
import {
  netWorthDelta,
  netWorthTrend,
  snapshotLiquidSavings,
  type ItemReading,
  type SnapshotReading,
} from "@/lib/dashboard/financial-position";
import {
  buildLedgerDashboardView,
  netWorthTileState,
} from "@/lib/dashboard/financial-position-ledger";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatTile } from "@/components/ui/StatTile";
import { Reveal } from "@/components/ui/Reveal";
import { BankConnectCard } from "@/components/dashboard/BankConnectCard";
import { ConnectionsTile } from "@/components/dashboard/ConnectionsTile";
import { GoalCard, type LedgerGoal } from "@/components/dashboard/GoalCard";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import type { FinanceSavingsGoalRow } from "@/types/database";

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <SectionHeader
        eyebrow="Connected banks"
        title="Financial position"
        subtitle="Net worth, cash flow, and savings from Plaid/ledger (not the on-device Track store)."
        action={
          <Link href="/money" className="btn btn-ghost btn-sm">
            Open Money
          </Link>
        }
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

/**
 * The dashboard's money section as a self-contained async server component:
 * its four queries run behind a Suspense boundary so the greeting, verdict
 * hero, and trajectory stream to the user without waiting on Plaid-derived
 * data. Query failures render a distinct error panel — never a fake empty
 * state.
 */
export async function FinancialPositionSection({
  userId,
  subscriptionTier,
}: {
  userId: string;
  subscriptionTier: string | null;
}) {
  const supabase = await getCachedClient();

  const [snapshotsR, itemsR, accountsR, ledgerContext, ledgerGoalR] = await Promise.all([
    supabase
      .from("financial_snapshots")
      .select("net_worth, net_cash_flow, savings_rate, completed_at, state")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("plaid_items")
      .select("id, institution_name, status, last_successful_sync")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    // RLS scopes plaid_accounts to the caller's items — a bare count is safe.
    supabase.from("plaid_accounts").select("id", { count: "exact", head: true }),
    // Ledger-first path: if the user has saved budget/transaction data, derive
    // the dashboard tiles from it instead of the Plaid snapshot.
    buildFinanceContextFromLedgerTables(supabase),
    supabase
      .from("finance_savings_goals")
      .select("name, target_amount_cents, current_amount_cents, target_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("goal_type", "home")
      .maybeSingle(),
  ]);

  if (snapshotsR.error || itemsR.error) {
    return (
      <SectionShell>
        <div className="md:col-span-2 lg:col-span-3">
          <LoadErrorPanel
            compact
            title="Your financial position didn't load"
            body="Your balances and goal are safe — this is a loading hiccup on our side, not a change in your data."
          />
        </div>
      </SectionShell>
    );
  }

  const snapshots: SnapshotReading[] = snapshotsR.data ?? [];
  const bankItems: ItemReading[] = itemsR.data ?? [];
  const latestSnapshot = snapshots[0] ?? null;
  const netWorthSeries = netWorthTrend(snapshots);
  const nwDelta = netWorthDelta(snapshots);
  const bankSyncEntitled = getEntitlements(subscriptionTier).bankSync;

  const ledgerGoalRow = ledgerGoalR.data as Pick<
    FinanceSavingsGoalRow,
    "name" | "target_amount_cents" | "current_amount_cents" | "target_date"
  > | null;
  const ledgerGoal: LedgerGoal | null = ledgerGoalRow
    ? {
        name: ledgerGoalRow.name,
        targetAmountCents: Number(ledgerGoalRow.target_amount_cents),
        currentAmountCents: Number(ledgerGoalRow.current_amount_cents),
        targetDate: ledgerGoalRow.target_date,
      }
    : null;

  const dashboardView = buildLedgerDashboardView(ledgerContext, latestSnapshot);
  const hasLedger = dashboardView?.source === "ledger";

  /** Display decision lives in netWorthTileState so the unknown branch is tested. */
  const netWorth = dashboardView?.kpis.netWorth ?? null;
  const netWorthTile = netWorthTileState(netWorth);
  const cashFlow = dashboardView?.kpis.cashFlow ?? 0;
  const savingsRatePct = dashboardView?.kpis.savingsRatePct ?? 0;
  const goalSavings = ledgerGoal
    ? ledgerGoal.currentAmountCents / 100
    : latestSnapshot
      ? snapshotLiquidSavings(latestSnapshot.state)
      : null;

  return (
    <Reveal delay={80}>
      <SectionShell>
        {bankItems.length === 0 && !hasLedger ? (
          <BankConnectCard plusRequired={!bankSyncEntitled} />
        ) : dashboardView ? (
          <>
            <StatTile
              label="Net worth"
              value={netWorth === null ? netWorthTile.unknownLabel : formatCurrencyTile(netWorth)}
              accent={COLORS.cyan}
              delta={
                netWorthTile.showTrend && nwDelta
                  ? `${nwDelta.delta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(nwDelta.delta))}`
                  : undefined
              }
              deltaTone={netWorthTile.showTrend ? nwDelta?.tone : undefined}
              footer={netWorthTile.footer}
              spark={
                netWorthTile.showTrend && netWorthSeries.length >= 2 ? (
                  <Sparkline id="networth" values={netWorthSeries} color={COLORS.cyan} />
                ) : undefined
              }
            />
            <StatTile
              label="Cash flow · 30d"
              value={formatCurrencyTile(cashFlow)}
              accent={cashFlow >= 0 ? COLORS.emerald : COLORS.crimson}
              footer={
                hasLedger ? "Based on your budget ledger" : "Based on recently synced activity"
              }
            />
            <StatTile
              label="Savings rate"
              value={String(savingsRatePct)}
              unit="%"
              accent={COLORS.yellow}
              footer={
                hasLedger ? "Of budgeted income, last 30 days" : "Of synced income, last 30 days"
              }
            />
            <ConnectionsTile items={bankItems} accountCount={accountsR.count ?? 0} />
          </>
        ) : (
          <div className="glass p-6 md:col-span-2 lg:col-span-2">
            <h3 className="font-semibold text-light">First sync pending</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              Your bank is connected — net worth, cash flow, and savings appear here once the first
              sync completes.
            </p>
            <Link href="/connections" className="btn btn-ghost mt-4 btn-sm">
              Check sync status
            </Link>
          </div>
        )}
        <GoalCard
          ledgerGoal={ledgerGoal}
          liquidSavings={goalSavings}
          monthlyNetCashFlow={dashboardView ? cashFlow : null}
        />
      </SectionShell>
    </Reveal>
  );
}

/** Suspense fallback — mirrors the section's real geometry so nothing jumps. */
export function FinancialPositionSkeleton() {
  return (
    <div className="mt-10">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-6 w-44" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
        <div className="glass p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-7 w-40" />
          <Skeleton className="mt-3 h-2 w-full" />
          <Skeleton className="mt-3 h-3 w-48" />
        </div>
      </div>
    </div>
  );
}
