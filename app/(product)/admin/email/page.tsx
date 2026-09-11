import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampaignComposer } from "@/components/admin/CampaignComposer";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import type { Campaign, CampaignSendStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Email | Admin | HōMI",
  description: "Broadcast email campaigns: compose, confirm, send.",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const STATUS_STYLE: Record<Campaign["status"], string> = {
  draft: "text-dim",
  sending: "text-yellow",
  sent: "text-emerald",
};

export default async function AdminEmailPage() {
  const service = createAdminClient();

  let campaigns: (Campaign & { send_counts: Record<CampaignSendStatus, number> })[] = [];
  if (service) {
    try {
      const { data } = await service
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (data as Campaign[] | null) ?? [];

      const counts: Record<string, Record<CampaignSendStatus, number>> = {};
      if (rows.length > 0) {
        const { data: sends } = await service
          .from("campaign_sends")
          .select("campaign_id, status")
          .in(
            "campaign_id",
            rows.map((c) => c.id),
          );
        for (const row of (sends as { campaign_id: string; status: CampaignSendStatus }[] | null) ??
          []) {
          const bucket = (counts[row.campaign_id] ??= { sent: 0, failed: 0, suppressed: 0 });
          bucket[row.status] = (bucket[row.status] ?? 0) + 1;
        }
      }

      campaigns = rows.map((c) => ({
        ...c,
        send_counts: counts[c.id] ?? { sent: 0, failed: 0, suppressed: 0 },
      }));
    } catch {
      campaigns = [];
    }
  }

  const totalSent = campaigns.reduce((acc, c) => acc + (c.send_counts.sent ?? 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.send_counts.failed ?? 0), 0);
  const drafted = campaigns.filter((c) => c.status === "draft").length;

  return (
    <PageFrame role="admin" density="compact">
      {!service ? (
        <AdminRoomEmptyV4 title="Email is not configured." />
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
              label: "Campaigns",
              value: String(campaigns.length),
              footer: "Shown",
              color: COLORS.cyan,
            },
            {
              label: "Drafts",
              value: String(drafted),
              footer: "Not sent",
              color: COLORS.dim,
            },
            {
              label: "Sent",
              value: totalSent.toLocaleString(),
              footer: "Recipients delivered",
              color: COLORS.emerald,
            },
            {
              label: "Failed",
              value: totalFailed.toLocaleString(),
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
        {campaigns.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No campaigns yet.</p>
        ) : (
          <table className="table-premium min-w-[720px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Results</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="max-w-[240px]">
                      <p className="truncate font-medium text-light">{c.name}</p>
                      <p className="truncate text-xs text-dim">{c.subject}</p>
                    </div>
                  </td>
                  <td>
                    <span className="chip !text-xs capitalize">{c.audience}</span>
                  </td>
                  <td>
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${STATUS_STYLE[c.status]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="score-numeral">{c.recipient_count.toLocaleString()}</td>
                  <td className="text-xs text-dim">
                    {c.status === "sent" ? (
                      <>
                        {c.send_counts.sent.toLocaleString()} sent
                        {c.send_counts.failed > 0
                          ? ` · ${c.send_counts.failed.toLocaleString()} failed`
                          : ""}
                        {c.send_counts.suppressed > 0
                          ? ` · ${c.send_counts.suppressed.toLocaleString()} suppressed`
                          : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-dim">{formatDate(c.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}
    </PageFrame>
  );
}
