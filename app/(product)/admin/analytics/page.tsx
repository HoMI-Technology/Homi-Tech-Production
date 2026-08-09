import type { Metadata } from "next";
import { Sparkline } from "@/components/ui/Sparkline";
import { SegmentedLinkNav } from "@/components/ui/SegmentedControl";
import { BarSeries } from "@/components/admin/BarSeries";
import { FunnelSeries, type FunnelSeriesStep } from "@/components/admin/FunnelSeries";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { hasPostHogAnalytics, hasPostHog } from "@/lib/env";
import { COLORS } from "@/lib/brand";
import {
  getAnalyticsBundle,
  parseRange,
  rangeDays,
  type AnalyticsRange,
} from "@/lib/analytics/posthog";

export const metadata: Metadata = {
  title: "Analytics | Admin | HōMI",
  description: "Owner analytics — traffic, sessions, and product funnel from PostHog.",
};

const FUNNEL_LABELS: Record<string, string> = {
  assessment_started: "Assessment started",
  assessment_completed: "Assessment completed",
  checkout_started: "Checkout started",
  checkout_completed: "Checkout completed",
  share_created: "Share created",
  path_generated: "Path generated",
  path_habit_impression: "Path habit shown",
  path_page_viewed: "Path page opened",
  path_start_step_clicked: "Start step clicked",
  path_first_step_done: "First step done",
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${String(rem).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

function formatPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function RangeToggle({ range }: { range: AnalyticsRange }) {
  // Navigation, not tabs: real links with aria-current (URL-driven range).
  const options: { value: AnalyticsRange; label: string; href: string }[] = [
    { value: "7d", label: "7 days", href: "/admin/analytics?range=7d" },
    { value: "30d", label: "30 days", href: "/admin/analytics?range=30d" },
  ];
  return <SegmentedLinkNav options={options} value={range} ariaLabel="Date range" />;
}

function SetupState() {
  const missingCapture = !hasPostHog();
  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Create a PostHog personal API key",
      body: (
        <>
          Client-side tracking already fires when{" "}
          <span className="font-mono text-xs text-light">NEXT_PUBLIC_POSTHOG_KEY</span> is set —
          this dashboard is the missing half. In PostHog, open{" "}
          <span className="text-light">Settings → Personal API keys</span> and create a key with
          the <span className="font-mono text-cyan">query</span> read scope (project-scoped is
          fine).
        </>
      ),
    },
    {
      title: "Add it to your environment",
      body: (
        <>
          Set <span className="rounded bg-slate-surface px-1.5 py-0.5 font-mono text-xs text-cyan">POSTHOG_PERSONAL_API_KEY</span>{" "}
          in <span className="font-mono text-xs text-light">.env.local</span> and your hosting
          provider (Vercel → Project → Settings → Environment Variables). Redeploy after saving.
          The project id is auto-detected; set{" "}
          <span className="rounded bg-slate-surface px-1.5 py-0.5 font-mono text-xs text-cyan">POSTHOG_PROJECT_ID</span>{" "}
          only to pin a specific project.
        </>
      ),
    },
    ...(missingCapture
      ? [
          {
            title: "Enable event capture",
            body: (
              <>
                <span className="rounded bg-slate-surface px-1.5 py-0.5 font-mono text-xs text-cyan">NEXT_PUBLIC_POSTHOG_KEY</span>{" "}
                is not set, so no events are flowing yet. Add it (and optionally{" "}
                <span className="font-mono text-xs text-light">NEXT_PUBLIC_POSTHOG_HOST</span>) —
                the snippet and server capture activate automatically.
              </>
            ),
          },
        ]
      : [
          {
            title: "Capture is already live",
            body: (
              <>
                <span className="rounded bg-slate-surface px-1.5 py-0.5 font-mono text-xs text-cyan">NEXT_PUBLIC_POSTHOG_KEY</span>{" "}
                is set — page views and product events are already reaching PostHog. Only the
                personal API key above is needed for this admin view to query them.
              </>
            ),
          },
        ]),
    {
      title: "Redeploy and come back",
      body: (
        <>
          Metrics are queried server-side via HogQL and cached for 5 minutes. Traffic cards fill
          in as soon as <span className="font-mono text-xs text-light">page_viewed</span> events
          arrive; the funnel uses the product events already wired across the app.
        </>
      ),
    },
  ];

  return (
    <div className="glass mt-8 p-8 md:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-cyan">
          <path d="M3 16.5v-5M8 16.5V8M13 16.5v-3M18 16.5V4" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-5 text-center font-display text-xl text-light">Connect PostHog to see analytics</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-dim">
        The dashboard is ready — it queries your PostHog project server-side and never exposes
        the key to the browser. A few one-time setup steps remain.
      </p>
      <ol className="mx-auto mt-8 max-w-xl space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="score-numeral mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-surface text-xs text-cyan">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-light">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ErrorNote() {
  return (
    <div className="glass mt-8 p-8 md:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-amber">
          <path d="M10 3l8 14H2l8-14z" strokeLinejoin="round" />
          <path d="M10 8.5v3.5M10 14.8h.01" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-5 text-center font-display text-xl text-light">PostHog isn&apos;t answering</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-dim">
        The query API call failed. Confirm the personal API key has the{" "}
        <span className="font-mono text-cyan">query</span> scope, that it belongs to the same
        PostHog project as <span className="font-mono text-xs text-light">NEXT_PUBLIC_POSTHOG_KEY</span>,
        and that the host is reachable. Details are in the server logs under{" "}
        <span className="font-mono text-xs text-light">[posthog-analytics]</span>.
      </p>
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const days = rangeDays(range);

  const configured = hasPostHogAnalytics();
  const bundle = configured ? await getAnalyticsBundle(range) : null;

  // Fill zero-days so the trend chart keeps a continuous axis.
  const filledDaily: { date: string; count: number }[] = [];
  const uniquesDaily: number[] = [];
  if (bundle) {
    const byDay = new Map(bundle.daily.map((d) => [d.day, d]));
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = dayKey(d);
      const row = byDay.get(key);
      filledDaily.push({ date: shortLabel(key), count: row?.views ?? 0 });
      uniquesDaily.push(row?.uniques ?? 0);
    }
  }

  const funnelSteps: FunnelSeriesStep[] = (bundle?.funnel ?? []).map((s) => ({
    label: FUNNEL_LABELS[s.event] ?? s.event,
    event: s.event,
    users: s.users,
    occurrences: s.occurrences,
  }));
  const pathHabitSteps: FunnelSeriesStep[] = (bundle?.pathHabitFunnel ?? []).map(
    (s) => ({
      label: FUNNEL_LABELS[s.event] ?? s.event,
      event: s.event,
      users: s.users,
      occurrences: s.occurrences,
    }),
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Admin"
          title="Analytics"
          description="Traffic, sessions, and product funnel from PostHog (HogQL), cached 5 minutes."
        />
        {configured && <RangeToggle range={range} />}
      </div>

      {!configured ? (
        <SetupState />
      ) : !bundle ? (
        <ErrorNote />
      ) : (
        <>
          <div className="mt-6">
            <MetricRail
              cells={[
                {
                  label: "Visits",
                  value: bundle.overview.visits.toLocaleString(),
                  footer: `Sessions · last ${days}d`,
                  color: COLORS.cyan,
                },
                {
                  label: "Uniques",
                  value: bundle.overview.uniques.toLocaleString(),
                  footer: "Distinct visitors",
                  color: COLORS.emerald,
                },
                {
                  label: "Views",
                  value: bundle.overview.views.toLocaleString(),
                  footer: "Page views",
                  color: COLORS.yellow,
                },
                {
                  label: "Avg session",
                  value: formatDuration(bundle.overview.avgSessionSeconds),
                  footer: "First to last event",
                  color: COLORS.amber,
                },
                {
                  label: "Bounce",
                  value: formatPct(bundle.overview.bounceRatePct),
                  footer: "Single-page sessions",
                  color: COLORS.dim,
                },
              ]}
            />
            {(uniquesDaily.length >= 2 || filledDaily.length >= 2) && (
              <div className="mt-3 flex flex-wrap justify-end gap-6">
                {uniquesDaily.length >= 2 && (
                  <div className="w-36">
                    <p className="mb-1 text-3xs uppercase tracking-wide text-dim">Uniques</p>
                    <Sparkline id="admin-analytics-uniques" values={uniquesDaily} color={COLORS.emerald} />
                  </div>
                )}
                {filledDaily.length >= 2 && (
                  <div className="w-36">
                    <p className="mb-1 text-3xs uppercase tracking-wide text-dim">Views</p>
                    <Sparkline
                      id="admin-analytics-views"
                      values={filledDaily.map((d) => d.count)}
                      color={COLORS.yellow}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass p-6">
              <div className="dash-section-head">
                <h2>Page views · last {days} days</h2>
                <p>From page_viewed (cookieless, memory persistence).</p>
              </div>
              <div className="mt-4">
                {filledDaily.every((d) => d.count === 0) ? (
                  <p className="py-10 text-center text-sm text-dim">
                    No page views recorded in this window yet.
                  </p>
                ) : (
                  <BarSeries
                    id={`analytics-views-${range}`}
                    counts={filledDaily}
                    color={COLORS.cyan}
                    ariaLabel={`Page views over the last ${days} days`}
                  />
                )}
              </div>
            </div>

            <div className="glass p-6">
              <div className="dash-section-head">
                <h2>Assessment to share</h2>
                <p>Distinct users reaching each step in the window.</p>
              </div>
              <div className="mt-5">
                <FunnelSeries steps={funnelSteps} />
              </div>
            </div>

            <div className="glass p-6">
              <div className="dash-section-head">
                <h2>Path habit (NOT_YET activation)</h2>
                <p>
                  Generated → shown → opened → start step → first step done.
                  North star for protective path adoption.
                </p>
              </div>
              <div className="mt-5">
                <FunnelSeries steps={pathHabitSteps} />
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-dim">
            Cookieless capture means uniques and sessions are directional, not absolute. Counts are
            occurrence-only. No scores, answers, or PII leave PostHog.
          </p>
        </>
      )}
    </div>
  );
}
