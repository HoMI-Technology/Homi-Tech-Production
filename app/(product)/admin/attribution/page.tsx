import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FunnelBars, type FunnelStage } from "@/components/admin/FunnelBars";
import { RankedBars } from "@/components/admin/RankedBars";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { PageHeader } from "@/components/operate/PageHeader";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import {
  attributionCoverage,
  channelConversion,
  channelCounts,
  countBy,
  dimension,
  isAttributed,
  sourceMediumBreakdown,
  type AttributionLike,
} from "@/lib/dashboard/attribution";
import { COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Attribution | Admin | HōMI",
  description:
    "Acquisition channels, sources, campaigns, and channel-level conversion from first-touch data.",
};

/** Canon accent cycle for channel rows (brand-locked palette only). */
const ACCENTS = [COLORS.cyan, COLORS.emerald, COLORS.yellow, COLORS.amber, COLORS.dim];

type ProfileRow = {
  attribution: AttributionLike;
  subscription_tier: string | null;
};

export default async function AdminAttributionPage() {
  const supabase = await createClient();

  let profiles: ProfileRow[] = [];
  let assessments: AttributionLike[] = [];

  try {
    const { data } = await supabase
      .from("profiles")
      .select("attribution, subscription_tier")
      .limit(10000);
    profiles = (data as ProfileRow[] | null) ?? [];
  } catch {
    profiles = [];
  }

  try {
    const { data } = await supabase
      .from("assessments")
      .select("attribution")
      .eq("status", "completed")
      .limit(10000);
    assessments = ((data as { attribution: AttributionLike }[] | null) ?? []).map(
      (r) => r.attribution,
    );
  } catch {
    assessments = [];
  }

  const profileAttrs = profiles.map((p) => p.attribution);

  const totalSignups = profiles.length;
  const coverage = attributionCoverage(profileAttrs);
  const attributedSignups = Math.round(coverage * totalSignups);

  const channels = channelCounts(profileAttrs);
  const nonDirectChannels = channels.filter((c) => c.key !== "direct");
  const topChannel = nonDirectChannels[0]?.key ?? "—";

  const sourceMedium = sourceMediumBreakdown(profileAttrs, 8);
  const campaigns = countBy(profileAttrs, (a) => dimension(a, "utm_campaign"), 8);
  const conversion = channelConversion(profiles);

  const paidFromAttributed = conversion
    .filter((c) => c.channel !== "direct")
    .reduce((acc, c) => acc + c.paid, 0);

  // Attribution funnel — the attributed cohort only.
  const attributedAssessmentsCount = assessments.reduce(
    (acc, a) => acc + (isAttributed(a) ? 1 : 0),
    0,
  );

  const funnel: FunnelStage[] = [
    { label: "Attributed signups", count: attributedSignups, color: COLORS.cyan },
    { label: "Attributed assessments", count: attributedAssessmentsCount, color: COLORS.emerald },
    { label: "Paid (attributed)", count: paidFromAttributed, color: COLORS.yellow },
  ];

  const channelRows = channels.map((c, i) => ({
    label: c.key,
    count: c.count,
    color: ACCENTS[i % ACCENTS.length],
  }));

  const hasAnyAttribution = attributedSignups > 0 || sourceMedium.length > 0;

  return (
    <PageFrame role="admin" density="compact">
      <PageHeader
        eyebrow="Admin"
        title="Attribution"
        description="Where users come from — channels, sources, and campaigns from first-touch capture, with channel-level conversion to paid."
        primaryAction={{ label: "Marketing", href: "/admin/marketing", variant: "ghost" }}
        secondaryAction={{ label: "Analytics", href: "/admin/analytics", variant: "ghost" }}
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Attributed signups",
              value: attributedSignups.toLocaleString(),
              footer: `of ${totalSignups.toLocaleString()} total accounts`,
              color: COLORS.cyan,
            },
            {
              label: "Coverage",
              value: `${Math.round(coverage * 100)}%`,
              footer: "Accounts with a known source",
              color: COLORS.emerald,
            },
            {
              label: "Top channel",
              value: topChannel,
              footer: nonDirectChannels[0]
                ? `${nonDirectChannels[0].count.toLocaleString()} signups`
                : "No channel data yet",
              color: COLORS.yellow,
            },
            {
              label: "Paid (attributed)",
              value: paidFromAttributed.toLocaleString(),
              footer: "Paid accounts with a source",
              color: COLORS.amber,
            },
          ]}
        />
      </div>

      {!hasAnyAttribution ? (
        <div className="glass mt-8 p-8 text-center">
          <p className="text-sm text-dim">
            No attribution captured yet. First-touch{" "}
            <span className="font-mono text-light">?utm_*</span> /{" "}
            <span className="font-mono text-light">?ref</span> parameters are snapshotted onto each
            account as traffic arrives from campaigns and referrals — this dashboard fills in once
            tagged links start driving signups.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="glass panel-focus p-6">
              <SectionHeader
                eyebrow="Conversion"
                title="Attribution funnel"
                subtitle="The attributed cohort, from signup through to paid."
              />
              <div className="mt-6">
                <FunnelBars stages={funnel} />
              </div>
            </div>

            <div className="glass p-6">
              <SectionHeader
                eyebrow="Mix"
                title="Channels"
                subtitle="Share of accounts by acquisition channel."
              />
              <div className="mt-5">
                <RankedBars
                  rows={channelRows}
                  emptyLabel="No channel data yet."
                  total={totalSignups}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="glass p-6">
              <SectionHeader eyebrow="Source × medium" title="Where traffic originates" />
              <div className="mt-5">
                <RankedBars
                  rows={sourceMedium.map((r) => ({
                    label: r.source,
                    sublabel: r.medium,
                    count: r.count,
                  }))}
                  color={COLORS.emerald}
                  emptyLabel="No tagged sources yet."
                />
              </div>
            </div>

            <div className="glass p-6">
              <SectionHeader
                eyebrow="Campaigns"
                title="Top campaigns"
                subtitle="By utm_campaign, first-touch."
              />
              <div className="mt-5">
                <RankedBars
                  rows={campaigns.map((c) => ({ label: c.key, count: c.count }))}
                  color={COLORS.yellow}
                  emptyLabel="No campaign tags yet."
                />
              </div>
            </div>
          </div>

          <div className="glass mt-8 p-6">
            <SectionHeader
              eyebrow="Performance"
              title="Conversion by channel"
              subtitle="Signup → paid rate for each channel."
              action={
                conversion.length > 0 ? (
                  <CsvExportButton
                    filename={`homi-attribution-by-channel-${new Date().toISOString().slice(0, 10)}.csv`}
                    headers={["Channel", "Signups", "Paid", "Paid %"]}
                    rows={conversion.map((c) => ({
                      Channel: c.channel,
                      Signups: String(c.signups),
                      Paid: String(c.paid),
                      "Paid %": `${c.paidPct}%`,
                    }))}
                  />
                ) : undefined
              }
            />
            {conversion.length === 0 ? (
              <p className="mt-4 py-6 text-center text-sm text-dim">No accounts yet.</p>
            ) : (
              <div className="mt-3 table-scroll">
                <table className="table-premium min-w-[420px]">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Signups</th>
                      <th>Paid</th>
                      <th>Paid rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversion.map((c) => (
                      <tr key={c.channel}>
                        <td className="font-medium capitalize text-light">{c.channel}</td>
                        <td className="score-numeral text-dim">{c.signups.toLocaleString()}</td>
                        <td className="score-numeral text-dim">{c.paid.toLocaleString()}</td>
                        <td className="score-numeral text-dim">{c.paidPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-center text-xs text-dim">
        First-touch attribution — occurrence data only (channel + landing path), never user-entered
        content. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
