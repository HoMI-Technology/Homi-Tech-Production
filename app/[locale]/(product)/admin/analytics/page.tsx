import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/ui/StatTile";
import { Sparkline } from "@/components/ui/Sparkline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarSeries } from "@/components/admin/BarSeries";
import { FunnelSeries, type FunnelSeriesStep } from "@/components/admin/FunnelSeries";
import { hasPostHogAnalytics, hasPostHog } from "@/lib/env";
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
  const options: { value: AnalyticsRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
  ];
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-surface/70 bg-navy-light/60 p-0.5"
    >
      {options.map((opt) => {
        const active = range === opt.value;
        return (
          <Link
            key={opt.value}
            href={`/admin/analytics?range=${opt.value}`}
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-slate-surface/80 text-cyan shadow-[inset_0_1px_0_rgba(226,232,240,0.06)]"
                : "text-dim hover:text-light"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}

function SetupState() {
  const missingCapture = !hasPostHog();
  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Create a PostHog personal API key",
      body: (
        <>
          In PostHog, open <span className="text-light">Settings → Personal API keys</span> and
          create a key with the <span className="font-mono text-cyan">query</span> read scope
          (project-scoped is fine).
        </>
      ),
    },
    {
      title: "Add it to your environment",
      body: (
        <>
          Set <span className="rounded bg-slate-surface px-1.5 py-0.5 font-mono text-xs text-cyan">POSTHOG_PERSONAL_API_KEY</span>{" "}
          in <span className="font-mono text-xs text-light">.env.local</span> and your hosting
          provider. The project id is auto-detected; set{" "}
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
      : []),
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Owner analytics</p>
          <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-dim">
            Traffic, sessions, and the product funnel — queried live from PostHog (HogQL), cached 5
            minutes.
          </p>
        </div>
        {configured && <RangeToggle range={range} />}
      </div>

      {!configured ? (
        <SetupState />
      ) : !bundle ? (
        <ErrorNote />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatTile
              label="Visits"
              value={bundle.overview.visits.toLocaleString()}
              accent="#22d3ee"
              footer={`Sessions · last ${days}d`}
            />
            <StatTile
              label="Uniques"
              value={bundle.overview.uniques.toLocaleString()}
              accent="#34d399"
              footer="Distinct visitors"
              spark={
                uniquesDaily.length >= 2 ? (
                  <Sparkline id="admin-analytics-uniques" values={uniquesDaily} color="#34d399" />
                ) : undefined
              }
            />
            <StatTile
              label="Views"
              value={bundle.overview.views.toLocaleString()}
              accent="#facc15"
              footer="Page views"
              spark={
                filledDaily.length >= 2 ? (
                  <Sparkline
                    id="admin-analytics-views"
                    values={filledDaily.map((d) => d.count)}
                    color="#facc15"
                  />
                ) : undefined
              }
            />
            <StatTile
              label="Avg session"
              value={formatDuration(bundle.overview.avgSessionSeconds)}
              accent="#fab633"
              footer="First to last event"
            />
            <StatTile
              label="Bounce rate"
              value={formatPct(bundle.overview.bounceRatePct)}
              accent="#94a3b8"
              footer="Single-page sessions"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass p-6">
              <SectionHeader
                eyebrow="Traffic"
                title={`Page views — last ${days} days`}
                subtitle="From the page_viewed occurrence event (cookieless, memory persistence)."
              />
              <div className="mt-4">
                {filledDaily.every((d) => d.count === 0) ? (
                  <p className="py-10 text-center text-sm text-dim">
                    No page views recorded in this window yet.
                  </p>
                ) : (
                  <BarSeries
                    id={`analytics-views-${range}`}
                    counts={filledDaily}
                    color="#22d3ee"
                    ariaLabel={`Page views over the last ${days} days`}
                  />
                )}
              </div>
            </div>

            <div className="glass p-6">
              <SectionHeader
                eyebrow="Funnel"
                title="Assessment → share"
                subtitle="Distinct users reaching each step in the window."
              />
              <div className="mt-5">
                <FunnelSeries steps={funnelSteps} />
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-dim">
            Cookieless capture (memory persistence) means uniques and sessions are directional, not
            absolute. Counts are occurrence-only — no scores, answers, or PII leave PostHog.
          </p>
        </>
      )}
    </div>
  );
}
