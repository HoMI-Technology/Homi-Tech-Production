import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampaignComposer } from "@/components/admin/CampaignComposer";
import type { Campaign, CampaignSendStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Email | Admin | HōMI",
  description: "Broadcast email campaigns: compose, confirm, send.",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          .in("campaign_id", rows.map((c) => c.id));
        for (const row of (sends as { campaign_id: string; status: CampaignSendStatus }[] | null) ?? []) {
          const bucket = (counts[row.campaign_id] ??= { sent: 0, failed: 0, suppressed: 0 });
          bucket[row.status] = (bucket[row.status] ?? 0) + 1;
        }
      }

      campaigns = rows.map((c) => ({ ...c, send_counts: counts[c.id] ?? { sent: 0, failed: 0, suppressed: 0 } }));
    } catch {
      campaigns = [];
    }
  }

  return (
    <div>
      <p className="eyebrow">Broadcast</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Email campaigns</h1>
      <p className="mt-1 text-sm text-dim">
        Compose a broadcast, confirm the audience, and send. The unsubscribe list is honored on every blast.
      </p>

      {!service && (
        <div className="glass mt-6 p-6">
          <p className="text-sm text-dim">
            Supabase service role is not configured, so campaigns can't be loaded or sent from this environment.
          </p>
        </div>
      )}

      {service && (
        <>
          <div className="glass mt-6 p-6">
            <p className="eyebrow !text-[0.625rem]">New campaign</p>
            <CampaignComposer />
          </div>

          <div className="glass mt-6 overflow-x-auto">
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
                        <span className={`text-xs font-semibold uppercase tracking-wide ${STATUS_STYLE[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="score-numeral">{c.recipient_count.toLocaleString()}</td>
                      <td className="text-xs text-dim">
                        {c.status === "sent" ? (
                          <>
                            {c.send_counts.sent.toLocaleString()} sent
                            {c.send_counts.failed > 0 ? ` · ${c.send_counts.failed.toLocaleString()} failed` : ""}
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
    </div>
  );
}
