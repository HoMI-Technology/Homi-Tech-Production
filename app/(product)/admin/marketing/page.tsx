import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarSeries } from "@/components/admin/BarSeries";
import { FunnelBars, type FunnelStage } from "@/components/admin/FunnelBars";
import { RankedBars } from "@/components/admin/RankedBars";
import { MarketingLibrary } from "@/components/admin/MarketingLibrary";
import { MarketingTodayStrip } from "@/components/admin/MarketingTodayStrip";
import { ActivationInstrument } from "@/components/admin/ActivationInstrument";
import { AgencyControlTower } from "@/components/admin/AgencyControlTower";
import { AgencyDesks } from "@/components/admin/AgencyDesks";
import { UtmLinkBuilder } from "@/components/admin/UtmLinkBuilder";
import { AudienceInsights } from "@/components/admin/AudienceInsights";
import { SocialContentStudio } from "@/components/admin/SocialContentStudio";
import { PostCaptionWriter } from "@/components/admin/PostCaptionWriter";
import { ContentCalendar } from "@/components/admin/ContentCalendar";
import { ThemeCalendar } from "@/components/admin/ThemeCalendar";
import { SundayScorecard } from "@/components/admin/SundayScorecard";
import { PostPerformanceTracker } from "@/components/admin/PostPerformanceTracker";
import { LinkedInAnalyticsImport } from "@/components/admin/LinkedInAnalyticsImport";
import { CompetitorPulse } from "@/components/admin/CompetitorPulse";
import { EmailDripBuilder } from "@/components/admin/EmailDripBuilder";
import { WebhookPublisher } from "@/components/admin/WebhookPublisher";
import { AttentionStrip, type AttentionItem } from "@/components/operate/AttentionStrip";
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
  channelCounts,
  deriveChannel,
  dimension,
  isAttributed,
  type AttributionLike,
} from "@/lib/dashboard/attribution";
import {
  CLAIM_NEVER_SAY,
  CLAIM_PREFER,
  ENGINE_WEEK_POSTS,
  LIBRARY_SECTIONS,
  QUICK_ACTIONS,
} from "@/lib/admin/marketing-command";
import {
  MARKETING_SAMPLE_CAP,
  MIN_COHORT_N,
  cohortActivatedCount,
  cohortActivationRatePct,
  completionEventsInWindow,
  completionTimestamp,
  dailyUniqueActivatedSeries,
  isAtSampleCap,
  sortBySeverity,
  uniqueActivatedUsers,
  uniqueEverActivated,
} from "@/lib/admin/marketing-metrics";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { hasAnthropic } from "@/lib/env";
import type { Campaign, SubscriptionTier } from "@/types/database";

type ActivationRow = {
  id: string;
  user_id: string | null;
  completed_at: string | null;
  created_at: string;
  attribution: AttributionLike;
  verdict: string | null;
};

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

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Bucket created_at rows into a 30-day daily series (signups / waitlist). */
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

