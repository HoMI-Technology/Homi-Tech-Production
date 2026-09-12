import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_WAITLIST_CONSOLE_EMPTY,
  buildAdminWaitlistV4View,
  type AdminWaitlistV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Waitlist | Admin | HōMI",
  description: "Waitlist signups and interest areas.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWaitlistPage() {
  const supabase = await createClient();

  let rows: AdminWaitlistV4SourceRow[] = [];
  let loadError = false;
  try {
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, created_at, status, source, interested_in")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      loadError = true;
      rows = [];
    } else {
      rows = (data as AdminWaitlistV4SourceRow[] | null) ?? [];
    }
  } catch {
    loadError = true;
    rows = [];
  }

  const view = buildAdminWaitlistV4View({ rows, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_WAITLIST_CONSOLE_EMPTY} />
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Waitlist"
        description="Signups and interest areas."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Latest 200",
              color: COLORS.amber,
            },
            {
              label: "Tagged",
              value: String(view.taggedCount),
              footer: "With interests",
              color: COLORS.cyan,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[680px]">
          <thead>
            <tr>
              <th>Id</th>
              <th>Status</th>
              <th>Source</th>
              <th>Interests</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td
                  className="max-w-[10rem] truncate font-mono text-xs sm:max-w-none"
                  title={row.id}
                >
                  {row.id}
                </td>
                <td className="text-dim capitalize">{row.statusLabel}</td>
                <td className="text-dim capitalize">{row.sourceLabel}</td>
                <td className="text-dim">{row.interestsLabel}</td>
                <td className="text-dim">{row.createdLabel}</td>
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
