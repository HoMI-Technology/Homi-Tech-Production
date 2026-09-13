import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampaignComposer } from "@/components/admin/CampaignComposer";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_EMAIL_CONSOLE_EMPTY,
  buildAdminEmailV4View,
  type AdminEmailV4SendRow,
  type AdminEmailV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Email | Admin | HōMI",
  description: "Broadcast email campaigns: compose, confirm, send.",
};

export default async function AdminEmailPage() {
  const service = createAdminClient();

  let rows: AdminEmailV4SourceRow[] = [];
  let sends: AdminEmailV4SendRow[] = [];
  let loadError = !service;

  if (service) {
    try {
      const { data: campaignData, error: campaignError } = await service
        .from("campaigns")
        .select("id, name, audience, status, sent_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (campaignError) {
        loadError = true;
      } else {
        rows = (campaignData as AdminEmailV4SourceRow[] | null) ?? [];
      }

      const campaignIds = rows.map((row) => row.id);
      if (campaignIds.length > 0) {
        const { data: sendData, error: sendError } = await service
          .from("campaign_sends")
          .select("campaign_id, status")
          .in("campaign_id", campaignIds);
        if (sendError) {
          loadError = true;
          sends = [];
        } else {
          sends = (sendData as AdminEmailV4SendRow[] | null) ?? [];
        }
      }
    } catch {
      loadError = true;
      rows = [];
      sends = [];
    }
  }

  const view = buildAdminEmailV4View({ rows, sends, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <>
          <AdminRoomEmptyV4 title={ADMIN_V4_EMAIL_CONSOLE_EMPTY} />
          {service ? (
            <div className="glass mt-6 p-6">
              <div className="dash-section-head">
                <h2>New campaign</h2>
                <p>Compose and confirm before send.</p>
              </div>
              <CampaignComposer />
            </div>
          ) : null}
        </>
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Email campaigns"
        description="Compose a broadcast, confirm the audience, and send. Unsubscribes are honored."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Latest 50",
              color: COLORS.cyan,
            },
            {
              label: "Drafts",
              value: String(view.draftCount),
              footer: "Not sent",
              color: COLORS.dim,
            },
            {
              label: "Sent",
              value: String(view.sentCount),
              footer: "Delivered sends",
              color: COLORS.emerald,
            },
            {
              label: "Failed",
              value: String(view.failedCount),
              footer: "Delivery errors",
              color: COLORS.crimson,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 p-6">
        <div className="dash-section-head">
          <h2>New campaign</h2>
          <p>Compose and confirm before send.</p>
        </div>
        <CampaignComposer />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[720px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Audience</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Failed</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.nameLabel}</td>
                <td className="text-dim capitalize">{row.audienceLabel}</td>
                <td className="text-dim capitalize">{row.statusLabel}</td>
                <td className="text-dim">{String(row.sentCount)}</td>
                <td className="text-dim">{String(row.failedCount)}</td>
                <td className="text-dim">{row.sentLabel}</td>
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
