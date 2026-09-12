import type { Metadata } from "next";
import { SegmentedLinkNav } from "@/components/ui/SegmentedControl";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageHeader } from "@/components/operate/PageHeader";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { hasPostHogAnalytics } from "@/lib/env";
import { COLORS } from "@/lib/brand";
import {
  getAnalyticsBundle,
  parseRange,
  rangeDays,
  type AnalyticsRange,
} from "@/lib/analytics/posthog";
import {
  ADMIN_V4_ANALYTICS_CONSOLE_EMPTY,
  buildAdminAnalyticsV4View,
  type AdminAnalyticsV4Bundle,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Analytics | Admin | HōMI",
  description: "Owner analytics — traffic, sessions, and product funnel from PostHog.",
};

function RangeToggle({ range }: { range: AnalyticsRange }) {
  const options: { value: AnalyticsRange; label: string; href: string }[] = [
    { value: "7d", label: "7 days", href: "/admin/analytics?range=7d" },
    { value: "30d", label: "30 days", href: "/admin/analytics?range=30d" },
  ];
  return <SegmentedLinkNav options={options} value={range} ariaLabel="Date range" />;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const days = rangeDays(range);

  let bundle: AdminAnalyticsV4Bundle | null = null;
  let loadError = !hasPostHogAnalytics();
  if (!loadError) {
    try {
      const live = await getAnalyticsBundle(range);
      if (!live) {
        loadError = true;
      } else {
        bundle = live;
      }
    } catch {
      loadError = true;
      bundle = null;
    }
  }

  const view = buildAdminAnalyticsV4View({ bundle, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_ANALYTICS_CONSOLE_EMPTY} />
      ) : (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Admin"
          title="Analytics"
          description={`Traffic and product funnel from PostHog · last ${days}d.`}
        />
        <RangeToggle range={range} />
      </div>

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Visits",
              value: String(view.visits),
              footer: `Sessions · last ${days}d`,
              color: COLORS.cyan,
            },
            {
              label: "Uniques",
              value: String(view.uniques),
              footer: "Distinct visitors",
              color: COLORS.emerald,
            },
            {
              label: "Views",
              value: String(view.views),
              footer: "Page views",
              color: COLORS.yellow,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[640px]">
          <thead>
            <tr>
              <th>Event</th>
              <th>Users</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.event}>
                <td className="font-mono text-xs">{row.event}</td>
                <td className="text-dim">{String(row.users)}</td>
                <td className="text-dim">{String(row.occurrences)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </PageFrame>
  );
}
