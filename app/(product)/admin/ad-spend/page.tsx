import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageHeader } from "@/components/operate/PageHeader";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { AdSpendForm } from "@/components/admin/AdSpendForm";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_AD_SPEND_CONSOLE_EMPTY,
  buildAdminAdSpendV4View,
  type AdminAdSpendV4PaymentRow,
  type AdminAdSpendV4ProfileRow,
  type AdminAdSpendV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Ad Spend | Admin | HōMI",
  description: "Logged paid-media spend lines from the live ledger.",
};

export default async function AdminAdSpendPage() {
  const supabase = await createClient();

  let rows: AdminAdSpendV4SourceRow[] = [];
  let profiles: AdminAdSpendV4ProfileRow[] = [];
  let payments: AdminAdSpendV4PaymentRow[] = [];
  let loadError = false;

  try {
    const { data: spendData, error: spendError } = await supabase
      .from("ad_spend")
      .select("id, spend_date, channel, campaign, spend_cents, impressions, clicks")
      .order("spend_date", { ascending: false })
      .limit(1000);
    if (spendError) {
      loadError = true;
    } else {
      rows = (spendData as AdminAdSpendV4SourceRow[] | null) ?? [];
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, subscription_tier")
      .limit(10000);
    if (profileError) {
      loadError = true;
      profiles = [];
    } else {
      profiles = (profileData as AdminAdSpendV4ProfileRow[] | null) ?? [];
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("user_id, amount, status")
      .eq("status", "succeeded")
      .limit(10000);
    if (paymentError) {
      loadError = true;
      payments = [];
    } else {
      payments = (paymentData as AdminAdSpendV4PaymentRow[] | null) ?? [];
    }
  } catch {
    loadError = true;
    rows = [];
    profiles = [];
    payments = [];
  }

  const view = buildAdminAdSpendV4View({ rows, profiles, payments, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <>
          <AdminRoomEmptyV4 title={ADMIN_V4_AD_SPEND_CONSOLE_EMPTY} />
          <div className="glass mt-6 p-6">
            <AdSpendForm channelSuggestions={[]} />
          </div>
        </>
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Ad spend"
        description="Logged paid-media lines. Amounts are cents from the live ledger."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Ledger lines",
              color: COLORS.amber,
            },
            {
              label: "Spend cents",
              value: String(view.spendCents),
              footer: "Sum of live lines",
              color: COLORS.cyan,
            },
            {
              label: "Paid",
              value: String(view.paidCount),
              footer: "Non-free profiles",
              color: COLORS.emerald,
            },
            {
              label: "Payments",
              value: String(view.paymentCount),
              footer: "Succeeded",
              color: COLORS.yellow,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 p-6">
        <AdSpendForm channelSuggestions={[]} />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[640px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Campaign</th>
              <th>Cents</th>
              <th>Impr.</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td className="text-dim">{row.dateLabel}</td>
                <td className="capitalize">{row.channelLabel}</td>
                <td className="text-dim">{row.campaignLabel}</td>
                <td className="text-dim">{String(row.spendCents)}</td>
                <td className="text-dim">{String(row.impressions)}</td>
                <td className="text-dim">{String(row.clicks)}</td>
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