export const metadata: Metadata = {
  title: "Marketing Agency OS | Admin | HōMI",
  description:
    "CEO control tower for the HōMI marketing agency — agent fleet, desks, activations, claim law.",
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: COLORS.dim,
  plus: COLORS.cyan,
  pro: COLORS.yellow,
  family: COLORS.emerald,
};
const TIER_ORDER: SubscriptionTier[] = ["free", "plus", "pro", "family"];
const VERDICT_KEYS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const service = createAdminClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  let waitlistTotal = 0;
  let accountsTotal = 0;
  let assessedUsers = 0;
  let paidTotal = 0;
  let signupSeries: { date: string; count: number }[] = [];
  let waitlistSeries: { date: string; count: number }[] = [];
  let activationSeries: { date: string; count: number }[] = [];
  /** Unique users activated in last 7d (north star). */
  let uniqueActivated7d = 0;
  /** Completion events in last 7d (can exceed unique). */
  let completions7d = 0;
  let accountsLast7 = 0;
  let cohortActivated7d = 0;
  let metricsCapped = false;
  let last10Activations: { when: string; channel: string; source: string }[] = [];
  let tierCounts: Record<SubscriptionTier, number> = { free: 0, plus: 0, pro: 0, family: 0 };
  let interestCounts: { interest: string; count: number }[] = [];
  let profileAttrs: AttributionLike[] = [];
  let verdictCounts: Record<VerdictKey, number> = {
    READY: 0,
    ALMOST_THERE: 0,
    BUILD_FIRST: 0,
    NOT_YET: 0,
  };
  let campaigns: Campaign[] = [];
  let waitlistLast7 = 0;
  let everCompletedUserIds = new Set<string>();

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
      .select("id, user_id, completed_at, created_at, attribution, verdict")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(MARKETING_SAMPLE_CAP);
    const rows = ((data as ActivationRow[] | null) ?? []).slice().sort((a, b) => {
      return completionTimestamp(b).getTime() - completionTimestamp(a).getTime();
    });
    if (isAtSampleCap(rows.length)) metricsCapped = true;

    assessedUsers = uniqueEverActivated(rows);
    everCompletedUserIds = new Set(
      rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)),
    );
    uniqueActivated7d = uniqueActivatedUsers(rows, weekAgo).size;
    completions7d = completionEventsInWindow(rows, weekAgo);
    activationSeries = dailyUniqueActivatedSeries(rows, since, 30);

    last10Activations = rows.slice(0, 10).map((r) => {
      const when = completionTimestamp(r);
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

    for (const r of rows) {
      if (r.verdict && r.verdict in verdictCounts) {
        verdictCounts[r.verdict as VerdictKey] += 1;
      }
    }
  } catch {
    assessedUsers = 0;
    activationSeries = [];
    uniqueActivated7d = 0;
    completions7d = 0;
    last10Activations = [];
    everCompletedUserIds = new Set();
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier, role, attribution")
      .limit(MARKETING_SAMPLE_CAP);
    const rows =
      (data as {
        subscription_tier: SubscriptionTier;
        role: string;
        attribution: AttributionLike;
      }[] | null) ?? [];
    if (isAtSampleCap(rows.length)) metricsCapped = true;
    tierCounts = rows.reduce(
      (acc, r) => {
        if (r.role !== "admin" && r.subscription_tier in acc) acc[r.subscription_tier] += 1;
        return acc;
      },
      { free: 0, plus: 0, pro: 0, family: 0 } as Record<SubscriptionTier, number>,
    );
    paidTotal = tierCounts.plus + tierCounts.pro + tierCounts.family;
    profileAttrs = rows.map((r) => r.attribution);
  } catch {
    paidTotal = 0;
    profileAttrs = [];
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", since.toISOString())
      .limit(MARKETING_SAMPLE_CAP);
    const signupRows = (data as { id: string; created_at: string }[] | null) ?? [];
    if (isAtSampleCap(signupRows.length)) metricsCapped = true;
    signupSeries = dailySeries(signupRows, since);
    accountsLast7 = signupRows.filter((r) => new Date(r.created_at) >= weekAgo).length;
    cohortActivated7d = cohortActivatedCount(signupRows, everCompletedUserIds, weekAgo);
  } catch {
    signupSeries = [];
    accountsLast7 = 0;
    cohortActivated7d = 0;
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
    waitlistLast7 = last7(waitlistSeries);
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
    waitlistLast7 = 0;
  }

  if (service) {
    try {
      const { data } = await service
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      campaigns = (data as Campaign[] | null) ?? [];
    } catch {
      campaigns = [];
    }
  }

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const cohortRate7d = cohortActivationRatePct(cohortActivated7d, accountsLast7, MIN_COHORT_N);
  const cohortRateSuppressed = accountsLast7 > 0 && accountsLast7 < MIN_COHORT_N;
  const accountActivatePct =
    accountsTotal > 0 ? Math.round((assessedUsers / accountsTotal) * 100) : null;

  const channels = channelCounts(profileAttrs, 6);
  const channelRows = channels.map((c, i) => ({
    label: c.key,
    count: c.count,
    color: [COLORS.cyan, COLORS.emerald, COLORS.yellow, COLORS.amber, COLORS.dim][i % 5],
  }));

  const verdictRows = VERDICT_KEYS.map((k) => ({
    label: VERDICT_META[k]?.label ?? k,
    count: verdictCounts[k],
    color: VERDICT_META[k]?.color ?? COLORS.dim,
  })).filter((r) => r.count > 0);

  const funnel: FunnelStage[] = [
    { label: "Waitlist signups", count: waitlistTotal, color: COLORS.amber },
    { label: "Accounts created", count: accountsTotal, color: COLORS.cyan },
    {
      label: "Unique users who completed",
      count: assessedUsers,
      color: COLORS.emerald,
    },
    { label: "On a paid tier", count: paidTotal, color: COLORS.yellow },
  ];

  const totalTiered = TIER_ORDER.reduce((acc, t) => acc + tierCounts[t], 0);
  const totalInterest = interestCounts.reduce((acc, i) => acc + i.count, 0);
  const paidCounts = { plus: tierCounts.plus, pro: tierCounts.pro, family: tierCounts.family };
  const mrrCents = estimatedMrrCents(paidCounts);
  const arpu = arpuCents(paidCounts);
  const arr = arrCents(paidCounts);
  const conversionPct = paidConversionPct(paidCounts, accountsTotal);

  const campaignDrafts = campaigns.filter((c) => c.status === "draft").length;
  const campaignSent = campaigns.filter((c) => c.status === "sent").length;
  const directHeavy =
    last10Activations.length >= 3 &&
    last10Activations.filter((r) => r.channel === "direct").length >=
      Math.ceil(last10Activations.length * 0.7);

  // Attention: ops signals only — not vanity. Sorted critical → ok before render.
  const attentionRaw: AttentionItem[] = [];
  if (!resendConfigured) {
    attentionRaw.push({
      id: "resend",
      severity: "critical",
      title: "Resend not configured",
      detail: "RESEND_API_KEY missing — waitlist and campaigns cannot send.",
      href: "/admin/email",
      cta: "Email OS",
    });
  }
  if (metricsCapped) {
    attentionRaw.push({
      id: "sample-cap",
      severity: "warn",
      title: "Metrics sample capped",
      detail: `At least one query hit the ${MARKETING_SAMPLE_CAP.toLocaleString()}-row cap — numbers may undercount. Move to server-side aggregates soon.`,
      href: "#proof",
      cta: "See proof",
    });
  }
  if (waitlistTotal > 0 && campaignDrafts === 0 && campaignSent === 0) {
    attentionRaw.push({
      id: "email-drafts",
      severity: "warn",
      title: "No email campaigns loaded",
      detail: "Waitlist has demand. Load launch 01–04 as drafts (do not blast cold).",
      href: "/admin/email",
      cta: "Compose",
    });
  }
  if (accountsLast7 > 0 && uniqueActivated7d === 0) {
    attentionRaw.push({
      id: "activation-zero",
      severity: "warn",
      title: "Signups without activations (7d)",
      detail: `${accountsLast7} new accounts, 0 unique users completed a readiness path — fix path friction first.`,
      href: "/assessment",
      cta: "Walk path",
    });
  }
  if (directHeavy) {
    attentionRaw.push({
      id: "utm",
      severity: "info",
      title: "Most activations lack UTM",
      detail: "Last 10 are mostly direct. Tag every founder link (builder below).",
      href: "#utm-builder",
      cta: "Build UTM",
    });
  }
  if (waitlistTotal === 0 && accountsTotal === 0) {
    attentionRaw.push({
      id: "cold-start",
      severity: "info",
      title: "Cold start — run founder setup",
      detail: "No waitlist or accounts yet. Complete the 30-min LinkedIn + capture setup.",
      href: "/marketing/gtm/FOUNDER-30-MIN.md",
      cta: "Open setup",
    });
  }
  if (attentionRaw.length === 0) {
    attentionRaw.push({
      id: "ok",
      severity: "ok",
      title: "Command center healthy",
      detail: "North star is unique activated users. Fill the Sunday scoreboard from these numbers.",
      href: "/marketing/gtm/weeks/WEEK-1-SCOREBOARD.md",
      cta: "Scoreboard",
    });
  }
  const attention = sortBySeverity(attentionRaw);

  const cohortLine =
    cohortRate7d !== null
      ? `${cohortActivated7d.toLocaleString()} of ${accountsLast7.toLocaleString()} new accounts activated (${cohortRate7d}% cohort)`
      : cohortRateSuppressed
        ? `${cohortActivated7d.toLocaleString()} of ${accountsLast7.toLocaleString()} new accounts activated — rate hidden until n ≥ 5`
        : `${accountsLast7.toLocaleString()} new accounts this week · ${uniqueActivated7d.toLocaleString()} unique activated`;

  const aiEnabled = hasAnthropic();

  return (
    <div>
      <PageHeader
        eyebrow="Agency OS · CEO"
        title="Marketing Agency"
        description="Ultra-premium agentic agency. You are CEO: watch the fleet, open a desk, approve before anything ships. Activations are the score — not vanity."
        primaryAction={{ label: "Email desk", href: "#desk-email", variant: "primary" }}
        secondaryAction={{ label: "Content desk", href: "#desk-content", variant: "ghost" }}
      />

      {/* CEO attention */}
      <MarketingTodayStrip primary={attention[0]} />
      {attention.length > 1 && (
        <div className="mt-4">
          <AttentionStrip items={attention.slice(1)} title="Also needs the CEO" />
        </div>
      )}

      {/* CEO control tower — agent fleet */}
      <AgencyControlTower
        signals={{
          aiEnabled,
          resendConfigured,
          uniqueActivated7d,
          accountsLast7,
          waitlistTotal,
          campaignDrafts,
          campaignSent,
          metricsCapped,
        }}
        uniqueActivated7d={uniqueActivated7d}
        completions7d={completions7d}
        cohortLine={cohortLine}
      />

      {/* Activation instrument — weekly engine + UTM */}
      <ActivationInstrument
        uniqueActivated7d={uniqueActivated7d}
        completions7d={completions7d}
        accountsLast7={accountsLast7}
        cohortActivated7d={cohortActivated7d}
        cohortRate7d={cohortRate7d}
        cohortRateSuppressed={cohortRateSuppressed}
        activationSeries={activationSeries}
        utmSlot={<UtmLinkBuilder />}
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Waitlist",
              value: waitlistTotal.toLocaleString(),
              footer: `${waitlistLast7.toLocaleString()} new · 7d`,
              color: COLORS.amber,
            },
            {
              label: "Accounts",
              value: accountsTotal.toLocaleString(),
              footer: `${accountsLast7.toLocaleString()} new · 7d`,
              color: COLORS.cyan,
            },
            {
              label: "Paid",
              value: paidTotal.toLocaleString(),
              footer:
                accountActivatePct !== null
                  ? `${accountActivatePct}% activated · ${conversionPct}% paid`
                  : "Tier mix in Owned",
              color: COLORS.yellow,
            },
          ]}
        />
      </div>

      {/* Quick ops links */}
      <div className="mt-6 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) =>
          a.external ? (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              {a.label}
            </a>
          ) : (
            <Link key={a.href} href={a.href} className="btn btn-ghost btn-sm">
              {a.label}
            </Link>
          ),
        )}
      </div>

      {/* Full agent desks */}
      <AgencyDesks
        panels={{
          "desk-strategy": (
            <div className="space-y-6">
              <SundayScorecard
                activationsLast7={uniqueActivated7d}
                accountsLast7={accountsLast7}
                waitlistLast7={waitlistLast7}
                waitlistTotal={waitlistTotal}
                accountsTotal={accountsTotal}
                assessedUsers={assessedUsers}
                paidTotal={paidTotal}
                mrrCents={mrrCents}
                activationRate7d={cohortRate7d}
                channels={channels.slice(0, 3).map((c) => ({ label: c.key, count: c.count }))}
                aiEnabled={aiEnabled}
              />
              <div className="glass p-5 text-sm text-dim">
                <p className="font-semibold text-light">GTM lock</p>
                <p className="mt-2">
                  Channel: LinkedIn founder · PH this quarter: No · North star: unique activated
                  users · Claim law always on.
                </p>
                <a
                  href="/marketing/gtm/HOMI-SOLO-GTM-OS.md" // brand-ok: asset filename on disk, not user-visible brand text
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-cyan hover:underline"
                >
                  Open Solo GTM OS →
                </a>
              </div>
            </div>
          ),
          "desk-content": (
            <div className="space-y-6">
              <SocialContentStudio />
              <PostCaptionWriter />
            </div>
          ),
          "desk-calendar": (
            <div className="space-y-6">
              <ThemeCalendar />
              <ContentCalendar enginePosts={ENGINE_WEEK_POSTS} />
            </div>
          ),
          "desk-audience": (
            <AudienceInsights
              verdictCounts={verdictCounts}
              channelRows={channelRows}
              interestCounts={interestCounts}
              aiEnabled={aiEnabled}
            />
          ),
          "desk-email": (
            <div className="space-y-6">
              <div className="glass p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <SectionHeader
                    eyebrow="Email desk"
                    title="Campaign OS"
                    subtitle="Resend + admin broadcasts. AI drafts drips — you approve before send."
                  />
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${
                        resendConfigured
                          ? "border-emerald/40 bg-emerald/10 text-emerald"
                          : "border-crimson/40 bg-crimson/10 text-light"
                      }`}
                    >
                      Resend {resendConfigured ? "ready" : "blocked"}
                    </span>
                    <Link href="/admin/email" className="btn btn-primary btn-sm">
                      Open composer
                    </Link>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-dim">Campaigns</p>
                    <p className="score-numeral mt-1 text-2xl text-light">{campaigns.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dim">Drafts</p>
                    <p className="score-numeral mt-1 text-2xl text-light">{campaignDrafts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dim">Sent</p>
                    <p className="score-numeral mt-1 text-2xl text-light">{campaignSent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dim">Waitlist</p>
                    <p className="score-numeral mt-1 text-2xl text-light">
                      {waitlistTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <EmailDripBuilder />
            </div>
          ),
          "desk-performance": (
            <div className="space-y-6">
              <PostPerformanceTracker />
              <LinkedInAnalyticsImport />
            </div>
          ),
          "desk-competitive": <CompetitorPulse />,
          "desk-publish": <WebhookPublisher />,
          "desk-guardrails": (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass border border-crimson/20 p-6">
                <SectionHeader
                  eyebrow="Claim law"
                  title="Never say"
                  subtitle="No exceptions under growth pressure."
                />
                <ul className="mt-4 space-y-2 text-sm text-dim">
                  {CLAIM_NEVER_SAY.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-crimson" aria-hidden>
                        ×
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/marketing/gtm/SUPPORT-ARE-YOU-A-LENDER.md"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-block text-sm text-cyan hover:underline"
                >
                  “Are you a lender?” script →
                </a>
              </div>
              <div className="glass border border-emerald/20 p-6">
                <SectionHeader
                  eyebrow="Claim law"
                  title="Always prefer"
                  subtitle="Educational · decision-ready language."
                />
                <ul className="mt-4 space-y-2 text-sm text-dim">
                  {CLAIM_PREFER.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-emerald" aria-hidden>
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ),
          "desk-library": (
            <div className="glass p-6">
              <SectionHeader
                eyebrow="Brand ops"
                title="Marketing library"
                subtitle="Canonical under public/marketing/ — GitHub + live SoT."
              />
              <div className="mt-6">
                <MarketingLibrary sections={LIBRARY_SECTIONS} />
              </div>
            </div>
          ),
        }}
      />

      {/* 6. Proof — always expanded */}
      <section
        id="proof"
        className="mt-10 scroll-mt-[calc(var(--nav-offset)+3.5rem)]"
        aria-label="Proof"
      >
        <SectionHeader
          eyebrow="Prove"
          title="Activations & attribution"
          subtitle="Numbers that decide whether this week’s work created readiness completions."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass panel-focus p-6">
            <SectionHeader
              eyebrow="North star"
              title="Unique activated users — last 30 days"
              subtitle="Distinct users who completed a readiness path that day. Not completion spam."
            />
            <div className="mt-4">
              {activationSeries.length === 0 ? (
                <p className="py-10 text-center text-sm text-dim">
                  No activations in the last 30 days.
                </p>
              ) : (
                <BarSeries
                  id="mk-activations-30d"
                  counts={activationSeries}
                  color={COLORS.emerald}
                  height={150}
                  ariaLabel="Unique activated users over the last 30 days"
                />
              )}
            </div>
            <p className="mt-3 text-xs text-dim">
              7d: {uniqueActivated7d.toLocaleString()} unique activated ·{" "}
              {completions7d.toLocaleString()} completions · cohort{" "}
              {cohortActivated7d.toLocaleString()}/{accountsLast7.toLocaleString()} new accounts
              {cohortRate7d !== null
                ? ` (${cohortRate7d}%)`
                : cohortRateSuppressed
                  ? " (rate hidden — n under 5)"
                  : ""}
              {metricsCapped ? " · sample capped" : ""}.
            </p>
          </div>

          <div className="glass p-6">
            <SectionHeader
              eyebrow="Attribution"
              title="Source of last 10 activations"
              subtitle="First-touch snapshot on the assessment row."
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
                      <th className="pb-2 font-medium">Detail</th>
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
            <Link
              href="/admin/attribution"
              className="mt-4 inline-block text-sm text-cyan hover:underline"
            >
              Full attribution dashboard →
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="glass p-6 lg:col-span-1">
            <SectionHeader
              eyebrow="Funnel"
              title="Lifetime stages"
              subtitle="Waitlist → account → activation → paid."
            />
            <div className="mt-5">
              <FunnelBars stages={funnel} />
            </div>
          </div>
          <div className="glass p-6">
            <SectionHeader
              eyebrow="Channels"
              title="Signup sources"
              subtitle="First-touch on profiles (includes direct)."
            />
            <div className="mt-5">
              <RankedBars rows={channelRows} emptyLabel="No channel data yet." />
            </div>
          </div>
          <div className="glass p-6">
            <SectionHeader
              eyebrow="Outcomes"
              title="Verdict mix"
              subtitle="Completed assessments by verdict."
            />
            <div className="mt-5">
              <RankedBars rows={verdictRows} emptyLabel="No verdicts yet." />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Owned — email + revenue + demand */}
      <section
        id="owned"
        className="mt-10 scroll-mt-[calc(var(--nav-offset)+3.5rem)]"
        aria-label="Owned audience"
      >
        <SectionHeader
          eyebrow="Own"
          title="Email & demand"
          subtitle="Resend + admin campaigns. Launch sequence lives under public/marketing/launch/emails/."
        />

        <div className="glass mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader
              eyebrow="Owned audience"
              title="Email OS"
              subtitle="Load launch 01–04 as drafts. Do not blast a cold list."
            />
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${
                  resendConfigured
                    ? "border-emerald/40 bg-emerald/10 text-emerald"
                    : "border-crimson/40 bg-crimson/10 text-light"
                }`}
              >
                Resend {resendConfigured ? "key set" : "not configured"}
              </span>
              <a href="#drip-builder" className="btn btn-ghost btn-sm">
                Build drip sequence →
              </a>
              <Link href="/admin/email" className="btn btn-primary btn-sm">
                Open composer
              </Link>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-dim">Campaigns</p>
              <p className="score-numeral mt-1 text-2xl text-light">{campaigns.length}</p>
            </div>
            <div>
              <p className="text-xs text-dim">Drafts</p>
              <p className="score-numeral mt-1 text-2xl text-light">{campaignDrafts}</p>
            </div>
            <div>
              <p className="text-xs text-dim">Sent</p>
              <p className="score-numeral mt-1 text-2xl text-light">{campaignSent}</p>
            </div>
            <div>
              <p className="text-xs text-dim">Waitlist</p>
              <p className="score-numeral mt-1 text-2xl text-light">
                {waitlistTotal.toLocaleString()}
              </p>
            </div>
          </div>
          {campaigns.length === 0 ? (
            <p className="mt-5 text-sm text-dim">
              No campaigns yet. Create four drafts from launch emails 01–04.{" "}
              <a
                href="/marketing/launch/emails/README.md"
                target="_blank"
                rel="noreferrer"
                className="text-cyan hover:underline"
              >
                Load path →
              </a>
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-3xs uppercase tracking-wide text-dim">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Audience</th>
                    <th className="pb-2 font-medium">Recipients</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b border-white/5">
                      <td className="py-2 pr-3 text-light">{c.name || c.subject}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-cyan">{c.status}</td>
                      <td className="py-2 pr-3 text-xs text-dim">{c.audience}</td>
                      <td className="py-2 text-xs text-dim">{c.recipient_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass mt-6 p-6">
          <SectionHeader
            eyebrow="Revenue"
            title="Recurring revenue"
            subtitle="List-price MRR proxy from active paid tiers (admin comps excluded)."
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
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dim">Tier mix</p>
              {totalTiered === 0 ? (
                <p className="text-sm text-dim">No accounts yet.</p>
              ) : (
                <div className="space-y-3">
                  {TIER_ORDER.map((tier) => {
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
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dim">
                Momentum (30d)
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-3xs text-dim">Signups</p>
                  {signupSeries.length === 0 ? (
                    <p className="text-xs text-dim">—</p>
                  ) : (
                    <BarSeries
                      id="mk-signups-30d"
                      counts={signupSeries}
                      color={COLORS.cyan}
                      height={100}
                      ariaLabel="Account signups last 30 days"
                    />
                  )}
                </div>
                <div>
                  <p className="mb-1 text-3xs text-dim">Waitlist</p>
                  {waitlistSeries.length === 0 ? (
                    <p className="text-xs text-dim">—</p>
                  ) : (
                    <BarSeries
                      id="mk-waitlist-30d"
                      counts={waitlistSeries}
                      color={COLORS.amber}
                      height={100}
                      ariaLabel="Waitlist last 30 days"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass mt-6 p-6">
          <SectionHeader
            eyebrow="Demand"
            title="What the waitlist wants"
            subtitle="Interest areas at signup — content backlog fuel."
          />
          <div className="mt-5 max-w-2xl">
            <RankedBars
              rows={interestCounts.map((i) => ({ label: i.interest, count: i.count }))}
              total={totalInterest || undefined}
              emptyLabel="No interest tags captured yet."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
