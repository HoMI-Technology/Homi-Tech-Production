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
import {
  deriveChannel,
  dimension,
  isAttributed,
  type AttributionLike,
} from "@/lib/dashboard/attribution";
import { COLORS } from "@/lib/brand";
import type { SubscriptionTier } from "@/types/database";

type ActivationRow = {
  id: string;
  user_id: string | null;
  completed_at: string | null;
  created_at: string;
  attribution: AttributionLike;
};

function activationTimestamp(row: ActivationRow): Date {
  return new Date(row.completed_at ?? row.created_at);
}

function formatActivationSource(attr: AttributionLike): string {
  if (!isAttributed(attr)) return "direct / unknown";
  const source = dimension(attr, "utm_source");
  const medium = dimension(attr, "utm_medium");
  const campaign = dimension(attr, "utm_campaign");
  const ref = dimension(attr, "ref");
  const channel = deriveChannel(attr);
  const parts = [channel];
  if (source && source !== channel) parts.push(source);
  if (medium) parts.push(medium);
  if (campaign) parts.push(campaign);
  if (ref && !source) parts.push(`ref:${ref}`);
  return parts.join(" · ");
}

export const metadata: Metadata = {
  title: "Marketing | Admin | HōMI",
  description: "Growth funnel, signup momentum, tier mix, and waitlist demand.",
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: COLORS.dim,
  plus: COLORS.cyan,
  pro: COLORS.yellow,
  family: COLORS.emerald,
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
function dailySeries(
  rows: { created_at: string }[],
  since: Date,
): { date: string; count: number }[] {
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
  let activationSeries: { date: string; count: number }[] = [];
  let activationsLast7 = 0;
  let accountsLast7 = 0;
  let last10Activations: {
    when: string;
    channel: string;
    source: string;
  }[] = [];
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
      .select("id, user_id, completed_at, created_at, attribution")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10000);
    const rows = ((data as ActivationRow[] | null) ?? []).slice().sort((a, b) => {
      return activationTimestamp(b).getTime() - activationTimestamp(a).getTime();
    });
    assessedUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;

    // Weekly + 30d activation momentum (north-star)
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const recentForSeries = rows.filter((r) => activationTimestamp(r) >= since);
    activationsLast7 = rows.filter((r) => activationTimestamp(r) >= weekAgo).length;
    activationSeries = dailySeries(
      recentForSeries.map((r) => ({ created_at: activationTimestamp(r).toISOString() })),
      since,
    );

    last10Activations = rows.slice(0, 10).map((r) => {
      const when = activationTimestamp(r);
      return {
        when: when.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }),
        channel: deriveChannel(r.attribution),
        source: formatActivationSource(r.attribution),
      };
    });
  } catch {
    assessedUsers = 0;
    activationSeries = [];
    activationsLast7 = 0;
    last10Activations = [];
  }

  try {
    const { data } = await supabase.from("profiles").select("subscription_tier, role").limit(10000);
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
    const signupRows = (data as { created_at: string }[] | null) ?? [];
    signupSeries = dailySeries(signupRows, since);
    accountsLast7 = last7(signupSeries);
  } catch {
    signupSeries = [];
    accountsLast7 = 0;
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

  const activationRate7d =
    accountsLast7 > 0 ? Math.round((activationsLast7 / accountsLast7) * 100) : null;

  const funnel: FunnelStage[] = [
    { label: "Waitlist signups", count: waitlistTotal, color: COLORS.amber },
    { label: "Accounts created", count: accountsTotal, color: COLORS.cyan },
    { label: "Completed an assessment", count: assessedUsers, color: COLORS.emerald },
    { label: "On a paid tier", count: paidTotal, color: COLORS.yellow },
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
        description="Acquisition funnel plus the marketing source of truth (assets, GTM OS, launch kit)."
        primaryAction={{ label: "Waitlist", href: "/admin/waitlist", variant: "ghost" }}
        secondaryAction={{
          label: "Attribution",
          href: "/admin/attribution",
          variant: "ghost",
        }}
      />

      <div className="glass mt-6 p-6">
        <SectionHeader
          eyebrow="Source of truth"
          title="Marketing library"
          subtitle="Canonical files live in public/marketing/ (GitHub + live site). Desktop kits are working copies only."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "GTM OS (7 pillars)",
              href: "/marketing/README.md",
              hint: "Activation · email · founder channel · claim law · weekly ritual",
            },
            {
              label: "Weekly scoreboard",
              href: "/marketing/gtm/WEEKLY-SCOREBOARD.md",
              hint: "Fill every Sunday — activations are the score",
            },
            {
              label: "Launch day checklist",
              href: "/marketing/gtm/LAUNCH_DAY.md",
              hint: "Exact files + post order for launch",
            },
            {
              label: "Avatars & covers",
              href: "/marketing/brand/avatars/homi-threshold-compass-avatar-512.png",
              hint: "Profile 512 · covers under /marketing/brand/covers/",
            },
            {
              label: "Live product screens",
              href: "/marketing/screenshots/live/homi_live_01_home.png",
              hint: "Production captures for PH + press",
            },
            {
              label: "Demo video (60s)",
              href: "/marketing/launch/demo-video/HOMI-Demo-60s.mp4", // brand-ok: asset filename on disk, not user-visible text
              hint: "Problem → pillars → what we're not → CTA",
            },
            {
              label: "Press kit + PDFs",
              href: "/marketing/launch/press-kit/pdf/HOMI-One-Pager-Partners-Investors.pdf", // brand-ok: asset filename on disk, not user-visible text
              hint: "One-pager · FAQ · logos · screens",
            },
            {
              label: "Launch emails (4)",
              href: "/marketing/launch/emails/01-teaser.md",
              hint: "Teaser · live · how to start · what we aren’t",
            },
            {
              label: "Execution status",
              href: "/marketing/gtm/EXECUTION-STATUS.md",
              hint: "7 workstreams · what is shipped vs ops TODO",
            },
            {
              label: "Product Hunt gallery",
              href: "/marketing/launch/product-hunt/gallery-live/homi_ph_live_01_home.png",
              hint: "Live-UI gallery preferred over abstract-only",
            },
            {
              label: "Email campaigns",
              href: "/admin/email",
              hint: "Load sequence 01–04 as drafts · Resend send",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="glass-hover block rounded-lg border border-white/5 p-4 transition-colors"
            >
              <p className="text-sm font-medium text-light">{item.label}</p>
              <p className="mt-1 text-xs text-dim">{item.hint}</p>
              <p className="mt-2 font-mono text-3xs text-cyan/80">public/marketing/…</p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-dim">
          North star: <span className="text-emerald">activations</span> (completed readiness path) —
          not followers. {/* brand-ok: meta-reference to forbidden claims — this is the prohibition policy, not a claim */}
          Claim law: never approved {/* brand-ok: listing what NOT to say */} / guaranteed / credit-score replacement.
        </p>
      </div>

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Activations (7d)",
              value: activationsLast7.toLocaleString(),
              footer:
                activationRate7d !== null
                  ? `${activationRate7d}% of new accounts (7d)`
                  : "North-star · completed readiness path",
              color: COLORS.emerald,
            },
            {
              label: "Waitlist",
              value: waitlistTotal.toLocaleString(),
              footer: `${last7(waitlistSeries).toLocaleString()} in last 7 days`,
              color: COLORS.amber,
            },
            {
              label: "Accounts",
              value: accountsTotal.toLocaleString(),
              footer: `${accountsLast7.toLocaleString()} new in last 7 days`,
              color: COLORS.cyan,
            },
            {
              label: "Assessed (all-time)",
              value: assessedUsers.toLocaleString(),
              footer:
                accountsTotal > 0
                  ? `${Math.round((assessedUsers / accountsTotal) * 100)}% of accounts`
                  : "Completed at least one",
              color: COLORS.yellow,
            },
          ]}
        />
        {(activationSeries.length >= 2 || waitlistSeries.length >= 2 || signupSeries.length >= 2) && (
          <div className="mt-3 flex flex-wrap justify-end gap-6">
            {activationSeries.length >= 2 && (
              <div className="w-36">
                <p className="mb-1 text-3xs uppercase tracking-wide text-dim">Activations</p>
                <Sparkline
                  id="mk-activations"
                  values={activationSeries.map((d) => d.count)}
                  color={COLORS.emerald}
                />
              </div>
            )}
            {waitlistSeries.length >= 2 && (
              <div className="w-36">
                <p className="mb-1 text-3xs uppercase tracking-wide text-dim">Waitlist</p>
                <Sparkline
                  id="mk-waitlist"
                  values={waitlistSeries.map((d) => d.count)}
                  color={COLORS.amber}
                />
              </div>
            )}
            {signupSeries.length >= 2 && (
              <div className="w-36">
                <p className="mb-1 text-3xs uppercase tracking-wide text-dim">Signups</p>
                <Sparkline
                  id="mk-signups"
                  values={signupSeries.map((d) => d.count)}
                  color={COLORS.cyan}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <SectionHeader
            eyebrow="North star"
            title="Activations — last 30 days"
            subtitle="Completed assessments per day. This is the score — not followers."
          />
          <div className="mt-4">
            {activationSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No activations in the last 30 days.</p>
            ) : (
              <BarSeries
                id="mk-activations-30d"
                counts={activationSeries}
                color={COLORS.emerald}
                height={150}
                ariaLabel="Completed assessments over the last 30 days"
              />
            )}
          </div>
          <p className="mt-3 text-xs text-dim">
            Drop-off proxy (7d): {accountsLast7.toLocaleString()} new accounts →{" "}
            {activationsLast7.toLocaleString()} activations
            {activationRate7d !== null ? ` (${activationRate7d}%)` : ""}. Visit-level funnel lives in
            product analytics when PostHog is configured.
          </p>
        </div>

        <div className="glass p-6">
          <SectionHeader
            eyebrow="Attribution"
            title="Source of last 10 activations"
            subtitle="First-touch UTM / ref from assessment snapshot. Full rollups → Attribution admin."
          />
          <div className="mt-4 overflow-x-auto">
            {last10Activations.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No completed assessments yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-3xs uppercase tracking-wide text-dim">
                    <th className="pb-2 pr-3 font-medium">When (UTC)</th>
                    <th className="pb-2 pr-3 font-medium">Channel</th>
                    <th className="pb-2 font-medium">Source detail</th>
                  </tr>
                </thead>
                <tbody>
                  {last10Activations.map((row, i) => (
                    <tr key={`${row.when}-${i}`} className="border-b border-white/5">
                      <td className="py-2 pr-3 text-light">{row.when}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-cyan">{row.channel}</td>
                      <td className="py-2 text-xs text-dim">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-3 text-xs text-dim">
            Share links with{" "}
            <span className="font-mono text-light">?utm_source=linkedin&utm_medium=social</span> (or{" "}
            <span className="font-mono text-light">?ref=</span>) so this table is not all “direct”.
          </p>
        </div>
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
            <p className="mt-1 text-xs text-dim">
              {paidTotal.toLocaleString()} of {accountsTotal.toLocaleString()} accounts
            </p>
          </div>
        </div>
        {mrrCents === 0 && (
          <p className="mt-4 text-sm text-dim">
            No paid subscriptions yet. MRR is estimated from tier list prices (Plus{" "}
            {formatUsdFromCents(999)}, Pro {formatUsdFromCents(2499)}, Family{" "}
            {formatUsdFromCents(3999)} / mo) and fills in as accounts upgrade.
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
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}99, ${color})`,
                        }}
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
                color={COLORS.cyan}
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
                color={COLORS.amber}
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
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${COLORS.cyan}99, ${COLORS.cyan})`,
                      }}
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
