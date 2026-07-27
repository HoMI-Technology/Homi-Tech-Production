import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { AdSpendForm } from "@/components/admin/AdSpendForm";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { channelConversion, deriveChannel, type AttributionLike } from "@/lib/dashboard/attribution";
import { formatUsdFromCents } from "@/lib/dashboard/revenue";
import {
  blendedCacCents,
  computeChannelPerformance,
  sumSpendCents,
  type ChannelInputs,
} from "@/lib/dashboard/spend";
import type { AdSpend } from "@/types/database";

export const metadata: Metadata = {
  title: "Ad Spend & CAC | Admin | HōMI",
  description: "Log paid-media spend and see blended and per-channel CAC and ROAS.",
};

type ProfileRow = { id: string; attribution: AttributionLike; subscription_tier: string | null };
type PaymentRow = { user_id: string | null; amount: number; status: string };

function fmtCacRoas(value: number | null, kind: "usd" | "x"): string {
  if (value === null) return "—";
  return kind === "usd" ? formatUsdFromCents(value) : `${value.toFixed(2)}×`;
}

export default async function AdminAdSpendPage() {
  const supabase = await createClient();

  let spendRows: AdSpend[] = [];
  let profiles: ProfileRow[] = [];
  let payments: PaymentRow[] = [];

  try {
    const { data } = await supabase
      .from("ad_spend")
      .select("*")
      .order("spend_date", { ascending: false })
      .limit(1000);
    spendRows = (data as AdSpend[] | null) ?? [];
  } catch {
    spendRows = [];
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, attribution, subscription_tier")
      .limit(10000);
    profiles = (data as ProfileRow[] | null) ?? [];
  } catch {
    profiles = [];
  }

  try {
    const { data } = await supabase
      .from("payments")
      .select("user_id, amount, status")
      .eq("status", "succeeded")
      .limit(10000);
    payments = (data as PaymentRow[] | null) ?? [];
  } catch {
    payments = [];
  }

  // Per-channel signups & paid from attribution.
  const conversion = channelConversion(
    profiles.map((p) => ({ attribution: p.attribution, subscription_tier: p.subscription_tier })),
  );

  // Revenue per channel: map each succeeded payment's user to their channel.
  const userChannel = new Map<string, string>();
  for (const p of profiles) userChannel.set(p.id, deriveChannel(p.attribution));
  const revenueByChannel = new Map<string, number>();
  for (const pay of payments) {
    const channel = (pay.user_id && userChannel.get(pay.user_id)) || "direct";
    revenueByChannel.set(channel, (revenueByChannel.get(channel) ?? 0) + (pay.amount || 0));
  }

  // Spend + impressions + clicks per channel from the ledger.
  const spendByChannel = new Map<string, { spend: number; impressions: number; clicks: number }>();
  for (const r of spendRows) {
    const b = spendByChannel.get(r.channel) ?? { spend: 0, impressions: 0, clicks: 0 };
    b.spend += r.spend_cents;
    b.impressions += r.impressions;
    b.clicks += r.clicks;
    spendByChannel.set(r.channel, b);
  }

  // Merge every channel that appears in spend, conversion, or revenue.
  const byChannel: Record<string, ChannelInputs> = {};
  const ensure = (c: string): ChannelInputs => (byChannel[c] ??= {});
  for (const [channel, v] of spendByChannel) {
    const e = ensure(channel);
    e.spendCents = v.spend;
    e.impressions = v.impressions;
    e.clicks = v.clicks;
  }
  for (const row of conversion) {
    const e = ensure(row.channel);
    e.signups = row.signups;
    e.paid = row.paid;
  }
  for (const [channel, revenue] of revenueByChannel) {
    ensure(channel).revenueCents = revenue;
  }

  const performance = computeChannelPerformance(byChannel);
  const totalSpend = sumSpendCents(spendRows);
  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPaid = conversion.reduce((acc, c) => acc + c.paid, 0);
  const blendedCac = blendedCacCents(performance);
  const blendedRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : null;

  const channelSuggestions = [...new Set(conversion.map((c) => c.channel))].filter(
    (c) => c !== "direct",
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Ad Spend & CAC"
        description="Log paid-media spend, then read blended and per-channel CAC and ROAS against attributed signups and revenue."
        primaryAction={{ label: "Attribution", href: "/admin/attribution", variant: "ghost" }}
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Total spend",
              value: formatUsdFromCents(totalSpend),
              footer: `${spendRows.length.toLocaleString()} logged lines`,
              color: "#fab633",
            },
            {
              label: "Blended CAC",
              value: fmtCacRoas(blendedCac, "usd"),
              footer: `${totalPaid.toLocaleString()} paid customers`,
              color: "#22d3ee",
            },
            {
              label: "Blended ROAS",
              value: fmtCacRoas(blendedRoas, "x"),
              footer: "Revenue ÷ spend",
              color: "#34d399",
            },
            {
              label: "Revenue (all-time)",
              value: formatUsdFromCents(totalRevenue),
              footer: "Succeeded payments",
              color: "#facc15",
            },
          ]}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass panel-focus p-6">
          <SectionHeader
            eyebrow="Log spend"
            title="Add a spend line"
            subtitle="Manual entry — the one input no external tool has."
          />
          <div className="mt-5">
            <AdSpendForm channelSuggestions={channelSuggestions} />
          </div>
        </div>

        <div className="glass p-6">
          <SectionHeader
            eyebrow="Performance"
            title="CAC & ROAS by channel"
            subtitle="Spend joined to attributed signups, paid customers, and revenue."
            action={
              performance.length > 0 ? (
                <CsvExportButton
                  filename={`homi-cac-by-channel-${new Date().toISOString().slice(0, 10)}.csv`}
                  headers={["Channel", "Spend", "Signups", "Paid", "CAC", "ROAS", "Revenue"]}
                  rows={performance.map((r) => ({
                    Channel: r.channel,
                    Spend: formatUsdFromCents(r.spendCents),
                    Signups: String(r.signups),
                    Paid: String(r.paid),
                    CAC: fmtCacRoas(r.cacCents, "usd"),
                    ROAS: fmtCacRoas(r.roas, "x"),
                    Revenue: formatUsdFromCents(r.revenueCents),
                  }))}
                />
              ) : undefined
            }
          />
          {performance.length === 0 ? (
            <p className="mt-4 py-8 text-center text-sm text-dim">
              No spend or signups yet. Log a spend line to start tracking CAC and ROAS.
            </p>
          ) : (
            <div className="mt-3 table-scroll">
              <table className="table-premium min-w-[560px]">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Spend</th>
                    <th>Signups</th>
                    <th>Paid</th>
                    <th>CAC</th>
                    <th>ROAS</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((r) => (
                    <tr key={r.channel}>
                      <td className="font-medium capitalize text-light">{r.channel}</td>
                      <td className="score-numeral text-dim">{formatUsdFromCents(r.spendCents)}</td>
                      <td className="score-numeral text-dim">{r.signups.toLocaleString()}</td>
                      <td className="score-numeral text-dim">{r.paid.toLocaleString()}</td>
                      <td className="score-numeral text-light">{fmtCacRoas(r.cacCents, "usd")}</td>
                      <td className="score-numeral text-light">{fmtCacRoas(r.roas, "x")}</td>
                      <td className="score-numeral text-dim">{formatUsdFromCents(r.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="glass mt-8 p-6">
        <SectionHeader eyebrow="Ledger" title="Recent spend lines" subtitle="Newest first." />
        {spendRows.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-dim">No spend logged yet.</p>
        ) : (
          <div className="mt-3 table-scroll">
            <table className="table-premium min-w-[520px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Channel</th>
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Impr.</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {spendRows.slice(0, 50).map((r) => (
                  <tr key={r.id}>
                    <td className="text-dim">{r.spend_date}</td>
                    <td className="font-medium capitalize text-light">{r.channel}</td>
                    <td className="text-dim">{r.campaign || "—"}</td>
                    <td className="score-numeral text-dim">{formatUsdFromCents(r.spend_cents)}</td>
                    <td className="score-numeral text-dim">{r.impressions.toLocaleString()}</td>
                    <td className="score-numeral text-dim">{r.clicks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-dim">
        CAC and ROAS use manually logged spend joined to first-touch attribution and succeeded
        payments. Figures are directional. HōMI Technologies LLC.
      </p>
    </div>
  );
}
