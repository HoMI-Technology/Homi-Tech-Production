import { Link } from "@/i18n/navigation";
import { getCachedClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";
import { formatCurrency, formatCurrencyTile } from "@/lib/tools/format";
import {
  netWorthDelta,
  netWorthTrend,
  snapshotLiquidSavings,
  type ItemReading,
  type SnapshotReading,
} from "@/lib/dashboard/financial-position";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatTile } from "@/components/ui/StatTile";
import { Reveal } from "@/components/ui/Reveal";
import { BankConnectCard } from "@/components/dashboard/BankConnectCard";
import { ConnectionsTile } from "@/components/dashboard/ConnectionsTile";
import { GoalCard, type GoalData } from "@/components/dashboard/GoalCard";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import type { Goal } from "@/types/database";

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <SectionHeader
        eyebrow="Money"
        title="Financial position"
        subtitle="Net worth, cash flow, and savings from your connected banks."
        action={
          <Link href="/simulator" className="btn btn-ghost !px-4 !py-2 text-sm">
            Simulate your score
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

  const [snapshotsR, itemsR, accountsR, goalR] = await Promise.all([
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
    supabase
      .from("goals")
      .select("label, target_amount, target_date")
      .eq("user_id", userId)
      .eq("kind", "down_payment")
      .maybeSingle(),
  ]);

  if (snapshotsR.error || itemsR.error || goalR.error) {
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
  const goalRow = goalR.data as Pick<Goal, "label" | "target_amount" | "target_date"> | null;
  const goal: GoalData | null = goalRow
    ? {
        label: goalRow.label,
        target_amount: Number(goalRow.target_amount),
        target_date: goalRow.target_date,
      }
    : null;
  const goalSavings = latestSnapshot ? snapshotLiquidSavings(latestSnapshot.state) : null;
  const netWorth = latestSnapshot ? Number(latestSnapshot.net_worth) : 0;
  const cashFlow = latestSnapshot ? Number(latestSnapshot.net_cash_flow) : 0;
  const savingsRatePct = latestSnapshot ? Math.round(Number(latestSnapshot.savings_rate) * 100) : 0;

  return (
    <Reveal delay={80}>
      <SectionShell>
        {bankItems.length === 0 ? (
          <BankConnectCard plusRequired={!bankSyncEntitled} />
        ) : latestSnapshot ? (
          <>
            <StatTile
              label="Net worth"
              value={formatCurrencyTile(netWorth)}
              accent="#22d3ee"
              delta={
                nwDelta
                  ? `${nwDelta.delta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(nwDelta.delta))}`
                  : undefined
              }
              deltaTone={nwDelta?.tone}
              footer={nwDelta ? "vs. previous snapshot" : "From your synced balances"}
              spark={
                netWorthSeries.length >= 2 ? (
                  <Sparkline id="networth" values={netWorthSeries} color="#22d3ee" />
                ) : undefined
              }
            />
            <StatTile
              label="Cash flow · 30d"
              value={formatCurrencyTile(cashFlow)}
              accent={cashFlow >= 0 ? "#34d399" : "#f24822"}
              footer="Based on recently synced activity"
            />
            <StatTile
              label="Savings rate"
              value={String(savingsRatePct)}
              unit="%"
              accent="#facc15"
              footer="Of synced income, last 30 days"
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
            <Link href="/connections" className="btn btn-ghost mt-4 !px-4 !py-2 text-sm">
              Check sync status
            </Link>
          </div>
        )}
        <GoalCard
          goal={goal}
          liquidSavings={goalSavings}
          monthlyNetCashFlow={latestSnapshot ? cashFlow : null}
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
