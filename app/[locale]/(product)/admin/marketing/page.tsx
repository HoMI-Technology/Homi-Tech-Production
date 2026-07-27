import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Sparkline } from "@/components/ui/Sparkline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarSeries } from "@/components/admin/BarSeries";
import { FunnelBars, type FunnelStage } from "@/components/admin/FunnelBars";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import {
  arpuCents,
  arrCents,
  estimatedMrrCents,
  formatUsdFromCents,
  paidConversionPct,
} from "@/lib/dashboard/revenue";
import type { SubscriptionTier } from "@/types/database";

export const metadata: Metadata = {
  title: "Marketing | Admin | HōMI",
  description: "Growth funnel, signup momentum, tier mix, and waitlist demand.",
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: "#94a3b8",
  plus: "#22d3ee",
  pro: "#facc15",
  family: "#34d399",
};
const TIER_ORDER: SubscriptionTier[] = ["free", "plus", "pro", "family"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Bucket created_at rows into a 30-day daily series. */
function dailySeries(rows: { created_at: string }[], since: Date): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    buckets.set(dayKey(d), 0);
  }
  for (const r of rows) {
    const key = dayKey(new Date(r.created_at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date: shortLabel(date), count }));
}

function last7(series: { count: number }[]): number {
  return series.slice(-7).reduce((acc, d) => acc + d.count, 0);
}

export default async function AdminMarketingPage() {
  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  let waitlistTotal = 0;
  let accountsTotal = 0;
  let assessedUsers = 0;
  let paidTotal = 0;
  let signupSeries: { date: string; count: number }[] = [];
  let waitlistSeries: { date: string; count: number }[] = [];
  let tierCounts: Record<SubscriptionTier, number> = { free: 0, plus: 0, pro: 0, family: 0 };
  let interestCounts: { interest: string; count: number }[] = [];

  try {
    const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
    waitlistTotal = count ?? 0;
  } catch {
    waitlistTotal = 0;
  }

  try {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    accountsTotal = count ?? 0;
  } catch {
    accountsTotal = 0;
  }

  try {
    const { data } = await supabase
      .from("assessments")
      .select("user_id")
      .eq("status", "completed")
      .limit(10000);
    const rows = (data as { user_id: string | null }[] | null) ?? [];
    assessedUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
  } catch {
    assessedUsers = 0;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier, role")
      .limit(10000);
    const rows = (data as { subscription_tier: SubscriptionTier; role: string }[] | null) ?? [];
    // Exclude admins: create-admin comps them to the 'family' tier via the
    // entitlements bypass, so counting them would inflate tier mix and MRR.
    tierCounts = rows.reduce(
      (acc, r) => {
        if (r.role !== "admin" && r.subscription_tier in acc) acc[r.subscription_tier] += 1;
        return acc;
      },
      { free: 0, plus: 0, pro: 0, family: 0 } as Record<SubscriptionTier, number>,
    );
    paidTotal = tierCounts.plus + tierCounts.pro + tierCounts.family;
  } catch {
    paidTotal = 0;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .limit(10000);
    signupSeries = dailySeries((data as { created_at: string }[] | null) ?? [], since);
  } catch {
    signupSeries = [];
  }

  try {
    const { data } = await supabase
      .from("waitlist")
      .select("created_at, interested_in")
      .order("created_at", { ascending: false })
      .limit(5000);
    const rows = (data as { created_at: string; interested_in: string[] | null }[] | null) ?? [];
    waitlistSeries = dailySeries(
      rows.filter((r) => new Date(r.created_at) >= since),
      since,
    );
    const counts = rows
      .flatMap((r) => r.interested_in ?? [])
      .reduce<Record<string, number>>((acc, i) => {
        acc[i] = (acc[i] ?? 0) + 1;
        return acc;
      }, {});
    interestCounts = Object.entries(counts)
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  } catch {
    waitlistSeries = [];
    interestCounts = [];
  }

  const funnel: FunnelStage[] = [
    { label: "Waitlist signups", count: waitlistTotal, color: "#fab633" },
    { label: "Accounts created", count: accountsTotal, color: "#22d3ee" },
    { label: "Completed an assessment", count: assessedUsers, color: "#34d399" },
    { label: "On a paid tier", count: paidTotal, color: "#facc15" },
  ];

  const totalTiered = TIER_ORDER.reduce((acc, t) => acc + tierCounts[t], 0);
  const totalInterest = interestCounts.reduce((acc, i) => acc + i.count, 0);

  // Revenue intelligence — list-price MRR proxy from active paid tiers
  // (admins already excluded above), ARPU per payer, ARR run-rate, and the
  // free→paid conversion rate.
  const paidCounts = { plus: tierCounts.plus, pro: tierCounts.pro, family: tierCounts.family };
  const mrrCents = estimatedMrrCents(paidCounts);
  const arpu = arpuCents(paidCounts);
  const arr = arrCents(paidCounts);
  const conversionPct = paidConversionPct(paidCounts, accountsTotal);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Marketing"
        description="Acquisition funnel, signup momentum, and demand from live platform data."
        primaryAction={{ label: "Waitlist", href: "/admin/waitlist", variant: "ghost" }}
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Waitlist",
              value: waitlistTotal.toLocaleString(),
              footer: `${last7(waitlistSeries).toLocaleString()} in last 7 days`,
              color: "#fab633",
            },
            {
              label: "Accounts",
              value: accountsTotal.toLocaleString(),
              footer: `${last7(signupSeries).toLocaleString()} new in last 7 days`,
              color: "#22d3ee",
            },
            {
              label: "Assessed",
              value: assessedUsers.toLocaleString(),
              footer: "Completed at least one",
              color: "#34d399",
            },
            {
              label: "Paid",
              value: paidTotal.toLocaleString(),
              footer:
                accountsTotal > 0
                  ? `${Math.round((paidTotal / accountsTotal) * 100)}% of accounts`
                  : "Awaiting billing",
              color: "#facc15",
            },
          ]}
        />
        {(waitlistSeries.length >= 2 || signupSeries.length >= 2) && (
          <div className="mt-3 flex flex-wrap justify-end gap-6">
            {waitlistSeries.length >= 2 && (
              <div className="w-36">
                <p className="mb-1 text-[0.625rem] uppercase tracking-wide text-dim">Waitlist</p>
                <Sparkline
                  id="mk-waitlist"
                  values={waitlistSeries.map((d) => d.count)}
                  color="#fab633"
                />
              </div>
            )}
            {signupSeries.length >= 2 && (
              <div className="w-36">
                <p className="mb-1 text-[0.625rem] uppercase tracking-wide text-dim">Signups</p>
                <Sparkline
                  id="mk-signups"
                  values={signupSeries.map((d) => d.count)}
                  color="#22d3ee"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass mt-8 p-6">
        <SectionHeader
          eyebrow="Revenue"
          title="Recurring revenue"
          subtitle="List-price MRR proxy from active paid tiers (comped admin accounts excluded)."
        />
        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-dim">MRR (est.)</p>
            <p className="score-numeral mt-1 text-3xl text-light">{formatUsdFromCents(mrrCents)}</p>
          </div>
          <div>
            <p className="text-xs text-dim">ARR run-rate</p>
            <p className="score-numeral mt-1 text-3xl text-light">{formatUsdFromCents(arr)}</p>
          </div>
          <div>
            <p className="text-xs text-dim">ARPU / payer</p>
            <p className="score-numeral mt-1 text-3xl text-light">{formatUsdFromCents(arpu)}</p>
          </div>
          <div>
            <p className="text-xs text-dim">Paid conversion</p>
            <p className="score-numeral mt-1 text-3xl text-light">{conversionPct}%</p>
            <p className="mt-1 text-xs text-dim">{paidTotal.toLocaleString()} of {accountsTotal.toLocaleString()} accounts</p>
          </div>
        </div>
        {mrrCents === 0 && (
          <p className="mt-4 text-sm text-dim">
            No paid subscriptions yet. MRR is estimated from tier list prices
            (Plus {formatUsdFromCents(999)}, Pro {formatUsdFromCents(2499)}, Family {formatUsdFromCents(3999)} / mo)
            and fills in as accounts upgrade.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass panel-focus p-6">
          <SectionHeader
            eyebrow="Conversion"
            title="Acquisition funnel"
            subtitle="Lifetime counts at each stage, with stage-to-stage conversion."
          />
          <div className="mt-6">
            <FunnelBars stages={funnel} />
          </div>
        </div>

        <div className="glass p-6">
          <SectionHeader eyebrow="Revenue mix" title="Subscription tiers" />
          <div className="mt-5 space-y-4">
            {totalTiered === 0 ? (
              <p className="py-6 text-center text-sm text-dim">No accounts yet.</p>
            ) : (
              TIER_ORDER.map((tier) => {
                const count = tierCounts[tier];
                const pct = totalTiered > 0 ? Math.round((count / totalTiered) * 100) : 0;
                const color = TIER_COLORS[tier];
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold capitalize text-light">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                        />
                        {tier}
                      </span>
                      <span className="score-numeral text-dim">
                        {count.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <SectionHeader eyebrow="Momentum" title="Account signups — last 30 days" />
          <div className="mt-4">
            {signupSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No signup data yet.</p>
            ) : (
              <BarSeries
                id="mk-signups-30d"
                counts={signupSeries}
                color="#22d3ee"
                height={150}
                ariaLabel="Account signups over the last 30 days"
              />
            )}
          </div>
        </div>
        <div className="glass p-6">
          <SectionHeader eyebrow="Momentum" title="Waitlist signups — last 30 days" />
          <div className="mt-4">
            {waitlistSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No waitlist data yet.</p>
            ) : (
              <BarSeries
                id="mk-waitlist-30d"
                counts={waitlistSeries}
                color="#fab633"
                height={150}
                ariaLabel="Waitlist signups over the last 30 days"
              />
            )}
          </div>
        </div>
      </div>

      <div className="glass mt-8 p-6">
        <SectionHeader
          eyebrow="Demand signal"
          title="What the waitlist wants"
          subtitle="Interest areas captured at signup, ranked by volume."
        />
        <div className="mt-5 space-y-4">
          {interestCounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-dim">No interest data captured yet.</p>
          ) : (
            interestCounts.map(({ interest, count }) => {
              const pct = totalInterest > 0 ? Math.round((count / totalInterest) * 100) : 0;
              return (
                <div key={interest}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-light">{interest}</span>
                    <span className="score-numeral text-dim">
                      {count.toLocaleString()} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, #22d3ee99, #22d3ee)" }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
